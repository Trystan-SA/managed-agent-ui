import cron, { type ScheduledTask } from 'node-cron';
import { CronExpressionParser } from 'cron-parser';
import { db } from './db';
import { scheduledTasks } from './db/schema';
import { eq, lt } from 'drizzle-orm';
import { executeTask } from './scheduler-executor';

const jobs = new Map<string, ScheduledTask>();
let initialized = false;

/** Max expected task duration — locks older than this are considered stale */
const STALE_LOCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export async function initScheduler(): Promise<void> {
  if (initialized) return;
  initialized = true;

  console.log('[scheduler] Initializing...');

  // Clear only stale locks (older than threshold, likely from a crash)
  const staleThreshold = new Date(Date.now() - STALE_LOCK_THRESHOLD_MS);
  await db
    .update(scheduledTasks)
    .set({ lockedAt: null })
    .where(lt(scheduledTasks.lockedAt, staleThreshold));

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
 * Uses cron-parser for correct timezone-aware calculation.
 */
export function computeNextRun(cronExpression: string, timezone: string): Date {
  try {
    const interval = CronExpressionParser.parse(cronExpression, {
      tz: timezone,
      currentDate: new Date()
    });
    return interval.next().toDate();
  } catch {
    // Fallback: 1 minute from now if expression is invalid
    return new Date(Date.now() + 60000);
  }
}
