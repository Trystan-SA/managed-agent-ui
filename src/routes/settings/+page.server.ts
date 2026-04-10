import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { apiKeys, users, userPreferences } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.userId!;
  const userRole = locals.userRole;

  // Global API key (admin-only setting, but load status for display)
  let apiKey: { id: string; createdAt: string | null } | null = null;
  if (userRole === 'admin') {
    const [key] = await db
      .select({ id: apiKeys.id, createdAt: apiKeys.createdAt })
      .from(apiKeys)
      .limit(1);
    apiKey = key ? { id: key.id, createdAt: key.createdAt?.toISOString() ?? null } : null;
  }

  const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);

  return {
    apiKey,
    preferences: prefs ?? { theme: 'dark', defaultAgentId: null, defaultEnvId: null },
    userRole,
    userEmail: user?.email ?? null
  };
};
