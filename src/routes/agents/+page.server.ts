import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const result = await client.beta.agents.list();
  return { agents: result.data ?? [] };
};
