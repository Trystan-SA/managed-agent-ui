import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { oauthProviderConfigs } from '$lib/server/db/schema';
import { requireAdmin } from '$lib/server/auth';
import { setOAuthClient, deleteOAuthClient } from '$lib/server/oauth';
import { MCP_SERVICES, getMcpService } from '$lib/mcp-registry';

/**
 * List all OAuth-capable services with their configuration status. Secrets
 * are never returned — only "configured" / "not configured".
 */
export const GET: RequestHandler = async ({ locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const rows = await db
    .select({ serviceId: oauthProviderConfigs.serviceId, updatedAt: oauthProviderConfigs.updatedAt })
    .from(oauthProviderConfigs);
  const configured = new Map(rows.map((r) => [r.serviceId, r.updatedAt]));

  return json(
    MCP_SERVICES.filter((s) => s.authType === 'oauth').map((svc) => ({
      service: svc,
      configured: configured.has(svc.id),
      updatedAt: configured.get(svc.id) ?? null
    }))
  );
};

/**
 * Upsert OAuth client credentials for a service.
 * Body: { serviceId, clientId, clientSecret, scopes? }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const { serviceId, clientId, clientSecret, scopes } = await request.json();
  if (!serviceId || !clientId || !clientSecret) {
    return json({ error: 'serviceId, clientId, and clientSecret are required' }, { status: 400 });
  }

  const svc = getMcpService(serviceId);
  if (!svc || svc.authType !== 'oauth') {
    return json({ error: `Service ${serviceId} doesn't support OAuth` }, { status: 400 });
  }

  await setOAuthClient(serviceId, clientId.trim(), clientSecret.trim(), scopes?.trim() || null, locals.userId!);
  return json({ success: true });
};

/**
 * Remove OAuth client credentials for a service. Existing per-user credentials
 * keep working until their refresh tokens expire (Anthropic still has them).
 * Query: ?serviceId=...
 */
export const DELETE: RequestHandler = async ({ url, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const serviceId = url.searchParams.get('serviceId');
  if (!serviceId) return json({ error: 'serviceId is required' }, { status: 400 });

  await deleteOAuthClient(serviceId);
  return json({ success: true });
};
