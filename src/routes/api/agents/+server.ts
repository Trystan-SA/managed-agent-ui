import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const agents = await client.beta.agents.list();
  return json(agents);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const body = await request.json();
  const agent = await client.beta.agents.create(body);
  return json(agent, { status: 201 });
};
