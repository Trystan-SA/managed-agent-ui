import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { invites, users } from '$lib/server/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '$lib/server/auth';
import { sendInviteEmail } from '$lib/server/email';

function requireAdmin(locals: App.Locals) {
  if (!locals.userId || locals.userRole !== 'admin') {
    return json({ error: 'Admin access required' }, { status: 403 });
  }
  return null;
}

// List all invites
export const GET: RequestHandler = async ({ locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const allInvites = await db
    .select({
      id: invites.id,
      email: invites.email,
      token: invites.token,
      hasTemporaryPassword: invites.temporaryPassword,
      expiresAt: invites.expiresAt,
      acceptedAt: invites.acceptedAt,
      createdAt: invites.createdAt
    })
    .from(invites)
    .orderBy(invites.createdAt);

  return json(
    allInvites.map((inv) => ({
      ...inv,
      hasTemporaryPassword: !!inv.hasTemporaryPassword,
      status: inv.acceptedAt
        ? 'accepted'
        : new Date(inv.expiresAt) < new Date()
          ? 'expired'
          : 'pending'
    }))
  );
};

// Create an invite
export const POST: RequestHandler = async ({ request, url, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const { email, temporaryPassword } = await request.json();
  if (!email) return json({ error: 'Email is required' }, { status: 400 });

  // Check if user already exists
  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) return json({ error: 'A user with this email already exists' }, { status: 409 });

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  const hashedTempPassword = temporaryPassword
    ? await hashPassword(temporaryPassword)
    : null;

  await db.insert(invites).values({
    email,
    invitedBy: locals.userId!,
    token,
    temporaryPassword: hashedTempPassword,
    expiresAt
  });

  const inviteUrl = `${url.origin}/invite/${token}`;

  // Try to send email, fall back to showing URL
  let emailSent = false;
  if (!temporaryPassword) {
    emailSent = await sendInviteEmail(email, inviteUrl);
  }

  return json({
    success: true,
    inviteUrl,
    emailSent,
    token
  }, { status: 201 });
};

// Revoke an invite
export const DELETE: RequestHandler = async ({ url, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'Invite ID is required' }, { status: 400 });

  await db.delete(invites).where(eq(invites.id, id));
  return json({ success: true });
};
