import { randomBytes } from 'node:crypto';
import { eq, lt } from 'drizzle-orm';
import { db } from './db';
import { oauthProviderConfigs, oauthStates } from './db/schema';
import { decrypt, encrypt } from './crypto';
import type { McpOAuthConfig } from '$lib/mcp-registry';

const STATE_TTL_SECONDS = 600; // 10 minutes — long enough for slow OAuth flows, short enough to keep the table tiny.

/**
 * Decrypted client credentials for a registered OAuth provider. Created once
 * per service via the admin Settings UI.
 */
export interface DecryptedOAuthClient {
  serviceId: string;
  clientId: string;
  clientSecret: string;
  scopes: string | null;
}

/**
 * Look up + decrypt the admin-configured OAuth client config for a service.
 * Returns null when the admin hasn't configured it yet (so callers can render
 * a graceful "OAuth not configured" state instead of erroring).
 */
export async function getOAuthClient(serviceId: string): Promise<DecryptedOAuthClient | null> {
  const [row] = await db
    .select()
    .from(oauthProviderConfigs)
    .where(eq(oauthProviderConfigs.serviceId, serviceId))
    .limit(1);
  if (!row) return null;

  return {
    serviceId: row.serviceId,
    clientId: decrypt(row.encryptedClientId, row.clientIdIv),
    clientSecret: decrypt(row.encryptedClientSecret, row.clientSecretIv),
    scopes: row.scopes
  };
}

/**
 * Upsert OAuth client credentials for a service. Used by the admin Settings UI.
 */
export async function setOAuthClient(
  serviceId: string,
  clientId: string,
  clientSecret: string,
  scopes: string | null,
  updatedBy: string
): Promise<void> {
  const idEnc = encrypt(clientId);
  const secretEnc = encrypt(clientSecret);

  await db
    .insert(oauthProviderConfigs)
    .values({
      serviceId,
      encryptedClientId: idEnc.encrypted,
      clientIdIv: idEnc.iv,
      encryptedClientSecret: secretEnc.encrypted,
      clientSecretIv: secretEnc.iv,
      scopes,
      updatedBy
    })
    .onConflictDoUpdate({
      target: oauthProviderConfigs.serviceId,
      set: {
        encryptedClientId: idEnc.encrypted,
        clientIdIv: idEnc.iv,
        encryptedClientSecret: secretEnc.encrypted,
        clientSecretIv: secretEnc.iv,
        scopes,
        updatedBy,
        updatedAt: new Date()
      }
    });
}

export async function deleteOAuthClient(serviceId: string): Promise<void> {
  await db.delete(oauthProviderConfigs).where(eq(oauthProviderConfigs.serviceId, serviceId));
}

/**
 * Generate a CSRF state token, persist it bound to the user + service, and
 * return it for inclusion in the authorization URL.
 */
export async function createOAuthState(userId: string, serviceId: string): Promise<string> {
  const state = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + STATE_TTL_SECONDS * 1000);
  await db.insert(oauthStates).values({ state, userId, serviceId, expiresAt });
  return state;
}

/**
 * Validate a state token returned by the OAuth provider. Returns the bound
 * user_id + service_id on success, throws on invalid / expired / mismatched.
 * Always consumes the state row (single-use).
 */
export async function consumeOAuthState(state: string): Promise<{ userId: string; serviceId: string }> {
  // Opportunistic cleanup of expired tokens
  await db.delete(oauthStates).where(lt(oauthStates.expiresAt, new Date()));

  const [row] = await db
    .select()
    .from(oauthStates)
    .where(eq(oauthStates.state, state))
    .limit(1);

  if (!row) throw new Error('Invalid or expired OAuth state token');

  // Single-use: delete immediately after read
  await db.delete(oauthStates).where(eq(oauthStates.state, state));

  if (row.expiresAt < new Date()) {
    throw new Error('OAuth state token has expired');
  }

  return { userId: row.userId, serviceId: row.serviceId };
}

/**
 * Build the OAuth authorization URL the user is redirected to.
 */
export function buildAuthorizationUrl(
  oauthConfig: McpOAuthConfig,
  client: DecryptedOAuthClient,
  redirectUri: string,
  state: string
): string {
  const url = new URL(oauthConfig.authorizationUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', client.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', client.scopes ?? oauthConfig.defaultScopes);
  url.searchParams.set('state', state);
  // `access_type=offline` + `prompt=consent` are how Google issues a
  // refresh_token; harmless on providers that ignore them.
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

/**
 * Exchange an authorization code for tokens at the provider's token endpoint.
 * Authentication shape (basic vs post) is dictated by the registry entry.
 */
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export async function exchangeCodeForTokens(
  oauthConfig: McpOAuthConfig,
  client: DecryptedOAuthClient,
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json'
  };

  if (oauthConfig.tokenEndpointAuthType === 'client_secret_basic') {
    headers.Authorization =
      'Basic ' + Buffer.from(`${client.clientId}:${client.clientSecret}`).toString('base64');
  } else if (oauthConfig.tokenEndpointAuthType === 'client_secret_post') {
    params.set('client_id', client.clientId);
    params.set('client_secret', client.clientSecret);
  } else {
    // 'none' — public client (rare; PKCE would normally apply but skipped here)
    params.set('client_id', client.clientId);
  }

  const res = await fetch(oauthConfig.tokenEndpoint, {
    method: 'POST',
    headers,
    body: params.toString()
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) {
    throw new Error('Token endpoint did not return an access_token');
  }
  return data;
}

/**
 * Resolve the public-facing OAuth callback URL. Falls back to constructing it
 * from the request's Origin header so deployments without an explicit base URL
 * still work.
 */
export function resolveCallbackUrl(serviceId: string, requestUrl: URL): string {
  const base = process.env.PUBLIC_BASE_URL ?? `${requestUrl.protocol}//${requestUrl.host}`;
  return `${base.replace(/\/$/, '')}/api/connections/oauth/${serviceId}/callback`;
}
