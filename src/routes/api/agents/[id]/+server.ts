import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient();
  const agent = await client.beta.agents.retrieve(params.id);
  return json(agent);
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const body = await request.json();
  const client = await createAnthropicClient();
  const agent = await client.beta.agents.update(params.id, body);
  return json(agent);
};
