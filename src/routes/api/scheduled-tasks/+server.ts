import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks } from '$lib/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { buildCronExpression } from '$lib/schedule-presets';
import { addTask, computeNextRun } from '$lib/server/scheduler';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const agentId = url.searchParams.get('agentId');

  // Admins see all tasks; members only see their own
  const ownerFilter = locals.userRole === 'admin'
    ? undefined
    : eq(scheduledTasks.createdBy, locals.userId);

  const conditions = [ownerFilter, agentId ? eq(scheduledTasks.agentId, agentId) : undefined].filter(Boolean);

  const tasks = conditions.length > 0
    ? await db.select().from(scheduledTasks).where(and(...conditions)).orderBy(desc(scheduledTasks.createdAt))
    : await db.select().from(scheduledTasks).orderBy(desc(scheduledTasks.createdAt));

  return json(tasks);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as {
    agentId?: string;
    environmentId?: string;
    promptTemplate?: string;
    schedulePreset?: string;
    timezone?: string;
    sessionMode?: string;
    hour?: number;
    minute?: number;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };

  const { agentId, environmentId, promptTemplate, schedulePreset, timezone, sessionMode, hour, minute, dayOfWeek, dayOfMonth } = body;

  if (!agentId || !environmentId || !promptTemplate || !schedulePreset) {
    return json({ error: 'Missing required fields: agentId, environmentId, promptTemplate, schedulePreset' }, { status: 400 });
  }

  const cronExpression = buildCronExpression(schedulePreset, hour, minute, dayOfWeek, dayOfMonth);
  const tz = timezone ?? 'UTC';
  const nextRunAt = computeNextRun(cronExpression, tz);

  const [task] = await db
    .insert(scheduledTasks)
    .values({
      agentId,
      environmentId,
      promptTemplate,
      cronExpression,
      schedulePreset,
      timezone: tz,
      sessionMode: sessionMode ?? 'new_session',
      nextRunAt,
      createdBy: locals.userId,
      updatedBy: locals.userId
    })
    .returning();

  addTask(task.id, task.cronExpression, task.timezone);

  return json(task, { status: 201 });
};
