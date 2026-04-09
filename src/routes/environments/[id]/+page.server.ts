import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const env = await client.beta.environments.retrieve(params.id);
  return { environment: env };
};
