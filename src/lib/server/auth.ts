import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

const SALT_ROUNDS = 12;
const SESSION_COOKIE = 'session_id';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// In-memory session store. For production, move to Redis or DB.
const sessions = new Map<string, { userId: string; expiresAt: number }>();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSession(cookies: Cookies, userId: string): void {
  const sessionId = randomUUID();
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  sessions.set(sessionId, { userId, expiresAt });
  cookies.set(SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE
  });
}

export function getUserIdFromSession(cookies: Cookies): string | null {
  const sessionId = cookies.get(SESSION_COOKIE);
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  return session.userId;
}

export function destroySession(cookies: Cookies): void {
  const sessionId = cookies.get(SESSION_COOKIE);
  if (sessionId) sessions.delete(sessionId);
  cookies.delete(SESSION_COOKIE, { path: '/' });
}
