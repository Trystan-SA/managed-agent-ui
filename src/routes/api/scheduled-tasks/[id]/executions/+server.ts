import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { taskExecutions } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals, url }) => {
  if (!locals.userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  const executions = await db
    .select()
    .from(taskExecutions)
    .where(eq(taskExecutions.taskId, params.id))
    .orderBy(desc(taskExecutions.startedAt))
    .limit(limit)
    .offset(offset);

  return json(executions);
};
