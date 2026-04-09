import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const environments = await client.beta.environments.list();
  return json(environments);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const body = await request.json();
  const environment = await client.beta.environments.create(body);
  return json(environment, { status: 201 });
};
