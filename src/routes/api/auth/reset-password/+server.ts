import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.userId) return json({ error: 'Not authenticated' }, { status: 401 });

  const { newPassword } = await request.json();
  if (!newPassword || newPassword.length < 8) {
    return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ password: passwordHash, mustResetPassword: false, updatedAt: new Date() })
    .where(eq(users.id, locals.userId));

  return json({ success: true });
};
