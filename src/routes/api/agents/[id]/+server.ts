import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const agent = await client.beta.agents.retrieve(params.id);
  return json(agent);
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const body = await request.json();
  const agent = await client.beta.agents.update(params.id, body);
  return json(agent);
};
