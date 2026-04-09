import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { checkRateLimit } from '$lib/server/rate-limit';
import { count } from 'drizzle-orm';

const DELAY_MS = 3000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const ip = getClientAddress();

  if (!checkRateLimit(ip)) {
    await delay(DELAY_MS);
    return json({ error: 'Too many attempts. Please wait before trying again.' }, { status: 429 });
  }

  // Check if setup is still available
  const [{ total }] = await db.select({ total: count() }).from(users);
  if (total > 0) {
    await delay(DELAY_MS);
    return json({ error: 'Setup already completed.' }, { status: 403 });
  }

  const { setupPassword } = await request.json();

  const expected = process.env.SETUP_PASSWORD;
  if (!expected) {
    await delay(DELAY_MS);
    return json({ error: 'SETUP_PASSWORD environment variable is not configured' }, { status: 500 });
  }

  // Always wait the full delay — constant-time regardless of success/failure
  await delay(DELAY_MS);

  if (!setupPassword || setupPassword !== expected) {
    return json({ error: 'Invalid setup password' }, { status: 401 });
  }

  return json({ verified: true });
};
