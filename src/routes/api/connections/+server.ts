import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';
import { getOrCreateUserVault } from '$lib/server/user-vault';
import { MCP_SERVICES, getMcpService } from '$lib/mcp-registry';

function requireUser(locals: App.Locals) {
  if (!locals.userId) return json({ error: 'Authentication required' }, { status: 401 });
  return null;
}

/**
 * List the user's connections. Returns:
 *   - `services`: every registry entry, with its connection status
 *   - `custom`:   credentials whose mcp_server_url isn't in the registry
 */
export const GET: RequestHandler = async ({ locals }) => {
  const denied = requireUser(locals);
  if (denied) return denied;

  const userId = locals.userId!;
  const vaultId = await getOrCreateUserVault(userId);

  const client = await createAnthropicClient();
  const credentials = [];
  for await (const c of client.beta.vaults.credentials.list(vaultId)) credentials.push(c);

  const registryUrls = new Set(MCP_SERVICES.map((s) => s.mcpServerUrl));
  const byUrl = new Map<string, (typeof credentials)[number]>();
  for (const c of credentials) {
    const url = c.auth?.mcp_server_url;
    if (url) byUrl.set(url, c);
  }

  return json({
    vaultId,
    services: MCP_SERVICES.map((svc) => {
      const cred = byUrl.get(svc.mcpServerUrl);
      return {
        service: svc,
        connected: !!cred,
        credentialId: cred?.id ?? null,
        connectedAt: cred?.created_at ?? null
      };
    }),
    custom: credentials
      .filter((c) => c.auth?.mcp_server_url && !registryUrls.has(c.auth.mcp_server_url))
      .map((c) => ({
        credentialId: c.id,
        // display_name is optional — fall back to the URL host so something
        // useful always renders.
        displayName: c.display_name ?? new URL(c.auth.mcp_server_url!).host,
        mcpServerUrl: c.auth.mcp_server_url!,
        authType: c.auth.type,
        connectedAt: c.created_at
      }))
  });
};

/**
 * Connect a service. Two shapes are accepted:
 *   - `{ serviceId, token }`                          → registry entry
 *   - `{ mcpServerUrl, displayName?, token }`         → custom MCP server
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  const denied = requireUser(locals);
  if (denied) return denied;

  const body = await request.json();
  const { serviceId, mcpServerUrl, displayName, token } = body as {
    serviceId?: string;
    mcpServerUrl?: string;
    displayName?: string;
    token?: string;
  };

  if (!token) return json({ error: 'token is required' }, { status: 400 });

  // Resolve target URL + display name from either branch
  let targetUrl: string;
  let label: string | undefined;

  if (serviceId) {
    const svc = getMcpService(serviceId);
    if (!svc) return json({ error: `Unknown service: ${serviceId}` }, { status: 400 });
    if (svc.authType !== 'static_bearer') {
      return json({ error: `${svc.displayName} requires OAuth (not yet supported)` }, { status: 400 });
    }
    targetUrl = svc.mcpServerUrl;
    label = svc.displayName;
  } else if (mcpServerUrl) {
    // Validate URL shape — keeps obviously bad input out of the SDK.
    try {
      new URL(mcpServerUrl);
    } catch {
      return json({ error: 'mcpServerUrl must be a valid URL' }, { status: 400 });
    }
    targetUrl = mcpServerUrl.trim();
    label = displayName?.trim() || undefined;
  } else {
    return json({ error: 'serviceId or mcpServerUrl is required' }, { status: 400 });
  }

  const userId = locals.userId!;
  const vaultId = await getOrCreateUserVault(userId);
  const client = await createAnthropicClient();

  const credential = await client.beta.vaults.credentials.create(vaultId, {
    display_name: label,
    auth: {
      type: 'static_bearer',
      token: token.trim(),
      mcp_server_url: targetUrl
    }
  });

  return json({ credentialId: credential.id }, { status: 201 });
};

/**
 * Rotate an existing credential's token without losing the binding. Body:
 * { credentialId: string, token: string }
 */
export const PATCH: RequestHandler = async ({ request, locals }) => {
  const denied = requireUser(locals);
  if (denied) return denied;

  const { credentialId, token } = await request.json();
  if (!credentialId || !token) {
    return json({ error: 'credentialId and token are required' }, { status: 400 });
  }

  const userId = locals.userId!;
  const vaultId = await getOrCreateUserVault(userId);
  const client = await createAnthropicClient();

  const updated = await client.beta.vaults.credentials.update(credentialId, {
    vault_id: vaultId,
    auth: { type: 'static_bearer', token: token.trim() }
  });

  return json({ credentialId: updated.id });
};

/**
 * Delete a credential. Query: ?credentialId=...
 */
export const DELETE: RequestHandler = async ({ url, locals }) => {
  const denied = requireUser(locals);
  if (denied) return denied;

  const credentialId = url.searchParams.get('credentialId');
  if (!credentialId) return json({ error: 'credentialId is required' }, { status: 400 });

  const userId = locals.userId!;
  const vaultId = await getOrCreateUserVault(userId);
  const client = await createAnthropicClient();

  await client.beta.vaults.credentials.delete(credentialId, { vault_id: vaultId });
  return json({ success: true });
};
