import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';
import { requireAdmin } from '$lib/server/auth';

// List all vaults (admin only)
export const GET: RequestHandler = async ({ locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const client = await createAnthropicClient();
  const vaults = [];
  for await (const v of client.beta.vaults.list()) vaults.push(v);
  return json(vaults);
};

// Create a new vault (admin only)
export const POST: RequestHandler = async ({ request, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const { display_name, metadata } = await request.json();
  if (!display_name || typeof display_name !== 'string') {
    return json({ error: 'display_name is required' }, { status: 400 });
  }

  const client = await createAnthropicClient();
  const vault = await client.beta.vaults.create({ display_name, metadata });
  return json(vault, { status: 201 });
};
