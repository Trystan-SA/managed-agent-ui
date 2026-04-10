import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ params }) => {
  const client = await createAnthropicClient();
  const env = await client.beta.environments.retrieve(params.id);
  return { environment: JSON.parse(JSON.stringify(env)) };
};
