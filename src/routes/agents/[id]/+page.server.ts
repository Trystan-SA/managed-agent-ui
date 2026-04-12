import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';
import { db } from '$lib/server/db';
import { scheduledTasks, taskExecutions } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  const client = await createAnthropicClient();
  const [agent, versions, agentSchedules] = await Promise.all([
    client.beta.agents.retrieve(params.id),
    (async () => {
      const v = [];
      for await (const ver of client.beta.agents.versions.list(params.id)) {
        v.push(ver);
      }
      return v;
    })(),
    db.select().from(scheduledTasks).where(eq(scheduledTasks.agentId, params.id))
  ]);

  // Load recent executions for each schedule
  const schedulesWithExecutions = await Promise.all(
    agentSchedules.map(async (s) => {
      const executions = await db
        .select()
        .from(taskExecutions)
        .where(eq(taskExecutions.taskId, s.id))
        .orderBy(desc(taskExecutions.startedAt))
        .limit(10);
      return { ...s, executions };
    })
  );

  return {
    agent: JSON.parse(JSON.stringify(agent)),
    versions: JSON.parse(JSON.stringify(versions)),
    schedules: schedulesWithExecutions
  };
};
