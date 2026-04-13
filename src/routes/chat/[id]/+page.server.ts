import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';
import { eventsToMessages, type ContentBlock } from '$lib/utils/chatEvents';

export const load: PageServerLoad = async ({ params }) => {
  const client = await createAnthropicClient();

  const [session, events] = await Promise.all([
    client.beta.sessions.retrieve(params.id),
    (async () => {
      const collected: ContentBlock[] = [];
      for await (const ev of client.beta.sessions.events.list(params.id, { order: 'asc' })) {
        collected.push(ev as unknown as ContentBlock);
      }
      return collected;
    })()
  ]);

  const messages = eventsToMessages(events);

  return {
    session: JSON.parse(JSON.stringify(session)),
    messages: JSON.parse(JSON.stringify(messages))
  };
};
