import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { apiKeys } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
  // Echo the same gate the dashboard uses — without a global API key we can't
  // talk to Anthropic at all, so the connections page can't function either.
  const [key] = await db.select({ id: apiKeys.id }).from(apiKeys).limit(1);
  return { apiKeyConfigured: !!key };
};
