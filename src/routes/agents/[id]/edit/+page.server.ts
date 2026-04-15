import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';
import { db } from '$lib/server/db';
import { scheduledTasks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  const client = await createAnthropicClient();
  const [agent, versions, agentSchedules, environments] = await Promise.all([
    client.beta.agents.retrieve(params.id),
    (async () => {
      const v = [];
      for await (const ver of client.beta.agents.versions.list(params.id)) {
        v.push(ver);
      }
      return v;
    })(),
    db.select().from(scheduledTasks).where(eq(scheduledTasks.agentId, params.id)),
    (async () => {
      const envs = [];
      for await (const e of client.beta.environments.list()) envs.push(e);
      return envs;
    })()
  ]);
  return {
    agent: JSON.parse(JSON.stringify(agent)),
    versions: JSON.parse(JSON.stringify(versions)),
    schedules: agentSchedules,
    environments: JSON.parse(JSON.stringify(environments.filter(e => !e.archived_at)))
  };
};
