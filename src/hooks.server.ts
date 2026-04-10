import type { Handle } from '@sveltejs/kit';
import { getUserIdFromSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';

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
  const isInvitePage = pathname.startsWith('/invite/');

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

  const userId = await getUserIdFromSession(event.cookies);
  event.locals.userId = userId;
  event.locals.userRole = null;
  event.locals.mustResetPassword = false;

  const isPublic = isLoginPage || isAuthApi || isInvitePage;

  if (!userId && !isPublic) {
    return new Response(null, { status: 303, headers: { location: '/login' } });
  }

  // Load user details if authenticated
  if (userId) {
    const [user] = await db
      .select({ role: users.role, mustResetPassword: users.mustResetPassword })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user) {
      event.locals.userRole = user.role as 'admin' | 'member';
      event.locals.mustResetPassword = user.mustResetPassword;

      // Password reset intercept
      if (user.mustResetPassword) {
        const isResetPage = pathname === '/settings/reset-password';
        const isResetApi = pathname === '/api/auth/reset-password';
        const isLogoutApi = pathname === '/api/auth/logout';

        if (!isResetPage && !isResetApi && !isLogoutApi) {
          return new Response(null, { status: 303, headers: { location: '/settings/reset-password' } });
        }
      }
    }
  }

  return resolve(event);
};
