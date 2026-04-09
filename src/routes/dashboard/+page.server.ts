import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ locals }) => {
  try {
    const client = await createAnthropicClient(locals.userId!);

    const [agentsRes, environmentsRes] = await Promise.all([
      client.beta.agents.list(),
      client.beta.environments.list()
    ]);

    const agents = agentsRes.data ?? [];
    const environments = environmentsRes.data ?? [];

    const sessions: any[] = [];
    for await (const s of client.beta.sessions.list()) {
      sessions.push(s);
    }

    return {
      agentCount: agents.length,
      environmentCount: environments.length,
      sessionCount: sessions.length,
      activeSessions: sessions.filter((s: any) => s.status === 'running').length,
      recentSessions: sessions.slice(0, 5)
    };
  } catch (e: any) {
    return {
      agentCount: 0,
      environmentCount: 0,
      sessionCount: 0,
      activeSessions: 0,
      recentSessions: [],
      error: e.message
    };
  }
};
