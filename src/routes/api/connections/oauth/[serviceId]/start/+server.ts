import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMcpService } from '$lib/mcp-registry';
import {
  buildAuthorizationUrl,
  createOAuthState,
  getOAuthClient,
  resolveCallbackUrl
} from '$lib/server/oauth';

/**
 * Begin an OAuth authorization flow. Looks up the service in the registry,
 * verifies the admin has configured client credentials, mints a CSRF state
 * token, and 302s the user to the provider's consent page.
 */
export const GET: RequestHandler = async ({ params, locals, url }) => {
  if (!locals.userId) throw error(401, 'Authentication required');

  const svc = getMcpService(params.serviceId!);
  if (!svc || svc.authType !== 'oauth' || !svc.oauthConfig) {
    throw error(404, `OAuth not available for service: ${params.serviceId}`);
  }

  const client = await getOAuthClient(svc.id);
  if (!client) {
    // Friendlier than a 409 page: bounce back to /connections with a status.
    throw redirect(
      302,
      `/connections?status=error&message=${encodeURIComponent(
        `OAuth for ${svc.displayName} hasn't been configured. Ask an admin to add credentials in Settings.`
      )}`
    );
  }

  const state = await createOAuthState(locals.userId, svc.id);
  const redirectUri = resolveCallbackUrl(svc.id, url);
  const authUrl = buildAuthorizationUrl(svc.oauthConfig, client, redirectUri, state);

  // 302 — the user lands on the provider's consent screen.
  throw redirect(302, authUrl);
};
