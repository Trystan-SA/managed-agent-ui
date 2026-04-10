import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { email, password } = await request.json();

  if (!email || !password) {
    return json({ error: 'Email and password are required' }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return json({ error: 'Invalid email or password' }, { status: 401 });
  }

  await createSession(cookies, user.id);
  return json({ success: true, mustResetPassword: user.mustResetPassword });
};
