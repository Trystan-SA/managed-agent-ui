import cron, { type ScheduledTask } from 'node-cron';
import { db } from './db';
import { scheduledTasks } from './db/schema';
import { eq, isNotNull } from 'drizzle-orm';
import { executeTask } from './scheduler-executor';

const jobs = new Map<string, ScheduledTask>();
let initialized = false;

export async function initScheduler(): Promise<void> {
  if (initialized) return;
  initialized = true;

  console.log('[scheduler] Initializing...');

  // Clear any stale locks (from previous crash)
  await db
    .update(scheduledTasks)
    .set({ lockedAt: null })
    .where(isNotNull(scheduledTasks.lockedAt));

  // Load all enabled tasks
  const tasks = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.enabled, true));

  for (const task of tasks) {
    registerJob(task.id, task.cronExpression, task.timezone);
  }

  // Check for missed runs
  const now = new Date();
  const missedTasks = tasks.filter(t => t.nextRunAt && t.nextRunAt < now);
  for (const task of missedTasks) {
    console.log(`[scheduler] Missed run for task ${task.id}, executing now`);
    executeTask(task.id).catch(err =>
      console.error(`[scheduler] Catch-up failed for ${task.id}:`, err)
    );
  }

  console.log(`[scheduler] Started with ${tasks.length} tasks (${missedTasks.length} catch-up runs)`);
}

function registerJob(taskId: string, cronExpression: string, timezone: string): void {
  const existing = jobs.get(taskId);
  if (existing) {
    existing.stop();
    jobs.delete(taskId);
  }

  if (!cron.validate(cronExpression)) {
    console.error(`[scheduler] Invalid cron expression for task ${taskId}: ${cronExpression}`);
    return;
  }

  const job = cron.schedule(cronExpression, () => {
    executeTask(taskId).catch(err =>
      console.error(`[scheduler] Execution failed for ${taskId}:`, err)
    );
  }, { timezone });

  jobs.set(taskId, job);
}

export function addTask(taskId: string, cronExpression: string, timezone: string): void {
  registerJob(taskId, cronExpression, timezone);
}

export function updateTask(taskId: string, cronExpression: string, timezone: string): void {
  registerJob(taskId, cronExpression, timezone);
}

export function removeTask(taskId: string): void {
  const job = jobs.get(taskId);
  if (job) {
    job.stop();
    jobs.delete(taskId);
  }
}

export function triggerNow(taskId: string): void {
  executeTask(taskId).catch(err =>
    console.error(`[scheduler] Manual trigger failed for ${taskId}:`, err)
  );
}

export function stopScheduler(): void {
  for (const [, job] of jobs) {
    job.stop();
  }
  jobs.clear();
  initialized = false;
  console.log('[scheduler] Stopped');
}

// Graceful shutdown
process.on('SIGTERM', stopScheduler);
process.on('SIGINT', stopScheduler);

/**
 * Compute the next run time for a cron expression in a given timezone.
 */
export function computeNextRun(cronExpression: string, timezone: string): Date {
  const now = new Date();
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) return new Date(now.getTime() + 60000);

  const [minute, hour, dayOfMonth, , dayOfWeek] = parts;

  // Convert current time to target timezone for comparison
  const tzNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

  const next = new Date(now);

  if (minute.startsWith('*/')) {
    const interval = parseInt(minute.slice(2)) * 60 * 1000;
    return new Date(now.getTime() + interval);
  }

  if (hour.startsWith('*/')) {
    const interval = parseInt(hour.slice(2)) * 60 * 60 * 1000;
    return new Date(now.getTime() + interval);
  }

  const targetMinute = minute === '*' ? tzNow.getMinutes() : parseInt(minute);
  const targetHour = hour === '*' ? tzNow.getHours() : parseInt(hour);

  next.setSeconds(0, 0);

  if (hour !== '*') {
    next.setHours(targetHour, targetMinute, 0, 0);
  } else {
    next.setMinutes(targetMinute, 0, 0);
    if (next <= now) next.setHours(next.getHours() + 1);
  }

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  // Handle day-of-week constraints
  if (dayOfWeek !== '*') {
    const targetDays = dayOfWeek.includes('-')
      ? expandRange(dayOfWeek)
      : [parseInt(dayOfWeek)];

    while (!targetDays.includes(next.getDay())) {
      next.setDate(next.getDate() + 1);
    }
  }

  // Handle day-of-month constraints
  if (dayOfMonth !== '*') {
    const targetDay = parseInt(dayOfMonth);
    next.setDate(targetDay);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  }

  return next;
}

function expandRange(range: string): number[] {
  const [start, end] = range.split('-').map(Number);
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}
