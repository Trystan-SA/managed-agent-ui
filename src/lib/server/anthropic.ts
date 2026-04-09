import Anthropic from '@anthropic-ai/sdk';
import { db } from './db';
import { apiKeys } from './db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from './crypto';

export async function createAnthropicClient(userId: string): Promise<Anthropic> {
  const [row] = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).limit(1);
  if (!row) {
    throw new Error('No API key configured. Please add your Anthropic API key in Settings.');
  }
  const apiKey = decrypt(row.encryptedKey, row.iv);
  return new Anthropic({ apiKey });
}
