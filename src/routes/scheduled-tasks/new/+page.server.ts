import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async () => {
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

    return { agents, environments };
  } catch (e: unknown) {
    console.error('[scheduled-tasks/new]', e);
    return { agents: [], environments: [] };
  }
};
