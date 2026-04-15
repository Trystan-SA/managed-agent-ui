import { NotFoundError } from '@anthropic-ai/sdk';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users } from './db/schema';
import { createAnthropicClient } from './anthropic';

/**
 * Returns the user's Anthropic vault ID, creating one if it doesn't exist.
 *
 * Recovery semantics: if `users.vault_id` references a vault that has been
 * deleted, archived, or is otherwise unreachable, this transparently mints a
 * fresh vault and updates the row. Callers can treat the returned ID as
 * always-valid for the lifetime of the request.
 *
 * Cross-references the user back to Anthropic via `metadata.external_user_id`
 * so vaults can be matched to local users in the Anthropic console even after
 * a recreate.
 */
export async function getOrCreateUserVault(userId: string): Promise<string> {
  const [user] = await db
    .select({ id: users.id, email: users.email, vaultId: users.vaultId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const client = await createAnthropicClient();

  // Happy path: stored vault still exists and isn't archived.
  if (user.vaultId) {
    try {
      const vault = await client.beta.vaults.retrieve(user.vaultId);
      if (!vault.archived_at) return vault.id;
      // Archived → fall through to recreate
    } catch (err: unknown) {
      // 404 → fall through to recreate. Other errors should bubble up.
      if (!(err instanceof NotFoundError)) throw err;
    }
  }

  // Create (or recreate). external_user_id makes the vault traceable from
  // Anthropic's side back to this user even after a recreate.
  const created = await client.beta.vaults.create({
    display_name: user.email,
    metadata: { external_user_id: user.id }
  });

  await db.update(users).set({ vaultId: created.id }).where(eq(users.id, user.id));
  return created.id;
}
