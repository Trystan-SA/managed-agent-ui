import type { Handle } from '@sveltejs/kit';
import { getUserIdFromSession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const userId = getUserIdFromSession(event.cookies);
  event.locals.userId = userId;

  const { pathname } = event.url;
  const isPublic = pathname === '/login' || pathname === '/register' || pathname.startsWith('/api/auth/');

  if (!userId && !isPublic) {
    return new Response(null, { status: 303, headers: { location: '/login' } });
  }

  return resolve(event);
};
