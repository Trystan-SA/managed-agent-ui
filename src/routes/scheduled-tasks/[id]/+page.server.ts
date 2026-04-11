import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { scheduledTasks, taskExecutions, taskEditHistory, users } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  const taskRow = await db
    .select({
      id: scheduledTasks.id,
      name: scheduledTasks.name,
      description: scheduledTasks.description,
      agentId: scheduledTasks.agentId,
      environmentId: scheduledTasks.environmentId,
      promptTemplate: scheduledTasks.promptTemplate,
      cronExpression: scheduledTasks.cronExpression,
      schedulePreset: scheduledTasks.schedulePreset,
      timezone: scheduledTasks.timezone,
      sessionMode: scheduledTasks.sessionMode,
      activeSessionId: scheduledTasks.activeSessionId,
      enabled: scheduledTasks.enabled,
      runCount: scheduledTasks.runCount,
      nextRunAt: scheduledTasks.nextRunAt,
      lastRunAt: scheduledTasks.lastRunAt,
      createdAt: scheduledTasks.createdAt,
      updatedAt: scheduledTasks.updatedAt,
      creatorEmail: users.email
    })
    .from(scheduledTasks)
    .leftJoin(users, eq(scheduledTasks.createdBy, users.id))
    .where(eq(scheduledTasks.id, params.id))
    .limit(1);

  if (taskRow.length === 0) {
    throw error(404, 'Task not found');
  }

  const raw = taskRow[0];
  const task = {
    ...raw,
    nextRunAt: raw.nextRunAt?.toISOString() ?? null,
    lastRunAt: raw.lastRunAt?.toISOString() ?? null,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString()
  };

  const executionRows = await db
    .select({
      id: taskExecutions.id,
      status: taskExecutions.status,
      promptSent: taskExecutions.promptSent,
      response: taskExecutions.response,
      error: taskExecutions.error,
      startedAt: taskExecutions.startedAt,
      completedAt: taskExecutions.completedAt,
      durationMs: taskExecutions.durationMs,
      sessionId: taskExecutions.sessionId
    })
    .from(taskExecutions)
    .where(eq(taskExecutions.taskId, params.id))
    .orderBy(desc(taskExecutions.startedAt))
    .limit(50);

  const executions = executionRows.map((row) => ({
    ...row,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null
  }));

  const editorAlias = db.$with('editor_alias').as(
    db.select({ id: users.id, email: users.email }).from(users)
  );

  const historyRows = await db
    .select({
      id: taskEditHistory.id,
      changes: taskEditHistory.changes,
      createdAt: taskEditHistory.createdAt,
      editorEmail: editorAlias.email
    })
    .from(taskEditHistory)
    .leftJoin(editorAlias, eq(taskEditHistory.editedBy, editorAlias.id))
    .where(eq(taskEditHistory.taskId, params.id))
    .orderBy(desc(taskEditHistory.createdAt));

  const editHistory = historyRows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString()
  }));

  return { task, executions, editHistory };
};
