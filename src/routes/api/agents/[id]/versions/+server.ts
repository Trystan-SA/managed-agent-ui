import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ params, locals: _locals }) => {
  const client = await createAnthropicClient();
  const versions: Record<string, unknown>[] = [];
  for await (const version of client.beta.agents.versions.list(params.id)) {
    versions.push(version);
  }
  return json(versions);
};
