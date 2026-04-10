import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async () => {
  try {
    const client = await createAnthropicClient();
    const sessions = [];
    for await (const s of client.beta.sessions.list()) {
      sessions.push(JSON.parse(JSON.stringify(s)));
    }
    return { sessions };
  } catch (e) {
    console.error('[sessions/list]', e);
    return { sessions: [] };
  }
};
