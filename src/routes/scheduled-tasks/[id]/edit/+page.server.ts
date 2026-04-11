import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { scheduledTasks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ params }) => {
  const [row] = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.id, params.id))
    .limit(1);

  if (!row) {
    throw error(404, 'Task not found');
  }

  const task = {
    ...row,
    nextRunAt: row.nextRunAt?.toISOString() ?? null,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    lockedAt: row.lockedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };

  try {
    const client = await createAnthropicClient();

    const agents: Record<string, unknown>[] = [];
    for await (const agent of client.beta.agents.list()) {
      agents.push(JSON.parse(JSON.stringify(agent)));
    }

    const environments: Record<string, unknown>[] = [];
    for await (const env of client.beta.environments.list()) {
      environments.push(JSON.parse(JSON.stringify(env)));
    }

    return { task, agents, environments };
  } catch (e: unknown) {
    console.error('[scheduled-tasks/edit]', e);
    return { task, agents: [], environments: [] };
  }
};
