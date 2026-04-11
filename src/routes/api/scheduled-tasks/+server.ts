import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { buildCronExpression } from '$lib/schedule-presets';
import { addTask, computeNextRun } from '$lib/server/scheduler';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const tasks = await db
    .select({
      id: scheduledTasks.id,
      name: scheduledTasks.name,
      description: scheduledTasks.description,
      agentId: scheduledTasks.agentId,
      environmentId: scheduledTasks.environmentId,
      promptTemplate: scheduledTasks.promptTemplate,
      cronExpression: scheduledTasks.cronExpression,
      schedulePreset: scheduledTasks.schedulePreset,
      timezone: scheduledTasks.timezone,
      sessionMode: scheduledTasks.sessionMode,
      activeSessionId: scheduledTasks.activeSessionId,
      enabled: scheduledTasks.enabled,
      nextRunAt: scheduledTasks.nextRunAt,
      lastRunAt: scheduledTasks.lastRunAt,
      runCount: scheduledTasks.runCount,
      createdBy: scheduledTasks.createdBy,
      createdAt: scheduledTasks.createdAt,
      updatedAt: scheduledTasks.updatedAt
    })
    .from(scheduledTasks)
    .orderBy(desc(scheduledTasks.createdAt));

  return json(tasks);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as {
    name?: string;
    description?: string;
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

  const { name, description, agentId, environmentId, promptTemplate, schedulePreset, timezone, sessionMode, hour, minute, dayOfWeek, dayOfMonth } = body;

  if (!name || !agentId || !environmentId || !promptTemplate || !schedulePreset) {
    return json({ error: 'Missing required fields: name, agentId, environmentId, promptTemplate, schedulePreset' }, { status: 400 });
  }

  const cronExpression = buildCronExpression(schedulePreset, hour, minute, dayOfWeek, dayOfMonth);
  const tz = timezone ?? 'UTC';
  const nextRunAt = computeNextRun(cronExpression, tz);

  const [task] = await db
    .insert(scheduledTasks)
    .values({
      name,
      description,
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
