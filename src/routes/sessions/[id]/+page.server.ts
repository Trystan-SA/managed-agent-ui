import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ params }) => {
  const client = await createAnthropicClient();
  const session = await client.beta.sessions.retrieve(params.id);
  const events = [];
  try {
    for await (const event of client.beta.sessions.events.list(params.id)) {
      events.push(event);
    }
  } catch {
    // events listing may not be available
  }
  return {
    session: JSON.parse(JSON.stringify(session)),
    events: JSON.parse(JSON.stringify(events))
  };
};
