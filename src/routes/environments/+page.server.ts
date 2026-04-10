import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async () => {
  try {
    const client = await createAnthropicClient();
    const environments: any[] = [];
    for await (const env of client.beta.environments.list()) {
      environments.push(JSON.parse(JSON.stringify(env)));
    }
    return { environments };
  } catch (e) {
    console.error('[environments/list]', e);
    return { environments: [] };
  }
};
