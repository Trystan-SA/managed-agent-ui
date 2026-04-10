import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ locals: _locals }) => {
  const client = await createAnthropicClient();
  const sessions: Record<string, unknown>[] = [];
  for await (const session of client.beta.sessions.list()) {
    sessions.push(session);
  }
  return json(sessions);
};

export const POST: RequestHandler = async ({ request, locals: _locals }) => {
  const body = await request.json();
  const client = await createAnthropicClient();
  const session = await client.beta.sessions.create(body);
  return json(session, { status: 201 });
};
