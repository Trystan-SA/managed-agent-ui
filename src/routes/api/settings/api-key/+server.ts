import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { apiKeys } from '$lib/server/db/schema';
import { encrypt } from '$lib/server/crypto';
import { requireAdmin } from '$lib/server/auth';

// Get the global API key status
export const GET: RequestHandler = async ({ locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const [key] = await db
    .select({ id: apiKeys.id, createdAt: apiKeys.createdAt })
    .from(apiKeys)
    .limit(1);

  return json(key ?? null);
};

// Set or replace the global API key (admin only)
export const POST: RequestHandler = async ({ request, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const { apiKey } = await request.json();
  if (!apiKey) return json({ error: 'API key is required' }, { status: 400 });

  const { encrypted, iv } = encrypt(apiKey);

  // Delete any existing key (single global key)
  await db.delete(apiKeys);

  const [row] = await db
    .insert(apiKeys)
    .values({ userId: locals.userId!, name: 'Global', encryptedKey: encrypted, iv })
    .returning({ id: apiKeys.id });

  return json({ success: true, id: row.id }, { status: 201 });
};

// Delete the global API key (admin only)
export const DELETE: RequestHandler = async ({ locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  await db.delete(apiKeys);
  return json({ success: true });
};
