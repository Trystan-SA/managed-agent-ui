/**
 * Curated registry of well-known MCP servers, with the auth method that yields
 * the longest-lived connection. The selection here favors personal API tokens
 * over OAuth wherever the provider supports it — these don't expire and don't
 * need refresh handling.
 *
 * Phase 1 ships static_bearer only. OAuth services are added as Phase 2.
 */

export type McpAuthType = 'static_bearer' | 'oauth';

/**
 * OAuth provider metadata. The admin supplies the per-deployment client_id +
 * client_secret in Settings; everything else lives here so adding a new OAuth
 * provider is just a registry change.
 */
export interface McpOAuthConfig {
  /** Authorization endpoint (where the user is redirected to consent). */
  authorizationUrl: string;
  /** Token endpoint (used both for initial code exchange and refresh). */
  tokenEndpoint: string;
  /** Default OAuth scopes; admin can override per deployment. */
  defaultScopes: string;
  /**
   * How the token endpoint authenticates refresh requests. Anthropic's vault
   * stores this as part of the refresh block so it can re-mint access tokens
   * without our involvement.
   */
  tokenEndpointAuthType: 'client_secret_post' | 'client_secret_basic' | 'none';
  /** Optional setup instructions for the admin (where to register the OAuth app). */
  setupInstructions?: string[];
  /** Where the admin registers the OAuth app and finds client_id/secret. */
  appRegistrationUrl?: string;
}

export interface McpServiceDefinition {
  /** Stable identifier used in URLs and DB references. */
  id: string;
  /** Human-readable name shown to users. */
  displayName: string;
  /** A short tag describing the kind of integration. */
  category: string;
  /** The MCP server URL the credential authenticates against. */
  mcpServerUrl: string;
  /** Authentication mechanism — 'static_bearer' or 'oauth'. */
  authType: McpAuthType;
  /** Note about token lifetime / scope hints. */
  lifetimeNote?: string;
  // -- static_bearer-only fields (ignored when authType === 'oauth')
  /** URL where the user generates the token (deep-linked to the right page). */
  tokenUrl?: string;
  /** Step-by-step instructions shown in the connect modal. */
  instructions?: string[];
  /** Optional placeholder for the token input. */
  tokenPlaceholder?: string;
  // -- oauth-only fields (required when authType === 'oauth')
  oauthConfig?: McpOAuthConfig;
}

export const MCP_SERVICES: McpServiceDefinition[] = [
  {
    id: 'linear',
    displayName: 'Linear',
    category: 'Project tracking',
    mcpServerUrl: 'https://mcp.linear.app/mcp',
    authType: 'static_bearer',
    tokenUrl: 'https://linear.app/settings/api',
    instructions: [
      'Open Linear → Settings → API',
      'Click "Create new API key" and give it a name',
      'Copy the generated key (starts with "lin_api_") and paste it below'
    ],
    tokenPlaceholder: 'lin_api_...',
    lifetimeNote: 'Personal API keys never expire unless you revoke them.'
  },
  {
    id: 'notion',
    displayName: 'Notion',
    category: 'Docs & wikis',
    mcpServerUrl: 'https://mcp.notion.com/mcp',
    authType: 'static_bearer',
    tokenUrl: 'https://www.notion.so/profile/integrations',
    instructions: [
      'Open Notion → Settings → Integrations',
      'Create a new internal integration',
      'Grant it access to the pages or databases the agent should reach',
      'Copy the "Internal Integration Token" and paste it below'
    ],
    tokenPlaceholder: 'ntn_...',
    lifetimeNote: 'Internal integration tokens never expire.'
  },
  {
    id: 'github',
    displayName: 'GitHub',
    category: 'Source code',
    mcpServerUrl: 'https://api.githubcopilot.com/mcp/',
    authType: 'static_bearer',
    tokenUrl: 'https://github.com/settings/personal-access-tokens/new',
    instructions: [
      'Open GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens',
      'Click "Generate new token"',
      'Set "Expiration" to "No expiration" (or a long horizon)',
      'Grant the repo scopes the agent needs (read or read/write as appropriate)',
      'Copy the token (starts with "github_pat_") and paste it below'
    ],
    tokenPlaceholder: 'github_pat_...',
    lifetimeNote: 'Set expiration to "No expiration" for indefinite access.'
  },
  {
    id: 'atlassian',
    displayName: 'Atlassian (Jira / Confluence)',
    category: 'Project tracking',
    mcpServerUrl: 'https://mcp.atlassian.com/v1/sse',
    authType: 'static_bearer',
    tokenUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
    instructions: [
      'Open Atlassian account → Security → API tokens',
      'Click "Create API token"',
      'Copy the token and paste it below'
    ],
    lifetimeNote: 'Atlassian API tokens never expire unless you revoke them.'
  },
  {
    id: 'sentry',
    displayName: 'Sentry',
    category: 'Observability',
    mcpServerUrl: 'https://mcp.sentry.dev/mcp',
    authType: 'static_bearer',
    tokenUrl: 'https://sentry.io/settings/account/api/auth-tokens/',
    instructions: [
      'Open Sentry → User Settings → API → Auth Tokens',
      'Create a new auth token with the scopes the agent needs',
      'Copy the token and paste it below'
    ],
    lifetimeNote: 'Auth tokens never expire unless you revoke them.'
  },
  {
    id: 'linear-oauth',
    displayName: 'Linear (OAuth)',
    category: 'Project tracking',
    mcpServerUrl: 'https://mcp.linear.app/mcp',
    authType: 'oauth',
    lifetimeNote:
      "Linear's refresh tokens last for years; Anthropic auto-refreshes the access token transparently.",
    oauthConfig: {
      authorizationUrl: 'https://linear.app/oauth/authorize',
      tokenEndpoint: 'https://api.linear.app/oauth/token',
      defaultScopes: 'read write',
      tokenEndpointAuthType: 'client_secret_post',
      appRegistrationUrl: 'https://linear.app/settings/api/applications',
      setupInstructions: [
        'Open Linear → Settings → API → OAuth applications',
        'Click "New application"',
        'Set the callback URL to the redirect URI shown below',
        'Copy the Client ID and Client Secret and paste them into Settings → OAuth providers'
      ]
    }
  },
  {
    id: 'stripe',
    displayName: 'Stripe',
    category: 'Payments',
    mcpServerUrl: 'https://mcp.stripe.com',
    authType: 'static_bearer',
    tokenUrl: 'https://dashboard.stripe.com/apikeys',
    instructions: [
      'Open Stripe Dashboard → Developers → API keys',
      'Create a restricted key with the resources the agent should access',
      'Copy the secret key (starts with "rk_live_" or "rk_test_") and paste it below'
    ],
    tokenPlaceholder: 'rk_...',
    lifetimeNote: 'Restricted keys never expire unless you delete them.'
  }
];

export function getMcpService(id: string): McpServiceDefinition | undefined {
  return MCP_SERVICES.find((s) => s.id === id);
}

export function getMcpServiceByUrl(url: string): McpServiceDefinition | undefined {
  return MCP_SERVICES.find((s) => s.mcpServerUrl === url);
}
