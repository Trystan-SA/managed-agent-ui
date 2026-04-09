import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { apiKeys } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt } from '$lib/server/crypto';

export const PUT: RequestHandler = async ({ request, locals }) => {
  const { apiKey, label } = await request.json();
  if (!apiKey) {
    return json({ error: 'API key is required' }, { status: 400 });
  }

  const { encrypted, iv } = encrypt(apiKey);
  const userId = locals.userId!;

  const existing = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).limit(1);

  if (existing.length > 0) {
    await db.update(apiKeys)
      .set({ encryptedKey: encrypted, iv, label: label ?? null, updatedAt: new Date() })
      .where(eq(apiKeys.userId, userId));
  } else {
    await db.insert(apiKeys).values({ userId, encryptedKey: encrypted, iv, label });
  }

  return json({ success: true });
};

export const DELETE: RequestHandler = async ({ locals }) => {
  await db.delete(apiKeys).where(eq(apiKeys.userId, locals.userId!));
  return json({ success: true });
};
