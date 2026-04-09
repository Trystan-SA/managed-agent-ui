import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const session = await client.beta.sessions.retrieve(params.sessionId);
  return { session };
};
