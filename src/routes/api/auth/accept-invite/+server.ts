import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { invites, users, userPreferences } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, createSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { token, password, temporaryPassword } = await request.json();
  if (!token) return json({ error: 'Invite token is required' }, { status: 400 });

  // Find invite
  const [invite] = await db.select().from(invites).where(eq(invites.token, token)).limit(1);
  if (!invite) return json({ error: 'Invalid invite' }, { status: 404 });
  if (invite.acceptedAt) return json({ error: 'Invite already used' }, { status: 410 });
  if (new Date(invite.expiresAt) < new Date()) return json({ error: 'Invite expired' }, { status: 410 });

  // Check if user already exists
  const [existingUser] = await db.select().from(users).where(eq(users.email, invite.email)).limit(1);
  if (existingUser) return json({ error: 'A user with this email already exists' }, { status: 409 });

  let passwordHash: string;
  let mustResetPassword = false;

  if (invite.temporaryPassword) {
    // Temp password flow: verify the temp password, create user with it, flag for reset
    if (!temporaryPassword) return json({ error: 'Temporary password is required' }, { status: 400 });

    const valid = await verifyPassword(temporaryPassword, invite.temporaryPassword);
    if (!valid) return json({ error: 'Invalid temporary password' }, { status: 401 });

    passwordHash = invite.temporaryPassword; // Already hashed
    mustResetPassword = true;
  } else {
    // Email flow: user sets their own password
    if (!password || password.length < 8) {
      return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    passwordHash = await hashPassword(password);
  }

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      email: invite.email,
      password: passwordHash,
      role: 'member',
      mustResetPassword
    })
    .returning();

  await db.insert(userPreferences).values({ userId: user.id });

  // Mark invite as accepted
  await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id));

  // Log them in
  await createSession(cookies, user.id);

  return json({ success: true, mustResetPassword });
};
