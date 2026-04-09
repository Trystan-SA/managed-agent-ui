import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const POST: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const result = await client.beta.sessions.archive(params.id);
  return json(result);
};
