import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks } from '$lib/server/db/schema';
import { triggerNow } from '$lib/server/scheduler';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params, locals }) => {
  if (!locals.userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [task] = await db
    .select({ id: scheduledTasks.id, createdBy: scheduledTasks.createdBy })
    .from(scheduledTasks)
    .where(eq(scheduledTasks.id, params.id))
    .limit(1);

  if (!task) {
    return json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.createdBy !== locals.userId && locals.userRole !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  triggerNow(params.id);

  return json({ success: true, message: 'Task triggered' });
};
