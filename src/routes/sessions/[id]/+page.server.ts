import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const session = await client.beta.sessions.retrieve(params.id);
  // Note: events.list may not exist in SDK - fetch events if available
  let events: any[] = [];
  try {
    for await (const event of client.beta.sessions.events.list(params.id)) {
      events.push(event);
    }
  } catch {
    // events listing may not be available
  }
  return { session, events };
};
