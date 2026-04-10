import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { apiKeys, apiKeyShares, users } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// List shares for a key (owner only)
export const GET: RequestHandler = async ({ url, locals }) => {
  const apiKeyId = url.searchParams.get('apiKeyId');
  if (!apiKeyId) return json({ error: 'apiKeyId is required' }, { status: 400 });

  // Verify ownership
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.userId, locals.userId!)))
    .limit(1);

  if (!key) return json({ error: 'Key not found or you are not the owner' }, { status: 403 });

  const shares = await db
    .select({
      id: apiKeyShares.id,
      userId: users.id,
      email: users.email,
      createdAt: apiKeyShares.createdAt
    })
    .from(apiKeyShares)
    .innerJoin(users, eq(apiKeyShares.sharedWithUserId, users.id))
    .where(eq(apiKeyShares.apiKeyId, apiKeyId));

  return json(shares);
};

// Share a key with a user (owner only)
export const POST: RequestHandler = async ({ request, locals }) => {
  const { apiKeyId, userId } = await request.json();
  if (!apiKeyId || !userId) return json({ error: 'apiKeyId and userId are required' }, { status: 400 });

  // Verify ownership
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.userId, locals.userId!)))
    .limit(1);

  if (!key) return json({ error: 'Key not found or you are not the owner' }, { status: 403 });

  // Can't share with yourself
  if (userId === locals.userId) return json({ error: 'Cannot share a key with yourself' }, { status: 400 });

  // Check user exists
  const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!targetUser) return json({ error: 'User not found' }, { status: 404 });

  try {
    await db.insert(apiKeyShares).values({ apiKeyId, sharedWithUserId: userId });
    return json({ success: true }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && (e as Error & { code?: string }).code === '23505') return json({ error: 'Already shared with this user' }, { status: 409 });
    throw e;
  }
};

// Revoke a share (owner only)
export const DELETE: RequestHandler = async ({ url, locals }) => {
  const shareId = url.searchParams.get('id');
  if (!shareId) return json({ error: 'Share ID is required' }, { status: 400 });

  // Get the share and verify key ownership
  const [share] = await db
    .select({ apiKeyId: apiKeyShares.apiKeyId })
    .from(apiKeyShares)
    .where(eq(apiKeyShares.id, shareId))
    .limit(1);

  if (!share) return json({ error: 'Share not found' }, { status: 404 });

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, share.apiKeyId), eq(apiKeys.userId, locals.userId!)))
    .limit(1);

  if (!key) return json({ error: 'You are not the owner of this key' }, { status: 403 });

  await db.delete(apiKeyShares).where(eq(apiKeyShares.id, shareId));
  return json({ success: true });
};
