import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  await client.beta.sessions.delete(params.id);
  return json({ success: true });
};
