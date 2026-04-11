import { db } from './db';
import { scheduledTasks, taskExecutions } from './db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { createAnthropicClient } from './anthropic';
import { renderTemplate } from './template';
import type { BetaManagedAgentsStreamSessionEvents } from '@anthropic-ai/sdk/resources/beta/sessions/events.js';

export async function executeTask(taskId: string): Promise<void> {
  // Acquire lock
  const lockResult = await db
    .update(scheduledTasks)
    .set({ lockedAt: new Date() })
    .where(and(eq(scheduledTasks.id, taskId), isNull(scheduledTasks.lockedAt)))
    .returning({ id: scheduledTasks.id });

  if (lockResult.length === 0) {
    console.log(`[scheduler] Task ${taskId} already locked, skipping`);
    return;
  }

  const startedAt = new Date();
  let executionId: string | undefined;

  try {
    // Load task
    const [task] = await db
      .select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.id, taskId))
      .limit(1);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Render prompt
    const prompt = renderTemplate(task.promptTemplate, {
      timezone: task.timezone,
      runNumber: task.runCount + 1,
      taskName: task.name
    });

    // Insert execution record
    const [execution] = await db
      .insert(taskExecutions)
      .values({
        taskId: task.id,
        status: 'running',
        promptSent: prompt,
        startedAt
      })
      .returning({ id: taskExecutions.id });

    executionId = execution.id;

    // Create or resume session
    const client = await createAnthropicClient();
    let sessionId: string;

    if (task.sessionMode === 'continue_session' && task.activeSessionId) {
      try {
        const existing = await client.beta.sessions.retrieve(task.activeSessionId);
        if (existing.status === 'terminated') {
          const session = await client.beta.sessions.create({
            agent: task.agentId,
            environment_id: task.environmentId
          });
          sessionId = session.id;
        } else {
          sessionId = task.activeSessionId;
        }
      } catch {
        const session = await client.beta.sessions.create({
          agent: task.agentId,
          environment_id: task.environmentId
        });
        sessionId = session.id;
      }
    } else {
      const session = await client.beta.sessions.create({
        agent: task.agentId,
        environment_id: task.environmentId
      });
      sessionId = session.id;
    }

    // Update execution with session ID
    await db
      .update(taskExecutions)
      .set({ sessionId })
      .where(eq(taskExecutions.id, executionId));

    // Send message
    await client.beta.sessions.events.send(sessionId, {
      events: [
        {
          type: 'user.message',
          content: [{ type: 'text', text: prompt }]
        }
      ]
    });

    // Wait for response by streaming events until idle/terminated
    let responseText = '';
    const stream = await client.beta.sessions.events.stream(sessionId);
    for await (const event of stream) {
      const e = event as BetaManagedAgentsStreamSessionEvents;
      if (e.type === 'agent.message') {
        for (const block of e.content) {
          responseText += block.text;
        }
      }
      if (e.type === 'session.status_idle' || e.type === 'session.status_terminated') {
        break;
      }
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    // Update execution as completed
    await db
      .update(taskExecutions)
      .set({
        status: 'completed',
        response: responseText,
        sessionId,
        completedAt,
        durationMs
      })
      .where(eq(taskExecutions.id, executionId));

    // Update task metadata
    await db
      .update(scheduledTasks)
      .set({
        lastRunAt: startedAt,
        runCount: task.runCount + 1,
        activeSessionId: task.sessionMode === 'continue_session' ? sessionId : null,
        lockedAt: null,
        updatedAt: new Date()
      })
      .where(eq(scheduledTasks.id, taskId));

    console.log(`[scheduler] Task "${task.name}" completed in ${durationMs}ms`);
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error(`[scheduler] Task ${taskId} failed:`, errorMsg);

    if (executionId) {
      const completedAt = new Date();
      await db
        .update(taskExecutions)
        .set({
          status: 'failed',
          error: errorMsg,
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime()
        })
        .where(eq(taskExecutions.id, executionId));
    }

    // Release lock
    await db
      .update(scheduledTasks)
      .set({ lockedAt: null, updatedAt: new Date() })
      .where(eq(scheduledTasks.id, taskId));
  }
}
