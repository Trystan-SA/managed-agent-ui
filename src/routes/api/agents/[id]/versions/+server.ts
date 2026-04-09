import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const versions: any[] = [];
  for await (const version of client.beta.agents.versions.list(params.id)) {
    versions.push(version);
  }
  return json(versions);
};
