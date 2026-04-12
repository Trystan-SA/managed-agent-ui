import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks, taskExecutions } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals, url }) => {
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

  const rawLimit = parseInt(url.searchParams.get('limit') ?? '50', 10);
  const limit = Math.min(Number.isNaN(rawLimit) ? 50 : rawLimit, 200);
  const rawOffset = parseInt(url.searchParams.get('offset') ?? '0', 10);
  const offset = Number.isNaN(rawOffset) ? 0 : rawOffset;

  const executions = await db
    .select()
    .from(taskExecutions)
    .where(eq(taskExecutions.taskId, params.id))
    .orderBy(desc(taskExecutions.startedAt))
    .limit(limit)
    .offset(offset);

  return json(executions);
};
