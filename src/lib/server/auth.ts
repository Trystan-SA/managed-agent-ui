import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { json, type Cookies } from '@sveltejs/kit';
import { db } from './db';
import { authSessions } from './db/schema';
import { eq, lt } from 'drizzle-orm';

const SALT_ROUNDS = 12;
const SESSION_COOKIE = 'session_id';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(cookies: Cookies, userId: string): Promise<void> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await db.insert(authSessions).values({ userId, token, expiresAt });

  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE
  });
}

export async function getUserIdFromSession(cookies: Cookies): Promise<string | null> {
  const token = cookies.get(SESSION_COOKIE);
  if (!token) return null;

  // Piggyback cleanup: delete expired rows
  await db.delete(authSessions).where(lt(authSessions.expiresAt, new Date()));

  const [session] = await db
    .select({ userId: authSessions.userId })
    .from(authSessions)
    .where(eq(authSessions.token, token))
    .limit(1);

  if (!session) return null;
  return session.userId;
}

/**
 * Returns a 403 response if the request isn't from an authenticated admin,
 * otherwise null. Use as: `const denied = requireAdmin(locals); if (denied) return denied;`
 */
export function requireAdmin(locals: App.Locals) {
  if (!locals.userId || locals.userRole !== 'admin') {
    return json({ error: 'Admin access required' }, { status: 403 });
  }
  return null;
}

export async function destroySession(cookies: Cookies): Promise<void> {
  const token = cookies.get(SESSION_COOKIE);
  if (token) {
    await db.delete(authSessions).where(eq(authSessions.token, token));
  }
  cookies.delete(SESSION_COOKIE, { path: '/' });
}
