import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const env = await client.beta.environments.retrieve(params.id);
  return json(env);
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const body = await request.json();
  const env = await client.beta.environments.update(params.id, body);
  return json(env);
};
