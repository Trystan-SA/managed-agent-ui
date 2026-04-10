import Anthropic from '@anthropic-ai/sdk';
import { db } from './db';
import { apiKeys } from './db/schema';
import { decrypt } from './crypto';

/**
 * Create an Anthropic client using the global API key.
 * The API key is a system-wide setting managed by admins.
 */
export async function createAnthropicClient(): Promise<Anthropic> {
  const [row] = await db.select().from(apiKeys).limit(1);
  if (!row) {
    throw new Error('No API key configured. An admin must add one in Settings.');
  }

  const apiKey = decrypt(row.encryptedKey, row.iv);
  return new Anthropic({ apiKey });
}
