import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks, users } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  try {
    const rows = await db
      .select({
        id: scheduledTasks.id,
        name: scheduledTasks.name,
        description: scheduledTasks.description,
        schedulePreset: scheduledTasks.schedulePreset,
        cronExpression: scheduledTasks.cronExpression,
        timezone: scheduledTasks.timezone,
        sessionMode: scheduledTasks.sessionMode,
        enabled: scheduledTasks.enabled,
        runCount: scheduledTasks.runCount,
        nextRunAt: scheduledTasks.nextRunAt,
        lastRunAt: scheduledTasks.lastRunAt,
        createdAt: scheduledTasks.createdAt,
        creatorEmail: users.email
      })
      .from(scheduledTasks)
      .leftJoin(users, eq(scheduledTasks.createdBy, users.id))
      .orderBy(desc(scheduledTasks.createdAt));

    const tasks = rows.map((row) => ({
      ...row,
      nextRunAt: row.nextRunAt?.toISOString() ?? null,
      lastRunAt: row.lastRunAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString()
    }));

    return { tasks };
  } catch (e: unknown) {
    console.error('[scheduled-tasks/list]', e);
    return { tasks: [] };
  }
};
