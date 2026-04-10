import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async () => {
  try {
    const client = await createAnthropicClient();
    const agents: Record<string, unknown>[] = [];
    for await (const agent of client.beta.agents.list()) {
      agents.push(JSON.parse(JSON.stringify(agent)));
    }
    return { agents };
  } catch (e) {
    console.error('[agents/list]', e);
    return { agents: [] };
  }
};
