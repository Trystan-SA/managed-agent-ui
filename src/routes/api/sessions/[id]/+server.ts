import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ params, locals: _locals }) => {
  const client = await createAnthropicClient();
  const session = await client.beta.sessions.retrieve(params.id);
  return json(session);
};
