import type { Handle } from '@sveltejs/kit';
import { getUserIdFromSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { count } from 'drizzle-orm';

let setupComplete: boolean | null = null;

async function isSetupComplete(): Promise<boolean> {
  if (setupComplete) return true;
  const [{ total }] = await db.select({ total: count() }).from(users);
  setupComplete = total > 0;
  return setupComplete;
}

// Reset the cache when a new user is registered
export function markSetupComplete(): void {
  setupComplete = true;
}

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;
  const isAuthApi = pathname.startsWith('/api/auth/');
  const isSetupPage = pathname === '/register';
  const isLoginPage = pathname === '/login';

  const hasUsers = await isSetupComplete();

  // If no users exist, force everything to the setup page
  if (!hasUsers) {
    if (isSetupPage || isAuthApi) {
      return resolve(event);
    }
    return new Response(null, { status: 303, headers: { location: '/register' } });
  }

  // Setup is done — block the register page
  if (isSetupPage) {
    return new Response(null, { status: 303, headers: { location: '/login' } });
  }

  const userId = getUserIdFromSession(event.cookies);
  event.locals.userId = userId;

  const isPublic = isLoginPage || isAuthApi;

  if (!userId && !isPublic) {
    return new Response(null, { status: 303, headers: { location: '/login' } });
  }

  return resolve(event);
};
