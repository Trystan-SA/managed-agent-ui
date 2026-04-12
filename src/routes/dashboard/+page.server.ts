import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async () => {
  try {
    const client = await createAnthropicClient();

    const agents = [];
    const environments = [];
    const sessions = [];

    for await (const a of client.beta.agents.list()) agents.push(a);
    for await (const e of client.beta.environments.list()) environments.push(e);
    for await (const s of client.beta.sessions.list()) sessions.push(s);

    return {
      sessions: JSON.parse(JSON.stringify(sessions)),
      agents: JSON.parse(JSON.stringify(agents.filter((a: Record<string, unknown>) => !a.archived_at))),
      environments: JSON.parse(JSON.stringify(environments.filter((e: Record<string, unknown>) => !e.archived_at)))
    };
  } catch (e: unknown) {
    console.error('[dashboard]', e);
    return {
      sessions: [],
      agents: [],
      environments: [],
      error: e instanceof Error ? e.message : String(e)
    };
  }
};
