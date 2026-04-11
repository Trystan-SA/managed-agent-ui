import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks } from '$lib/server/db/schema';
import { addTask, removeTask } from '$lib/server/scheduler';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params, locals }) => {
  if (!locals.userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [task] = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.id, params.id))
    .limit(1);

  if (!task) {
    return json({ error: 'Task not found' }, { status: 404 });
  }

  const newEnabled = !task.enabled;

  const [updated] = await db
    .update(scheduledTasks)
    .set({ enabled: newEnabled, updatedAt: new Date() })
    .where(eq(scheduledTasks.id, params.id))
    .returning();

  if (newEnabled) {
    addTask(updated.id, updated.cronExpression, updated.timezone);
  } else {
    removeTask(updated.id);
  }

  return json(updated);
};
