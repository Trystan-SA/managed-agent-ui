import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async () => {
  const client = await createAnthropicClient();
  const agents: Record<string, unknown>[] = [];
  for await (const agent of client.beta.agents.list()) {
    agents.push(agent);
  }
  return json(agents);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const client = await createAnthropicClient();
  const agent = await client.beta.agents.create(body);
  return json(agent, { status: 201 });
};
