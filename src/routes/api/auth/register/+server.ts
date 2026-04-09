import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users, userPreferences } from '$lib/server/db/schema';
import { hashPassword, createSession } from '$lib/server/auth';
import { markSetupComplete } from '../../../../hooks.server';
import { checkRateLimit } from '$lib/server/rate-limit';
import { count } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
  const [{ total }] = await db.select({ total: count() }).from(users);
  return json({ setupRequired: total === 0 });
};

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  const ip = getClientAddress();

  if (!checkRateLimit(ip)) {
    return json({ error: 'Too many attempts. Please wait before trying again.' }, { status: 429 });
  }

  // Check if any user already exists — registration is one-time only
  const [{ total }] = await db.select({ total: count() }).from(users);
  if (total > 0) {
    return json({ error: 'Setup already completed. Registration is disabled.' }, { status: 403 });
  }

  const { email, password, setupPassword } = await request.json();

  // Validate setup password (defense in depth — already verified in step 1)
  const expectedSetupPassword = process.env.SETUP_PASSWORD;
  if (!expectedSetupPassword) {
    return json({ error: 'SETUP_PASSWORD environment variable is not configured' }, { status: 500 });
  }
  if (!setupPassword || setupPassword !== expectedSetupPassword) {
    return json({ error: 'Invalid setup password' }, { status: 401 });
  }

  if (!email || !password) {
    return json({ error: 'Email and password are required' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  try {
    const [user] = await db.insert(users).values({ email, password: passwordHash }).returning();
    await db.insert(userPreferences).values({ userId: user.id });
    createSession(cookies, user.id);
    markSetupComplete();
    return json({ success: true });
  } catch (e: any) {
    if (e.code === '23505') {
      return json({ error: 'Email already registered' }, { status: 409 });
    }
    throw e;
  }
};
