import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';
import { db } from '$lib/server/db';
import { scheduledTasks, taskExecutions } from '$lib/server/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  const client = await createAnthropicClient();
  const [agent, agentSchedules] = await Promise.all([
    client.beta.agents.retrieve(params.id),
    db.select().from(scheduledTasks).where(eq(scheduledTasks.agentId, params.id))
  ]);

  // Batch-load recent executions for all schedules in one query
  const taskIds = agentSchedules.map(s => s.id);
  const allExecutions = taskIds.length > 0
    ? await db
        .select()
        .from(taskExecutions)
        .where(inArray(taskExecutions.taskId, taskIds))
        .orderBy(desc(taskExecutions.startedAt))
    : [];

  // Group executions by taskId and limit to 10 per task
  const executionsByTask = new Map<string, typeof allExecutions>();
  for (const exec of allExecutions) {
    const group = executionsByTask.get(exec.taskId) ?? [];
    if (group.length < 10) {
      group.push(exec);
      executionsByTask.set(exec.taskId, group);
    }
  }

  const schedulesWithExecutions = agentSchedules.map(s => ({
    ...s,
    executions: executionsByTask.get(s.id) ?? []
  }));

  return {
    agent: JSON.parse(JSON.stringify(agent)),
    schedules: schedulesWithExecutions
  };
};
