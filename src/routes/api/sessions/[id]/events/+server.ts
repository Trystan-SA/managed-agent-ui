import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ params, locals: _locals }) => {
  const client = await createAnthropicClient();
  const events = [];
  for await (const ev of client.beta.sessions.events.list(params.id, { order: 'asc' })) {
    events.push(ev);
  }
  return json({ events });
};

export const POST: RequestHandler = async ({ params, request, locals: _locals }) => {
  const body = await request.json();
  const client = await createAnthropicClient();
  const result = await client.beta.sessions.events.send(params.id, body);
  return json(result);
};
