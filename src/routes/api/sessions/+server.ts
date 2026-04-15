import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';
import { getOrCreateUserVault } from '$lib/server/user-vault';

export const GET: RequestHandler = async ({ locals: _locals }) => {
  const client = await createAnthropicClient();
  const sessions = [];
  for await (const session of client.beta.sessions.list()) {
    sessions.push(session);
  }
  return json(sessions);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();

  // Auto-attach the caller's vault so MCP credentials they've stored via
  // /connections are available to the session. Caller-supplied vault_ids are
  // preserved (admin overrides), and we de-dup so the user vault isn't added
  // twice if explicitly listed.
  if (locals.userId) {
    try {
      const userVaultId = await getOrCreateUserVault(locals.userId);
      const supplied = Array.isArray(body.vault_ids) ? body.vault_ids : [];
      body.vault_ids = Array.from(new Set([userVaultId, ...supplied]));
    } catch (err) {
      // Don't block session creation if the user vault can't be reached —
      // sessions without MCP creds are still useful.
      console.error('[sessions.create] user vault lookup failed:', err);
    }
  }

  const client = await createAnthropicClient();
  const session = await client.beta.sessions.create(body);
  return json(session, { status: 201 });
};
