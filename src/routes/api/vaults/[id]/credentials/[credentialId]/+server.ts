import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';
import { requireAdmin } from '$lib/server/auth';

// Delete a credential from a vault
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const client = await createAnthropicClient();
  const result = await client.beta.vaults.credentials.delete(params.credentialId, {
    vault_id: params.id
  });
  return json(result);
};
