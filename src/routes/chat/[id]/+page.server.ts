import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ params }) => {
  const client = await createAnthropicClient();
  const session = await client.beta.sessions.retrieve(params.id);
  return { session: JSON.parse(JSON.stringify(session)) };
};
