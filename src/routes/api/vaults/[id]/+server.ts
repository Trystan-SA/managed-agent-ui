import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';
import { requireAdmin } from '$lib/server/auth';

// Retrieve a vault
export const GET: RequestHandler = async ({ params, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const client = await createAnthropicClient();
  const vault = await client.beta.vaults.retrieve(params.id);
  return json(vault);
};

// Rename / update metadata
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const body = await request.json();
  const client = await createAnthropicClient();
  const vault = await client.beta.vaults.update(params.id, body);
  return json(vault);
};

// Delete a vault permanently
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const client = await createAnthropicClient();
  const result = await client.beta.vaults.delete(params.id);
  return json(result);
};
