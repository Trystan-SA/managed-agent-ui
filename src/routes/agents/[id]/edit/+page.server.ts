import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';
import { db } from '$lib/server/db';
import { scheduledTasks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  const client = await createAnthropicClient();
  const [agent, agentSchedules] = await Promise.all([
    client.beta.agents.retrieve(params.id),
    db.select().from(scheduledTasks).where(eq(scheduledTasks.agentId, params.id))
  ]);
  return {
    agent: JSON.parse(JSON.stringify(agent)),
    schedules: agentSchedules
  };
};
