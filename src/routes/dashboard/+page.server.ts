import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';
import { db } from '$lib/server/db';
import { apiKeys } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
  // Short-circuit when no global API key is configured — no point hitting
  // Anthropic and the chat UI should block interaction anyway.
  const [key] = await db.select({ id: apiKeys.id }).from(apiKeys).limit(1);
  if (!key) {
    return {
      apiKeyConfigured: false,
      sessions: [],
      agents: [],
      environments: []
    };
  }

  try {
    const client = await createAnthropicClient();

    // Parallel fetch + single-page only. The previous implementation issued
    // three sequential `for await` loops that auto-paginated through every
    // page — which blocked the dashboard while walking the entire history.
    // The sidebar only needs recent sessions; the new-chat form only needs
    // the first batch of agents / environments.
    const [agentsPage, environmentsPage, sessionsPage] = await Promise.all([
      client.beta.agents.list({ limit: 100 }),
      client.beta.environments.list({ limit: 100 }),
      client.beta.sessions.list({ limit: 50 })
    ]);

    return {
      apiKeyConfigured: true,
      sessions: JSON.parse(JSON.stringify(sessionsPage.data)),
      agents: JSON.parse(JSON.stringify(agentsPage.data.filter((a) => !a.archived_at))),
      environments: JSON.parse(JSON.stringify(environmentsPage.data.filter((e) => !e.archived_at)))
    };
  } catch (e: unknown) {
    console.error('[dashboard]', e);
    return {
      apiKeyConfigured: true,
      sessions: [],
      agents: [],
      environments: [],
      error: e instanceof Error ? e.message : String(e)
    };
  }
};
