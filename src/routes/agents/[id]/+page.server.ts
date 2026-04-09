import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const [agent, versions] = await Promise.all([
    client.beta.agents.retrieve(params.id),
    (async () => {
      const v: any[] = [];
      for await (const ver of client.beta.agents.versions.list(params.id)) {
        v.push(ver);
      }
      return v;
    })()
  ]);
  return { agent, versions };
};
