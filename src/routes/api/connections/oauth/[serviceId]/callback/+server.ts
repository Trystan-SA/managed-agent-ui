import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';
import { getOrCreateUserVault } from '$lib/server/user-vault';
import { getMcpService } from '$lib/mcp-registry';
import {
  consumeOAuthState,
  exchangeCodeForTokens,
  getOAuthClient,
  resolveCallbackUrl
} from '$lib/server/oauth';

/**
 * OAuth callback. Validates the state, exchanges the code for tokens, and
 * stores them in the user's vault as a credential with a refresh block — so
 * Anthropic auto-refreshes the access token for the lifetime of the refresh
 * token (months to years on most providers).
 *
 * Redirects to /connections with a status query param so the UI can show a
 * success/error toast.
 */
export const GET: RequestHandler = async ({ params, url }) => {
  const svc = getMcpService(params.serviceId!);
  if (!svc || svc.authType !== 'oauth' || !svc.oauthConfig) {
    throw error(404, `OAuth not available for service: ${params.serviceId}`);
  }

  // The provider may signal an error (e.g. user denied consent) instead of
  // sending a code. Surface it via redirect.
  const providerError = url.searchParams.get('error');
  if (providerError) {
    const desc = url.searchParams.get('error_description') ?? providerError;
    throw redirect(302, `/connections?status=error&message=${encodeURIComponent(desc)}`);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    throw redirect(302, '/connections?status=error&message=Missing+code+or+state');
  }

  // Validate + consume the state (single-use; throws if invalid/expired/mismatched).
  let bound: { userId: string; serviceId: string };
  try {
    bound = await consumeOAuthState(state);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid OAuth state';
    throw redirect(302, `/connections?status=error&message=${encodeURIComponent(msg)}`);
  }
  if (bound.serviceId !== svc.id) {
    throw redirect(302, '/connections?status=error&message=Service+mismatch');
  }

  const client = await getOAuthClient(svc.id);
  if (!client) {
    throw redirect(302, '/connections?status=error&message=OAuth+client+no+longer+configured');
  }

  // Use the same redirect URI as the start endpoint — providers verify it matches.
  const redirectUri = resolveCallbackUrl(svc.id, url);

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(svc.oauthConfig, client, code, redirectUri);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Token exchange failed';
    throw redirect(302, `/connections?status=error&message=${encodeURIComponent(msg)}`);
  }

  // Persist the credential in the user's vault. The refresh block is what
  // makes this connection long-lived — Anthropic uses it to mint new access
  // tokens automatically without bothering the user again.
  const vaultId = await getOrCreateUserVault(bound.userId);
  const anthropic = await createAnthropicClient();

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : undefined;

  const refresh = tokens.refresh_token
    ? {
        token_endpoint: svc.oauthConfig.tokenEndpoint,
        client_id: client.clientId,
        refresh_token: tokens.refresh_token,
        scope: client.scopes ?? svc.oauthConfig.defaultScopes,
        token_endpoint_auth:
          svc.oauthConfig.tokenEndpointAuthType === 'client_secret_basic'
            ? { type: 'client_secret_basic' as const, client_secret: client.clientSecret }
            : svc.oauthConfig.tokenEndpointAuthType === 'client_secret_post'
              ? { type: 'client_secret_post' as const, client_secret: client.clientSecret }
              : { type: 'none' as const }
      }
    : undefined;

  try {
    await anthropic.beta.vaults.credentials.create(vaultId, {
      display_name: svc.displayName,
      auth: {
        type: 'mcp_oauth',
        mcp_server_url: svc.mcpServerUrl,
        access_token: tokens.access_token,
        ...(expiresAt ? { expires_at: expiresAt } : {}),
        ...(refresh ? { refresh } : {})
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to store credential';
    throw redirect(302, `/connections?status=error&message=${encodeURIComponent(msg)}`);
  }

  throw redirect(302, `/connections?status=connected&service=${encodeURIComponent(svc.id)}`);
};
