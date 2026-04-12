import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks, taskEditHistory } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { buildCronExpression } from '$lib/schedule-presets';
import { updateTask, removeTask, computeNextRun } from '$lib/server/scheduler';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const [task] = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.id, params.id))
    .limit(1);

  if (!task) return json({ error: 'Not found' }, { status: 404 });

  return json(task);
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const [existing] = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.id, params.id))
    .limit(1);

  if (!existing) return json({ error: 'Not found' }, { status: 404 });

  const body = await request.json() as {
    agentId?: string;
    promptTemplate?: string;
    schedulePreset?: string;
    timezone?: string;
    sessionMode?: string;
    enabled?: boolean;
    hour?: number;
    minute?: number;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };

  // Build diff for edit history
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  if (body.agentId !== undefined && body.agentId !== existing.agentId) {
    changes.agentId = { from: existing.agentId, to: body.agentId };
  }
  if (body.promptTemplate !== undefined && body.promptTemplate !== existing.promptTemplate) {
    changes.promptTemplate = { from: existing.promptTemplate, to: body.promptTemplate };
  }
  if (body.schedulePreset !== undefined && body.schedulePreset !== existing.schedulePreset) {
    changes.schedulePreset = { from: existing.schedulePreset, to: body.schedulePreset };
  }
  if (body.timezone !== undefined && body.timezone !== existing.timezone) {
    changes.timezone = { from: existing.timezone, to: body.timezone };
  }
  if (body.sessionMode !== undefined && body.sessionMode !== existing.sessionMode) {
    changes.sessionMode = { from: existing.sessionMode, to: body.sessionMode };
  }
  if (body.enabled !== undefined && body.enabled !== existing.enabled) {
    changes.enabled = { from: existing.enabled, to: body.enabled };
  }

  // Recompute cron if schedule-related fields changed
  const scheduleChanged = body.schedulePreset !== undefined || body.timezone !== undefined ||
    body.hour !== undefined || body.minute !== undefined ||
    body.dayOfWeek !== undefined || body.dayOfMonth !== undefined;

  const newPreset = body.schedulePreset ?? existing.schedulePreset;
  const newTimezone = body.timezone ?? existing.timezone;
  let newCronExpression = existing.cronExpression;
  let newNextRunAt = existing.nextRunAt;

  if (scheduleChanged) {
    newCronExpression = buildCronExpression(
      newPreset,
      body.hour,
      body.minute,
      body.dayOfWeek,
      body.dayOfMonth
    );
    newNextRunAt = computeNextRun(newCronExpression, newTimezone);

    if (newCronExpression !== existing.cronExpression) {
      changes.cronExpression = { from: existing.cronExpression, to: newCronExpression };
    }
  }

  // Insert edit history if there are changes
  if (Object.keys(changes).length > 0) {
    await db.insert(taskEditHistory).values({
      taskId: existing.id,
      editedBy: locals.userId,
      changes
    });
  }

  const [updated] = await db
    .update(scheduledTasks)
    .set({
      agentId: body.agentId ?? existing.agentId,
      promptTemplate: body.promptTemplate ?? existing.promptTemplate,
      cronExpression: newCronExpression,
      schedulePreset: newPreset,
      timezone: newTimezone,
      sessionMode: body.sessionMode ?? existing.sessionMode,
      enabled: body.enabled !== undefined ? body.enabled : existing.enabled,
      nextRunAt: newNextRunAt,
      updatedBy: locals.userId,
      updatedAt: new Date()
    })
    .where(eq(scheduledTasks.id, params.id))
    .returning();

  const isEnabled = updated.enabled;
  if (isEnabled) {
    updateTask(updated.id, updated.cronExpression, updated.timezone);
  } else {
    removeTask(updated.id);
  }

  return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const [existing] = await db
    .select({ id: scheduledTasks.id })
    .from(scheduledTasks)
    .where(eq(scheduledTasks.id, params.id))
    .limit(1);

  if (!existing) return json({ error: 'Not found' }, { status: 404 });

  removeTask(params.id);

  await db.delete(scheduledTasks).where(eq(scheduledTasks.id, params.id));

  return json({ success: true });
};
