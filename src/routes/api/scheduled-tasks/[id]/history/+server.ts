import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { taskEditHistory, users } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const history = await db
    .select({
      id: taskEditHistory.id,
      taskId: taskEditHistory.taskId,
      editedBy: taskEditHistory.editedBy,
      editorEmail: users.email,
      changes: taskEditHistory.changes,
      createdAt: taskEditHistory.createdAt
    })
    .from(taskEditHistory)
    .innerJoin(users, eq(taskEditHistory.editedBy, users.id))
    .where(eq(taskEditHistory.taskId, params.id))
    .orderBy(desc(taskEditHistory.createdAt));

  return json(history);
};
