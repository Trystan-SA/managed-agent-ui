import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async () => {
  const client = await createAnthropicClient();
  const environments: Record<string, unknown>[] = [];
  for await (const env of client.beta.environments.list()) {
    environments.push(env);
  }
  return json(environments);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const client = await createAnthropicClient();
  const environment = await client.beta.environments.create(body);
  return json(environment, { status: 201 });
};
