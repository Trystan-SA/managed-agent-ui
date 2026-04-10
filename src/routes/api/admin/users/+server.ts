import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

function requireAdmin(locals: App.Locals) {
  if (!locals.userId || locals.userRole !== 'admin') {
    return json({ error: 'Admin access required' }, { status: 403 });
  }
  return null;
}

// List all users
export const GET: RequestHandler = async ({ locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt
    })
    .from(users)
    .orderBy(users.createdAt);

  return json(allUsers);
};

// Delete a user
export const DELETE: RequestHandler = async ({ url, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'User ID is required' }, { status: 400 });

  // Cannot delete yourself
  if (id === locals.userId) {
    return json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  // Cascade delete: user's API keys will cascade-delete shares via FK.
  // Auth sessions, bookmarks, preferences also cascade via FK.
  await db.delete(users).where(eq(users.id, id));

  return json({ success: true });
};
