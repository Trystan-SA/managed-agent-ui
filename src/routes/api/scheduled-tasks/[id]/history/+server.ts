import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks, taskEditHistory, users } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const [task] = await db
    .select({ id: scheduledTasks.id, createdBy: scheduledTasks.createdBy })
    .from(scheduledTasks)
    .where(eq(scheduledTasks.id, params.id))
    .limit(1);

  if (!task) return json({ error: 'Not found' }, { status: 404 });

  if (task.createdBy !== locals.userId && locals.userRole !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 });
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
