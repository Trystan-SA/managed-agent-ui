import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';
import { requireAdmin } from '$lib/server/auth';

// List credentials in a vault
export const GET: RequestHandler = async ({ params, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const client = await createAnthropicClient();
  const credentials = [];
  for await (const c of client.beta.vaults.credentials.list(params.id)) credentials.push(c);
  return json(credentials);
};

/**
 * Create a credential. Currently supports static_bearer (the simplest path —
 * a long-lived bearer token tied to a specific MCP server URL). MCPOAuth flows
 * require a multi-step UX (start auth → callback → store) and are deferred.
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const { token, mcp_server_url } = await request.json();
  if (!token || !mcp_server_url) {
    return json({ error: 'token and mcp_server_url are required' }, { status: 400 });
  }

  const client = await createAnthropicClient();
  const credential = await client.beta.vaults.credentials.create(params.id, {
    auth: { type: 'static_bearer', token, mcp_server_url }
  });
  return json(credential, { status: 201 });
};
