import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ params }) => {
  const client = await createAnthropicClient();
  const [agent, versions] = await Promise.all([
    client.beta.agents.retrieve(params.id),
    (async () => {
      const v: Record<string, unknown>[] = [];
      for await (const ver of client.beta.agents.versions.list(params.id)) {
        v.push(ver);
      }
      return v;
    })()
  ]);
  return {
    agent: JSON.parse(JSON.stringify(agent)),
    versions: JSON.parse(JSON.stringify(versions))
  };
};
