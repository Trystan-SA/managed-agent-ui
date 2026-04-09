import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const sessions: any[] = [];
  for await (const s of client.beta.sessions.list()) {
    sessions.push(s);
  }
  return { sessions };
};
