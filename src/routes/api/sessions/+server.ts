import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const sessions: any[] = [];
  for await (const session of client.beta.sessions.list()) {
    sessions.push(session);
  }
  return json(sessions);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const body = await request.json();
  const session = await client.beta.sessions.create(body);
  return json(session, { status: 201 });
};
