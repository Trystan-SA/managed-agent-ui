import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async () => {
  try {
    const client = await createAnthropicClient();

    const agents = [];
    const environments = [];
    const sessions = [];
    let activeSessions = 0;

    for await (const a of client.beta.agents.list()) agents.push(a);
    for await (const e of client.beta.environments.list()) environments.push(e);
    for await (const s of client.beta.sessions.list()) {
      sessions.push(s);
      if (s.status === 'running') activeSessions++;
    }

    return {
      agentCount: agents.length,
      environmentCount: environments.length,
      sessionCount: sessions.length,
      activeSessions,
      recentSessions: JSON.parse(JSON.stringify(sessions.slice(0, 5)))
    };
  } catch (e: unknown) {
    console.error('[dashboard]', e);
    return {
      agentCount: 0,
      environmentCount: 0,
      sessionCount: 0,
      activeSessions: 0,
      recentSessions: [],
      error: e instanceof Error ? e.message : String(e)
    };
  }
};
