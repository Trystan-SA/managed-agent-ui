import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ params }) => {
  const client = await createAnthropicClient();
  const agent = await client.beta.agents.retrieve(params.id);
  return { agent: JSON.parse(JSON.stringify(agent)) };
};
