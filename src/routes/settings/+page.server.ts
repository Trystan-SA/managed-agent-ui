import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { apiKeys, userPreferences } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.userId!;
  const [key] = await db.select({ label: apiKeys.label, createdAt: apiKeys.createdAt })
    .from(apiKeys).where(eq(apiKeys.userId, userId)).limit(1);
  const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return {
    hasApiKey: !!key,
    apiKeyLabel: key?.label ?? null,
    apiKeyCreatedAt: key?.createdAt?.toISOString() ?? null,
    preferences: prefs ?? { theme: 'dark', defaultAgentId: null, defaultEnvId: null }
  };
};
