import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';
import { db } from '$lib/server/db';
import { apiKeys } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
  const [key] = await db.select({ id: apiKeys.id }).from(apiKeys).limit(1);
  if (!key) return { environments: [] };

  try {
    const client = await createAnthropicClient();
    const environments = [];
    for await (const e of client.beta.environments.list()) environments.push(e);
    return {
      environments: JSON.parse(JSON.stringify(environments.filter(e => !e.archived_at)))
    };
  } catch (e: unknown) {
    console.error('[agents/new] failed to load environments', e);
    return { environments: [] };
  }
};
