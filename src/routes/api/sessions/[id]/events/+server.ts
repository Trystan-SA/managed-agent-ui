import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const body = await request.json();
  const client = await createAnthropicClient();
  const result = await client.beta.sessions.events.send(params.id, body);
  return json(result);
};
