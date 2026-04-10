import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ params, locals: _locals }) => {
  const client = await createAnthropicClient();
  const env = await client.beta.environments.retrieve(params.id);
  return json(env);
};

export const PUT: RequestHandler = async ({ params, request, locals: _locals }) => {
  const body = await request.json();
  const client = await createAnthropicClient();
  const env = await client.beta.environments.update(params.id, body);
  return json(env);
};
