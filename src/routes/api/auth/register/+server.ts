import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users, apiKeys, userPreferences } from '$lib/server/db/schema';
import { hashPassword, createSession } from '$lib/server/auth';
import { encrypt } from '$lib/server/crypto';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { email, password, apiKey } = await request.json();

  if (!email || !password || !apiKey) {
    return json({ error: 'Email, password, and API key are required' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const { encrypted, iv } = encrypt(apiKey);

  try {
    const [user] = await db.insert(users).values({ email, password: passwordHash }).returning();
    await db.insert(apiKeys).values({ userId: user.id, encryptedKey: encrypted, iv });
    await db.insert(userPreferences).values({ userId: user.id });
    createSession(cookies, user.id);
    return json({ success: true });
  } catch (e: any) {
    if (e.code === '23505') {
      return json({ error: 'Email already registered' }, { status: 409 });
    }
    throw e;
  }
};
