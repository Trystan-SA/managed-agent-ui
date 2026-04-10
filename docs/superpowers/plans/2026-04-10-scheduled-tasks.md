# Scheduled Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-process CRON scheduler that automatically launches AI agent tasks on user-defined schedules, storing execution results in a browsable history.

**Architecture:** In-process `node-cron` scheduler running inside the existing SvelteKit Node process. Tasks are stored in Postgres via Drizzle ORM. On each tick, the scheduler acquires a DB lock, renders the prompt template, creates/resumes an Anthropic session, sends the prompt, collects the response, and logs the execution. API routes manage CRUD, UI pages provide task management and execution history browsing.

**Tech Stack:** node-cron, Drizzle ORM (Postgres), SvelteKit API routes, Svelte 5, SCSS

---

## File Structure

```
src/lib/server/
├── db/schema.ts                          # MODIFY — add 3 new tables
├── scheduler.ts                          # CREATE — scheduler engine
├── scheduler-executor.ts                 # CREATE — task execution logic
├── template.ts                           # CREATE — prompt template rendering

src/routes/api/scheduled-tasks/
├── +server.ts                            # CREATE — GET list, POST create
├── [id]/
│   ├── +server.ts                        # CREATE — GET detail, PUT update, DELETE
│   ├── toggle/+server.ts                 # CREATE — POST enable/disable
│   ├── run/+server.ts                    # CREATE — POST manual trigger
│   ├── executions/+server.ts             # CREATE — GET execution history
│   └── history/+server.ts               # CREATE — GET edit history

src/routes/scheduled-tasks/
├── +page.server.ts                       # CREATE — load task list
├── +page.svelte                          # CREATE — task list page
├── new/
│   ├── +page.server.ts                   # CREATE — load agents/envs for form
│   └── +page.svelte                      # CREATE — create task form
├── [id]/
│   ├── +page.server.ts                   # CREATE — load task detail + executions
│   ├── +page.svelte                      # CREATE — task detail page
│   └── edit/
│       ├── +page.server.ts               # CREATE — load task for editing
│       └── +page.svelte                  # CREATE — edit task form

src/components/
├── SchedulePresetPicker.svelte           # CREATE — preset selector component
├── PromptTemplateEditor.svelte           # CREATE — template editor with variable buttons

src/hooks.server.ts                       # MODIFY — init scheduler on startup
src/components/Nav.svelte                 # MODIFY — add nav link

tests/
├── lib/server/template.test.ts           # CREATE — template rendering tests
├── lib/server/scheduler.test.ts          # CREATE — scheduler unit tests
```

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install node-cron and its types**

```bash
npm install node-cron
npm install -D @types/node-cron
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('node-cron'); console.log('node-cron OK')"
```

Expected: `node-cron OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add node-cron dependency for scheduled tasks"
```

---

### Task 2: Database Schema — 3 New Tables

**Files:**
- Modify: `src/lib/server/db/schema.ts`

- [ ] **Step 1: Add the `scheduledTasks` table to schema.ts**

Add after the `userPreferences` table at the bottom of the file. Import `jsonb` from `drizzle-orm/pg-core` in the existing import statement:

```typescript
import { pgTable, uuid, text, boolean, integer, timestamp, customType, unique, jsonb } from 'drizzle-orm/pg-core';
```

Then add:

```typescript
export const scheduledTasks = pgTable('scheduled_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  agentId: text('agent_id').notNull(),
  environmentId: text('environment_id').notNull(),
  promptTemplate: text('prompt_template').notNull(),
  cronExpression: text('cron_expression').notNull(),
  schedulePreset: text('schedule_preset').notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  sessionMode: text('session_mode').notNull().default('new_session'),
  activeSessionId: text('active_session_id'),
  enabled: boolean('enabled').notNull().default(true),
  lockedAt: timestamp('locked_at'),
  nextRunAt: timestamp('next_run_at').notNull(),
  lastRunAt: timestamp('last_run_at'),
  runCount: integer('run_count').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const taskExecutions = pgTable('task_executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => scheduledTasks.id, { onDelete: 'cascade' }).notNull(),
  sessionId: text('session_id'),
  status: text('status').notNull().default('running'),
  promptSent: text('prompt_sent').notNull(),
  response: text('response'),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms')
});

export const taskEditHistory = pgTable('task_edit_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => scheduledTasks.id, { onDelete: 'cascade' }).notNull(),
  editedBy: uuid('edited_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  changes: jsonb('changes').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
```

- [ ] **Step 2: Push schema to database**

```bash
npx drizzle-kit push --force
```

Expected: Tables `scheduled_tasks`, `task_executions`, `task_edit_history` created.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/db/schema.ts drizzle/
git commit -m "feat(db): add scheduled_tasks, task_executions, task_edit_history tables"
```

---

### Task 3: Prompt Template Renderer

**Files:**
- Create: `src/lib/server/template.ts`
- Create: `tests/lib/server/template.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/server/template.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderTemplate } from '$lib/server/template';

describe('renderTemplate', () => {
  it('replaces {{date}} with YYYY-MM-DD in given timezone', () => {
    const result = renderTemplate('Report for {{date}}', {
      timezone: 'UTC',
      runNumber: 1,
      taskName: 'Test'
    });
    // Should match ISO date format
    expect(result).toMatch(/Report for \d{4}-\d{2}-\d{2}/);
  });

  it('replaces {{time}} with HH:mm', () => {
    const result = renderTemplate('Run at {{time}}', {
      timezone: 'UTC',
      runNumber: 1,
      taskName: 'Test'
    });
    expect(result).toMatch(/Run at \d{2}:\d{2}/);
  });

  it('replaces {{datetime}} with full ISO datetime', () => {
    const result = renderTemplate('Generated {{datetime}}', {
      timezone: 'UTC',
      runNumber: 1,
      taskName: 'Test'
    });
    expect(result).toMatch(/Generated \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('replaces {{run_number}} with the run count', () => {
    const result = renderTemplate('Run #{{run_number}}', {
      timezone: 'UTC',
      runNumber: 42,
      taskName: 'Test'
    });
    expect(result).toBe('Run #42');
  });

  it('replaces {{task_name}} with the task name', () => {
    const result = renderTemplate('Task: {{task_name}}', {
      timezone: 'UTC',
      runNumber: 1,
      taskName: 'Daily Sales Report'
    });
    expect(result).toBe('Task: Daily Sales Report');
  });

  it('handles multiple variables in one template', () => {
    const result = renderTemplate('{{task_name}} run #{{run_number}} on {{date}}', {
      timezone: 'UTC',
      runNumber: 5,
      taskName: 'My Task'
    });
    expect(result).toMatch(/My Task run #5 on \d{4}-\d{2}-\d{2}/);
  });

  it('leaves unknown variables untouched', () => {
    const result = renderTemplate('Hello {{unknown}}', {
      timezone: 'UTC',
      runNumber: 1,
      taskName: 'Test'
    });
    expect(result).toBe('Hello {{unknown}}');
  });

  it('handles template with no variables', () => {
    const result = renderTemplate('Plain prompt with no vars', {
      timezone: 'UTC',
      runNumber: 1,
      taskName: 'Test'
    });
    expect(result).toBe('Plain prompt with no vars');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/server/template.test.ts
```

Expected: FAIL — module `$lib/server/template` not found.

- [ ] **Step 3: Implement the template renderer**

Create `src/lib/server/template.ts`:

```typescript
interface TemplateContext {
  timezone: string;
  runNumber: number;
  taskName: string;
}

export function renderTemplate(template: string, ctx: TemplateContext): string {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ctx.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const dateParts = formatter.formatToParts(now);
  const year = dateParts.find(p => p.type === 'year')?.value ?? '';
  const month = dateParts.find(p => p.type === 'month')?.value ?? '';
  const day = dateParts.find(p => p.type === 'day')?.value ?? '';
  const dateStr = `${year}-${month}-${day}`;

  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ctx.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const timeStr = timeFormatter.format(now);

  const datetimeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ctx.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const dtParts = datetimeFormatter.formatToParts(now);
  const dtYear = dtParts.find(p => p.type === 'year')?.value ?? '';
  const dtMonth = dtParts.find(p => p.type === 'month')?.value ?? '';
  const dtDay = dtParts.find(p => p.type === 'day')?.value ?? '';
  const dtHour = dtParts.find(p => p.type === 'hour')?.value ?? '';
  const dtMinute = dtParts.find(p => p.type === 'minute')?.value ?? '';
  const dtSecond = dtParts.find(p => p.type === 'second')?.value ?? '';
  const datetimeStr = `${dtYear}-${dtMonth}-${dtDay}T${dtHour}:${dtMinute}:${dtSecond}`;

  const variables: Record<string, string> = {
    date: dateStr,
    time: timeStr,
    datetime: datetimeStr,
    run_number: String(ctx.runNumber),
    task_name: ctx.taskName
  };

  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return key in variables ? variables[key] : match;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/server/template.test.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/template.ts tests/lib/server/template.test.ts
git commit -m "feat(scheduler): add prompt template renderer with variable substitution"
```

---

### Task 4: Schedule Preset Utilities

**Files:**
- Create: `src/lib/schedule-presets.ts` (client-safe — used by both UI and server)

- [ ] **Step 1: Create the presets module**

Create `src/lib/schedule-presets.ts`:

```typescript
export interface SchedulePreset {
  key: string;
  label: string;
  cron: string | null; // null = needs user input for time/day
  needsTime: boolean;
  needsDay: boolean;
  needsDayOfMonth: boolean;
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  { key: 'every_15m', label: 'Every 15 minutes', cron: '*/15 * * * *', needsTime: false, needsDay: false, needsDayOfMonth: false },
  { key: 'every_30m', label: 'Every 30 minutes', cron: '*/30 * * * *', needsTime: false, needsDay: false, needsDayOfMonth: false },
  { key: 'every_1h', label: 'Every hour', cron: '0 * * * *', needsTime: false, needsDay: false, needsDayOfMonth: false },
  { key: 'every_2h', label: 'Every 2 hours', cron: '0 */2 * * *', needsTime: false, needsDay: false, needsDayOfMonth: false },
  { key: 'every_6h', label: 'Every 6 hours', cron: '0 */6 * * *', needsTime: false, needsDay: false, needsDayOfMonth: false },
  { key: 'daily', label: 'Daily at...', cron: null, needsTime: true, needsDay: false, needsDayOfMonth: false },
  { key: 'weekdays', label: 'Weekdays at...', cron: null, needsTime: true, needsDay: false, needsDayOfMonth: false },
  { key: 'weekly', label: 'Weekly on...', cron: null, needsTime: true, needsDay: true, needsDayOfMonth: false },
  { key: 'monthly', label: 'Monthly on...', cron: null, needsTime: true, needsDay: false, needsDayOfMonth: true }
];

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export function buildCronExpression(
  presetKey: string,
  hour?: number,
  minute?: number,
  dayOfWeek?: number,
  dayOfMonth?: number
): string {
  const preset = SCHEDULE_PRESETS.find(p => p.key === presetKey);
  if (!preset) throw new Error(`Unknown preset: ${presetKey}`);
  if (preset.cron) return preset.cron;

  const h = hour ?? 0;
  const m = minute ?? 0;

  switch (presetKey) {
    case 'daily':
      return `${m} ${h} * * *`;
    case 'weekdays':
      return `${m} ${h} * * 1-5`;
    case 'weekly':
      return `${m} ${h} * * ${dayOfWeek ?? 1}`;
    case 'monthly':
      return `${m} ${h} ${dayOfMonth ?? 1} * *`;
    default:
      throw new Error(`Unhandled preset: ${presetKey}`);
  }
}

export function getPresetLabel(presetKey: string): string {
  const preset = SCHEDULE_PRESETS.find(p => p.key === presetKey);
  return preset?.label ?? presetKey;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/schedule-presets.ts
git commit -m "feat(scheduler): add schedule preset definitions and cron builder"
```

---

### Task 5: Scheduler Engine

**Files:**
- Create: `src/lib/server/scheduler.ts`
- Create: `src/lib/server/scheduler-executor.ts`

- [ ] **Step 1: Create the task executor**

Create `src/lib/server/scheduler-executor.ts`:

```typescript
import { db } from './db';
import { scheduledTasks, taskExecutions } from './db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { createAnthropicClient } from './anthropic';
import { renderTemplate } from './template';

export async function executeTask(taskId: string): Promise<void> {
  // Acquire lock
  const lockResult = await db
    .update(scheduledTasks)
    .set({ lockedAt: new Date() })
    .where(and(eq(scheduledTasks.id, taskId), isNull(scheduledTasks.lockedAt)))
    .returning({ id: scheduledTasks.id });

  if (lockResult.length === 0) {
    console.log(`[scheduler] Task ${taskId} already locked, skipping`);
    return;
  }

  const startedAt = new Date();
  let executionId: string | undefined;

  try {
    // Load task
    const [task] = await db
      .select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.id, taskId))
      .limit(1);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Render prompt
    const prompt = renderTemplate(task.promptTemplate, {
      timezone: task.timezone,
      runNumber: task.runCount + 1,
      taskName: task.name
    });

    // Insert execution record
    const [execution] = await db
      .insert(taskExecutions)
      .values({
        taskId: task.id,
        status: 'running',
        promptSent: prompt,
        startedAt
      })
      .returning({ id: taskExecutions.id });

    executionId = execution.id;

    // Create or resume session
    const client = await createAnthropicClient();
    let sessionId: string;

    if (task.sessionMode === 'continue_session' && task.activeSessionId) {
      // Check if session is still usable
      try {
        const existing = await client.beta.sessions.retrieve(task.activeSessionId);
        if (existing.status === 'terminated') {
          // Session terminated, create new one
          const session = await client.beta.sessions.create({
            agent_id: task.agentId,
            environment_id: task.environmentId
          });
          sessionId = session.id;
        } else {
          sessionId = task.activeSessionId;
        }
      } catch {
        // Session not found, create new one
        const session = await client.beta.sessions.create({
          agent_id: task.agentId,
          environment_id: task.environmentId
        });
        sessionId = session.id;
      }
    } else {
      // New session each run
      const session = await client.beta.sessions.create({
        agent_id: task.agentId,
        environment_id: task.environmentId
      });
      sessionId = session.id;
    }

    // Update execution with session ID
    await db
      .update(taskExecutions)
      .set({ sessionId })
      .where(eq(taskExecutions.id, executionId));

    // Send message
    await client.beta.sessions.events.send(sessionId, {
      type: 'user_message',
      content: prompt
    });

    // Wait for response by streaming events until idle/terminated
    let responseText = '';
    const stream = await client.beta.sessions.events.stream(sessionId);
    for await (const event of stream) {
      if (event.type === 'text_delta' && 'delta' in event) {
        responseText += (event as Record<string, unknown>).delta ?? '';
      }
      if (event.type === 'content_block_delta' && 'delta' in event) {
        const delta = (event as Record<string, unknown>).delta as Record<string, unknown> | undefined;
        if (delta && 'text' in delta) {
          responseText += delta.text ?? '';
        }
      }
      if (event.type === 'session.status_idle' || event.type === 'session.status_terminated') {
        break;
      }
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    // Update execution as completed
    await db
      .update(taskExecutions)
      .set({
        status: 'completed',
        response: responseText,
        sessionId,
        completedAt,
        durationMs
      })
      .where(eq(taskExecutions.id, executionId));

    // Update task metadata
    await db
      .update(scheduledTasks)
      .set({
        lastRunAt: startedAt,
        runCount: task.runCount + 1,
        activeSessionId: task.sessionMode === 'continue_session' ? sessionId : null,
        lockedAt: null,
        updatedAt: new Date()
      })
      .where(eq(scheduledTasks.id, taskId));

    console.log(`[scheduler] Task "${task.name}" completed in ${durationMs}ms`);
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error(`[scheduler] Task ${taskId} failed:`, errorMsg);

    // Update execution as failed
    if (executionId) {
      const completedAt = new Date();
      await db
        .update(taskExecutions)
        .set({
          status: 'failed',
          error: errorMsg,
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime()
        })
        .where(eq(taskExecutions.id, executionId));
    }

    // Release lock
    await db
      .update(scheduledTasks)
      .set({ lockedAt: null, updatedAt: new Date() })
      .where(eq(scheduledTasks.id, taskId));
  }
}
```

- [ ] **Step 2: Create the scheduler engine**

Create `src/lib/server/scheduler.ts`:

```typescript
import cron from 'node-cron';
import { db } from './db';
import { scheduledTasks } from './db/schema';
import { eq, and, lt, isNull } from 'drizzle-orm';
import { executeTask } from './scheduler-executor';

const jobs = new Map<string, cron.ScheduledTask>();
let initialized = false;

export async function initScheduler(): Promise<void> {
  if (initialized) return;
  initialized = true;

  console.log('[scheduler] Initializing...');

  // Clear any stale locks (from previous crash)
  await db
    .update(scheduledTasks)
    .set({ lockedAt: null })
    .where(isNull(scheduledTasks.lockedAt).not());

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
    console.log(`[scheduler] Missed run for "${task.name}", executing now`);
    executeTask(task.id).catch(err =>
      console.error(`[scheduler] Catch-up failed for ${task.id}:`, err)
    );
  }

  console.log(`[scheduler] Started with ${tasks.length} tasks (${missedTasks.length} catch-up runs)`);
}

function registerJob(taskId: string, cronExpression: string, timezone: string): void {
  // Remove existing job if any
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
  for (const [id, job] of jobs) {
    job.stop();
    jobs.delete(id);
  }
  initialized = false;
  console.log('[scheduler] Stopped');
}

// Graceful shutdown
process.on('SIGTERM', stopScheduler);
process.on('SIGINT', stopScheduler);
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/scheduler.ts src/lib/server/scheduler-executor.ts
git commit -m "feat(scheduler): add scheduler engine and task executor"
```

---

### Task 6: Initialize Scheduler on App Startup

**Files:**
- Modify: `src/hooks.server.ts`

- [ ] **Step 1: Add scheduler init to hooks.server.ts**

Add the import at the top of the file:

```typescript
import { initScheduler } from '$lib/server/scheduler';
```

Add this call right before the `export const handle` line:

```typescript
// Initialize the scheduler (runs once on first import)
initScheduler().catch(err => console.error('[scheduler] Init failed:', err));
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks.server.ts
git commit -m "feat(scheduler): initialize scheduler on app startup via hooks"
```

---

### Task 7: Cron Next-Run Calculator

**Files:**
- Modify: `src/lib/server/scheduler.ts` (add helper)

- [ ] **Step 1: Add `computeNextRun` function to scheduler.ts**

Add at the bottom of `src/lib/server/scheduler.ts`, before the `process.on` lines:

```typescript
/**
 * Compute the next run time for a cron expression in a given timezone.
 * Uses node-cron's internal scheduler to figure out the next tick.
 */
export function computeNextRun(cronExpression: string, timezone: string): Date {
  // node-cron doesn't expose a "next run" API, so we calculate manually
  // by parsing the cron expression fields
  const now = new Date();
  // Create a temporary scheduled task and get the next date
  // Simple approach: use the cron-parser logic
  // For now, estimate based on cron fields
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) return new Date(now.getTime() + 60000);

  const [minute, hour, dayOfMonth, _month, dayOfWeek] = parts;

  const next = new Date(now);
  // Convert to timezone
  const tzDate = new Date(next.toLocaleString('en-US', { timeZone: timezone }));

  if (minute.startsWith('*/')) {
    // Interval-based (e.g., */15, */30)
    const interval = parseInt(minute.slice(2)) * 60 * 1000;
    return new Date(now.getTime() + interval);
  }

  const targetMinute = minute === '*' ? tzDate.getMinutes() : parseInt(minute);
  const targetHour = hour === '*' ? tzDate.getHours() : hour.startsWith('*/') ? tzDate.getHours() + parseInt(hour.slice(2)) : parseInt(hour);

  next.setSeconds(0, 0);

  // Set target time
  if (hour !== '*' && !hour.startsWith('*/')) {
    next.setHours(targetHour, targetMinute, 0, 0);
  } else if (hour.startsWith('*/')) {
    const interval = parseInt(hour.slice(2));
    const nextHour = Math.ceil((tzDate.getHours() + 1) / interval) * interval;
    next.setHours(nextHour, targetMinute, 0, 0);
  } else {
    next.setMinutes(targetMinute, 0, 0);
    if (next <= now) next.setHours(next.getHours() + 1);
  }

  // If the computed time is in the past, advance by one day
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/scheduler.ts
git commit -m "feat(scheduler): add cron next-run time calculator"
```

---

### Task 8: API Routes — CRUD

**Files:**
- Create: `src/routes/api/scheduled-tasks/+server.ts`
- Create: `src/routes/api/scheduled-tasks/[id]/+server.ts`

- [ ] **Step 1: Create the list + create route**

Create `src/routes/api/scheduled-tasks/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks, users } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
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
      cronExpression: scheduledTasks.cronExpression,
      schedulePreset: scheduledTasks.schedulePreset,
      timezone: scheduledTasks.timezone,
      sessionMode: scheduledTasks.sessionMode,
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

  const body = await request.json();
  const { name, description, agentId, environmentId, promptTemplate, schedulePreset, timezone, sessionMode, hour, minute, dayOfWeek, dayOfMonth } = body;

  if (!name || !agentId || !environmentId || !promptTemplate || !schedulePreset) {
    return json({ error: 'Missing required fields' }, { status: 400 });
  }

  const cronExpression = buildCronExpression(schedulePreset, hour, minute, dayOfWeek, dayOfMonth);
  const nextRunAt = computeNextRun(cronExpression, timezone ?? 'UTC');

  const [task] = await db
    .insert(scheduledTasks)
    .values({
      name,
      description: description ?? null,
      agentId,
      environmentId,
      promptTemplate,
      cronExpression,
      schedulePreset,
      timezone: timezone ?? 'UTC',
      sessionMode: sessionMode ?? 'new_session',
      enabled: true,
      nextRunAt,
      createdBy: locals.userId
    })
    .returning();

  // Register with the in-process scheduler
  addTask(task.id, cronExpression, task.timezone);

  return json(task, { status: 201 });
};
```

- [ ] **Step 2: Create the detail + update + delete route**

Create `src/routes/api/scheduled-tasks/[id]/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks, taskExecutions, taskEditHistory } from '$lib/server/db/schema';
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

  if (!task) return json({ error: 'Task not found' }, { status: 404 });

  return json(task);
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const [existing] = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.id, params.id))
    .limit(1);

  if (!existing) return json({ error: 'Task not found' }, { status: 404 });

  const body = await request.json();
  const { name, description, agentId, environmentId, promptTemplate, schedulePreset, timezone, sessionMode, hour, minute, dayOfWeek, dayOfMonth } = body;

  // Build changes diff for edit history
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (name !== undefined && name !== existing.name) changes.name = { from: existing.name, to: name };
  if (description !== undefined && description !== existing.description) changes.description = { from: existing.description, to: description };
  if (agentId !== undefined && agentId !== existing.agentId) changes.agentId = { from: existing.agentId, to: agentId };
  if (environmentId !== undefined && environmentId !== existing.environmentId) changes.environmentId = { from: existing.environmentId, to: environmentId };
  if (promptTemplate !== undefined && promptTemplate !== existing.promptTemplate) changes.promptTemplate = { from: existing.promptTemplate, to: promptTemplate };
  if (schedulePreset !== undefined && schedulePreset !== existing.schedulePreset) changes.schedulePreset = { from: existing.schedulePreset, to: schedulePreset };
  if (sessionMode !== undefined && sessionMode !== existing.sessionMode) changes.sessionMode = { from: existing.sessionMode, to: sessionMode };

  // Record edit history if there are changes
  if (Object.keys(changes).length > 0) {
    await db.insert(taskEditHistory).values({
      taskId: params.id,
      editedBy: locals.userId,
      changes
    });
  }

  // Recompute cron if schedule changed
  const newPreset = schedulePreset ?? existing.schedulePreset;
  const newTimezone = timezone ?? existing.timezone;
  const cronExpression = schedulePreset
    ? buildCronExpression(newPreset, hour, minute, dayOfWeek, dayOfMonth)
    : existing.cronExpression;
  const nextRunAt = schedulePreset
    ? computeNextRun(cronExpression, newTimezone)
    : existing.nextRunAt;

  const [updated] = await db
    .update(scheduledTasks)
    .set({
      name: name ?? existing.name,
      description: description !== undefined ? description : existing.description,
      agentId: agentId ?? existing.agentId,
      environmentId: environmentId ?? existing.environmentId,
      promptTemplate: promptTemplate ?? existing.promptTemplate,
      cronExpression,
      schedulePreset: newPreset,
      timezone: newTimezone,
      sessionMode: sessionMode ?? existing.sessionMode,
      nextRunAt,
      updatedBy: locals.userId,
      updatedAt: new Date()
    })
    .where(eq(scheduledTasks.id, params.id))
    .returning();

  // Update the in-process scheduler
  if (updated.enabled) {
    updateTask(updated.id, updated.cronExpression, updated.timezone);
  }

  return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const [task] = await db
    .select({ id: scheduledTasks.id })
    .from(scheduledTasks)
    .where(eq(scheduledTasks.id, params.id))
    .limit(1);

  if (!task) return json({ error: 'Task not found' }, { status: 404 });

  // Remove from scheduler first
  removeTask(params.id);

  // Delete cascades to executions and edit history
  await db.delete(scheduledTasks).where(eq(scheduledTasks.id, params.id));

  return json({ success: true });
};
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/scheduled-tasks/+server.ts src/routes/api/scheduled-tasks/[id]/+server.ts
git commit -m "feat(api): add scheduled tasks CRUD routes"
```

---

### Task 9: API Routes — Toggle, Run Now, Executions, History

**Files:**
- Create: `src/routes/api/scheduled-tasks/[id]/toggle/+server.ts`
- Create: `src/routes/api/scheduled-tasks/[id]/run/+server.ts`
- Create: `src/routes/api/scheduled-tasks/[id]/executions/+server.ts`
- Create: `src/routes/api/scheduled-tasks/[id]/history/+server.ts`

- [ ] **Step 1: Create toggle route**

Create `src/routes/api/scheduled-tasks/[id]/toggle/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { addTask, removeTask } from '$lib/server/scheduler';

export const POST: RequestHandler = async ({ params, locals }) => {
  if (!locals.userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const [task] = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.id, params.id))
    .limit(1);

  if (!task) return json({ error: 'Task not found' }, { status: 404 });

  const newEnabled = !task.enabled;

  const [updated] = await db
    .update(scheduledTasks)
    .set({ enabled: newEnabled, updatedBy: locals.userId, updatedAt: new Date() })
    .where(eq(scheduledTasks.id, params.id))
    .returning();

  if (newEnabled) {
    addTask(updated.id, updated.cronExpression, updated.timezone);
  } else {
    removeTask(updated.id);
  }

  return json(updated);
};
```

- [ ] **Step 2: Create run-now route**

Create `src/routes/api/scheduled-tasks/[id]/run/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { triggerNow } from '$lib/server/scheduler';

export const POST: RequestHandler = async ({ params, locals }) => {
  if (!locals.userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const [task] = await db
    .select({ id: scheduledTasks.id })
    .from(scheduledTasks)
    .where(eq(scheduledTasks.id, params.id))
    .limit(1);

  if (!task) return json({ error: 'Task not found' }, { status: 404 });

  triggerNow(params.id);

  return json({ success: true, message: 'Task triggered' });
};
```

- [ ] **Step 3: Create executions list route**

Create `src/routes/api/scheduled-tasks/[id]/executions/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { taskExecutions } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals, url }) => {
  if (!locals.userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const limit = parseInt(url.searchParams.get('limit') ?? '50');
  const offset = parseInt(url.searchParams.get('offset') ?? '0');

  const executions = await db
    .select()
    .from(taskExecutions)
    .where(eq(taskExecutions.taskId, params.id))
    .orderBy(desc(taskExecutions.startedAt))
    .limit(limit)
    .offset(offset);

  return json(executions);
};
```

- [ ] **Step 4: Create edit history route**

Create `src/routes/api/scheduled-tasks/[id]/history/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { taskEditHistory, users } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const history = await db
    .select({
      id: taskEditHistory.id,
      taskId: taskEditHistory.taskId,
      editedBy: taskEditHistory.editedBy,
      editorEmail: users.email,
      changes: taskEditHistory.changes,
      createdAt: taskEditHistory.createdAt
    })
    .from(taskEditHistory)
    .leftJoin(users, eq(taskEditHistory.editedBy, users.id))
    .where(eq(taskEditHistory.taskId, params.id))
    .orderBy(desc(taskEditHistory.createdAt));

  return json(history);
};
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/scheduled-tasks/[id]/toggle/+server.ts src/routes/api/scheduled-tasks/[id]/run/+server.ts src/routes/api/scheduled-tasks/[id]/executions/+server.ts src/routes/api/scheduled-tasks/[id]/history/+server.ts
git commit -m "feat(api): add toggle, run-now, executions, and history routes"
```

---

### Task 10: Navigation Update

**Files:**
- Modify: `src/components/Nav.svelte`

- [ ] **Step 1: Add "Scheduled" link to the nav**

In `src/components/Nav.svelte`, add a new entry to the `navLinks` array after the Sessions entry:

```typescript
  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/agents', label: 'Agents' },
    { href: '/environments', label: 'Environments' },
    { href: '/sessions', label: 'Sessions' },
    { href: '/scheduled-tasks', label: 'Scheduled' },
    { href: '/chat', label: 'Chat' }
  ];
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Nav.svelte
git commit -m "feat(nav): add Scheduled Tasks link to navigation"
```

---

### Task 11: UI — Task List Page

**Files:**
- Create: `src/routes/scheduled-tasks/+page.server.ts`
- Create: `src/routes/scheduled-tasks/+page.svelte`

- [ ] **Step 1: Create page server load**

Create `src/routes/scheduled-tasks/+page.server.ts`:

```typescript
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks, users } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  try {
    const tasks = await db
      .select({
        id: scheduledTasks.id,
        name: scheduledTasks.name,
        description: scheduledTasks.description,
        agentId: scheduledTasks.agentId,
        environmentId: scheduledTasks.environmentId,
        schedulePreset: scheduledTasks.schedulePreset,
        cronExpression: scheduledTasks.cronExpression,
        timezone: scheduledTasks.timezone,
        sessionMode: scheduledTasks.sessionMode,
        enabled: scheduledTasks.enabled,
        nextRunAt: scheduledTasks.nextRunAt,
        lastRunAt: scheduledTasks.lastRunAt,
        runCount: scheduledTasks.runCount,
        createdBy: scheduledTasks.createdBy,
        creatorEmail: users.email,
        createdAt: scheduledTasks.createdAt
      })
      .from(scheduledTasks)
      .leftJoin(users, eq(scheduledTasks.createdBy, users.id))
      .orderBy(desc(scheduledTasks.createdAt));

    return { tasks: tasks.map(t => ({ ...t, nextRunAt: t.nextRunAt?.toISOString(), lastRunAt: t.lastRunAt?.toISOString(), createdAt: t.createdAt?.toISOString() })) };
  } catch (e: unknown) {
    console.error('[scheduled-tasks/list]', e);
    return { tasks: [] };
  }
};
```

- [ ] **Step 2: Create the task list page component**

Create `src/routes/scheduled-tasks/+page.svelte`:

```svelte
<script lang="ts">
  import EmptyState from '$components/EmptyState.svelte';
  import { getPresetLabel } from '$lib/schedule-presets';

  const { data } = $props();

  let confirmDelete = $state<string | null>(null);

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  async function toggleTask(id: string) {
    await fetch(`/api/scheduled-tasks/${id}/toggle`, { method: 'POST' });
    window.location.reload();
  }

  async function runNow(id: string) {
    await fetch(`/api/scheduled-tasks/${id}/run`, { method: 'POST' });
    window.location.reload();
  }

  async function deleteTask() {
    if (!confirmDelete) return;
    await fetch(`/api/scheduled-tasks/${confirmDelete}`, { method: 'DELETE' });
    confirmDelete = null;
    window.location.reload();
  }
</script>

<svelte:head>
  <title>Scheduled Tasks | Managed Agents</title>
</svelte:head>

{#if confirmDelete}
  <div class="confirm-backdrop" onclick={() => (confirmDelete = null)} role="presentation">
    <div class="confirm-modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (confirmDelete = null)}>
      <p class="confirm-modal__text">Delete this scheduled task? All execution history will be lost.</p>
      <div class="confirm-modal__actions">
        <button class="confirm-modal__btn confirm-modal__btn--cancel" onclick={() => (confirmDelete = null)}>Cancel</button>
        <button class="confirm-modal__btn confirm-modal__btn--danger" onclick={deleteTask}>Delete</button>
      </div>
    </div>
  </div>
{/if}

<div class="tasks-page">
  <div class="tasks-page__header">
    <div>
      <h1 class="tasks-page__title">Scheduled Tasks</h1>
      <p class="tasks-page__subtitle">
        {data.tasks.length} task{data.tasks.length !== 1 ? 's' : ''}
      </p>
    </div>
    <a href="/scheduled-tasks/new" class="btn-new">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      New Task
    </a>
  </div>

  {#if data.tasks.length === 0}
    <EmptyState
      icon=""
      title="No scheduled tasks yet."
      description="Create a scheduled task to automatically run agent prompts on a schedule."
      actionHref="/scheduled-tasks/new"
      actionLabel="Create task"
    />
  {:else}
    <div class="task-list">
      {#each data.tasks as task (task.id)}
        <div class="task-row" class:task-row--disabled={!task.enabled}>
          <a href="/scheduled-tasks/{task.id}" class="task-row__main">
            <div class="task-row__left">
              <span class="task-row__status" data-enabled={task.enabled}></span>
              <div class="task-row__info">
                <span class="task-row__name">{task.name}</span>
                <span class="task-row__schedule">{getPresetLabel(task.schedulePreset)} &middot; {task.sessionMode === 'continue_session' ? 'Continues session' : 'New session'}</span>
              </div>
            </div>
            <div class="task-row__right">
              <div class="task-row__meta">
                <span class="task-row__runs">{task.runCount} runs</span>
                <span class="task-row__next">Next: {formatDate(task.nextRunAt)}</span>
              </div>
              <span class="task-row__creator">{task.creatorEmail}</span>
            </div>
          </a>
          <div class="task-row__actions">
            <button class="action-btn" title={task.enabled ? 'Disable' : 'Enable'} onclick={() => toggleTask(task.id)}>
              {#if task.enabled}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              {:else}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M5 3l8 5-8 5V3z" fill="currentColor"/></svg>
              {/if}
            </button>
            <button class="action-btn" title="Run now" onclick={() => runNow(task.id)}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M5 3l8 5-8 5V3z" fill="currentColor"/></svg>
            </button>
            <a href="/scheduled-tasks/{task.id}/edit" class="action-btn" title="Edit">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
            <button class="action-btn action-btn--danger" title="Delete" onclick={() => (confirmDelete = task.id)}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .tasks-page {
    &__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-6);
      margin-bottom: var(--space-8);
    }
    &__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      color: var(--text-primary);
      line-height: var(--leading-tight);
    }
    &__subtitle {
      font-size: var(--text-sm);
      color: var(--text-muted);
      margin-top: var(--space-2);
    }
  }

  .btn-new {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-6);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: #fff;
    background: var(--accent-primary);
    border: none;
    border-radius: var(--radius-md);
    text-decoration: none;
    flex-shrink: 0;
    transition: background var(--transition-fast), box-shadow var(--transition-fast);
    &:hover { background: var(--accent-primary-hover); box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25); }
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .task-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    transition: border-color var(--transition-fast);
    &:hover { border-color: var(--border-strong); }
    &--disabled { opacity: 0.6; }

    &__main {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-5);
      text-decoration: none;
    }
    &__left {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      min-width: 0;
    }
    &__status {
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);
      flex-shrink: 0;
      &[data-enabled='true'] { background: var(--accent-success); }
      &[data-enabled='false'] { background: var(--text-muted); }
    }
    &__info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    &__name {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    &__schedule {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
    &__right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      flex-shrink: 0;
    }
    &__meta {
      display: flex;
      gap: var(--space-4);
    }
    &__runs, &__next, &__creator {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
    &__actions {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding-right: var(--space-3);
      flex-shrink: 0;
    }
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
    text-decoration: none;
    &:hover { background: var(--surface-3); color: var(--text-primary); }
    &--danger:hover { background: var(--accent-danger-muted); color: var(--accent-danger); }
  }

  .confirm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .confirm-modal {
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-7);
    box-shadow: var(--shadow-lg);
    max-width: 400px;
    width: 90%;
    &__text { font-size: var(--text-sm); color: var(--text-secondary); line-height: var(--leading-relaxed); margin-bottom: var(--space-6); }
    &__actions { display: flex; justify-content: flex-end; gap: var(--space-3); }
    &__btn {
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      cursor: pointer;
      transition: background var(--transition-fast);
      &--cancel { background: var(--surface-2); color: var(--text-primary); border-color: var(--border-default); &:hover { background: var(--surface-3); } }
      &--danger { background: var(--accent-danger); color: #fff; &:hover { background: var(--accent-danger-hover); } }
    }
  }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/scheduled-tasks/+page.server.ts src/routes/scheduled-tasks/+page.svelte
git commit -m "feat(ui): add scheduled tasks list page"
```

---

### Task 12: UI — Schedule Preset Picker Component

**Files:**
- Create: `src/components/SchedulePresetPicker.svelte`

- [ ] **Step 1: Create the component**

Create `src/components/SchedulePresetPicker.svelte`:

```svelte
<script lang="ts">
  import { SCHEDULE_PRESETS, DAYS_OF_WEEK } from '$lib/schedule-presets';

  interface Props {
    preset: string;
    hour: number;
    minute: number;
    dayOfWeek: number;
    dayOfMonth: number;
    onchange: (values: { preset: string; hour: number; minute: number; dayOfWeek: number; dayOfMonth: number }) => void;
  }

  const { preset, hour, minute, dayOfWeek, dayOfMonth, onchange }: Props = $props();

  const selectedPreset = $derived(SCHEDULE_PRESETS.find(p => p.key === preset));

  function handlePresetChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    onchange({ preset: target.value, hour, minute, dayOfWeek, dayOfMonth });
  }

  function handleHourChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    onchange({ preset, hour: parseInt(target.value), minute, dayOfWeek, dayOfMonth });
  }

  function handleMinuteChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    onchange({ preset, hour, minute: parseInt(target.value), dayOfWeek, dayOfMonth });
  }

  function handleDayOfWeekChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    onchange({ preset, hour, minute, dayOfWeek: parseInt(target.value), dayOfMonth });
  }

  function handleDayOfMonthChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    onchange({ preset, hour, minute, dayOfWeek, dayOfMonth: parseInt(target.value) });
  }
</script>

<div class="schedule-picker">
  <div class="schedule-picker__field">
    <label class="schedule-picker__label" for="preset">Frequency</label>
    <select id="preset" class="schedule-picker__select" value={preset} onchange={handlePresetChange}>
      {#each SCHEDULE_PRESETS as p (p.key)}
        <option value={p.key}>{p.label}</option>
      {/each}
    </select>
  </div>

  {#if selectedPreset?.needsTime}
    <div class="schedule-picker__time">
      <div class="schedule-picker__field">
        <label class="schedule-picker__label" for="hour">Hour</label>
        <select id="hour" class="schedule-picker__select schedule-picker__select--sm" value={hour} onchange={handleHourChange}>
          {#each Array.from({ length: 24 }, (_, i) => i) as h (h)}
            <option value={h}>{String(h).padStart(2, '0')}</option>
          {/each}
        </select>
      </div>
      <span class="schedule-picker__colon">:</span>
      <div class="schedule-picker__field">
        <label class="schedule-picker__label" for="minute">Min</label>
        <select id="minute" class="schedule-picker__select schedule-picker__select--sm" value={minute} onchange={handleMinuteChange}>
          {#each [0, 15, 30, 45] as m (m)}
            <option value={m}>{String(m).padStart(2, '0')}</option>
          {/each}
        </select>
      </div>
    </div>
  {/if}

  {#if selectedPreset?.needsDay}
    <div class="schedule-picker__field">
      <label class="schedule-picker__label" for="dayOfWeek">Day</label>
      <select id="dayOfWeek" class="schedule-picker__select" value={dayOfWeek} onchange={handleDayOfWeekChange}>
        {#each DAYS_OF_WEEK as d (d.value)}
          <option value={d.value}>{d.label}</option>
        {/each}
      </select>
    </div>
  {/if}

  {#if selectedPreset?.needsDayOfMonth}
    <div class="schedule-picker__field">
      <label class="schedule-picker__label" for="dayOfMonth">Day of month</label>
      <select id="dayOfMonth" class="schedule-picker__select" value={dayOfMonth} onchange={handleDayOfMonthChange}>
        {#each Array.from({ length: 28 }, (_, i) => i + 1) as d (d)}
          <option value={d}>{d}</option>
        {/each}
      </select>
    </div>
  {/if}
</div>

<style lang="scss">
  .schedule-picker {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-4);

    &__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    &__label {
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    &__select {
      padding: var(--space-3) var(--space-4);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      &:focus { border-color: var(--border-focus); outline: none; box-shadow: 0 0 0 2px var(--accent-primary-muted); }
      &--sm { width: 72px; }
    }
    &__time {
      display: flex;
      align-items: flex-end;
      gap: var(--space-2);
    }
    &__colon {
      font-size: var(--text-lg);
      font-weight: var(--weight-bold);
      color: var(--text-muted);
      padding-bottom: var(--space-3);
    }
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SchedulePresetPicker.svelte
git commit -m "feat(ui): add SchedulePresetPicker component"
```

---

### Task 13: UI — Prompt Template Editor Component

**Files:**
- Create: `src/components/PromptTemplateEditor.svelte`

- [ ] **Step 1: Create the component**

Create `src/components/PromptTemplateEditor.svelte`:

```svelte
<script lang="ts">
  interface Props {
    value: string;
    onchange: (value: string) => void;
  }

  const { value, onchange }: Props = $props();

  const variables = [
    { key: '{{date}}', label: 'Date', description: 'YYYY-MM-DD' },
    { key: '{{time}}', label: 'Time', description: 'HH:mm' },
    { key: '{{datetime}}', label: 'DateTime', description: 'Full ISO' },
    { key: '{{run_number}}', label: 'Run #', description: 'Incrementing count' },
    { key: '{{task_name}}', label: 'Task Name', description: 'This task\'s name' }
  ];

  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  function insertVariable(variable: string) {
    if (!textareaEl) return;
    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;
    const newValue = value.slice(0, start) + variable + value.slice(end);
    onchange(newValue);
    // Restore cursor after the inserted variable
    requestAnimationFrame(() => {
      if (textareaEl) {
        textareaEl.selectionStart = textareaEl.selectionEnd = start + variable.length;
        textareaEl.focus();
      }
    });
  }

  function handleInput(e: Event) {
    onchange((e.target as HTMLTextAreaElement).value);
  }
</script>

<div class="template-editor">
  <div class="template-editor__toolbar">
    <span class="template-editor__toolbar-label">Insert variable:</span>
    {#each variables as v (v.key)}
      <button
        type="button"
        class="template-editor__var-btn"
        title={v.description}
        onclick={() => insertVariable(v.key)}
      >
        {v.label}
      </button>
    {/each}
  </div>
  <textarea
    bind:this={textareaEl}
    class="template-editor__textarea"
    {value}
    oninput={handleInput}
    rows="6"
    placeholder="Enter your prompt template... Use variables like {{date}} for dynamic content."
  ></textarea>
</div>

<style lang="scss">
  .template-editor {
    &__toolbar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      background: var(--surface-2);
      border: 1px solid var(--border-default);
      border-bottom: none;
      border-radius: var(--radius-md) var(--radius-md) 0 0;
    }
    &__toolbar-label {
      font-size: var(--text-xs);
      color: var(--text-muted);
      margin-right: var(--space-2);
    }
    &__var-btn {
      padding: var(--space-1) var(--space-3);
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--accent-primary);
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background var(--transition-fast), border-color var(--transition-fast);
      &:hover { background: var(--accent-primary-muted); border-color: var(--accent-primary); }
    }
    &__textarea {
      width: 100%;
      padding: var(--space-4);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: 0 0 var(--radius-md) var(--radius-md);
      resize: vertical;
      line-height: var(--leading-relaxed);
      &:focus { border-color: var(--border-focus); outline: none; box-shadow: 0 0 0 2px var(--accent-primary-muted); }
      &::placeholder { color: var(--text-muted); }
    }
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PromptTemplateEditor.svelte
git commit -m "feat(ui): add PromptTemplateEditor component with variable insertion"
```

---

### Task 14: UI — Create Task Page

**Files:**
- Create: `src/routes/scheduled-tasks/new/+page.server.ts`
- Create: `src/routes/scheduled-tasks/new/+page.svelte`

- [ ] **Step 1: Create page server load (fetches agents + environments)**

Create `src/routes/scheduled-tasks/new/+page.server.ts`:

```typescript
import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async () => {
  try {
    const client = await createAnthropicClient();

    const agents = [];
    for await (const agent of client.beta.agents.list()) {
      agents.push(JSON.parse(JSON.stringify(agent)));
    }

    const environments = [];
    for await (const env of client.beta.environments.list()) {
      environments.push(JSON.parse(JSON.stringify(env)));
    }

    return { agents, environments };
  } catch (e: unknown) {
    console.error('[scheduled-tasks/new]', e);
    return { agents: [], environments: [] };
  }
};
```

- [ ] **Step 2: Create the create task page**

Create `src/routes/scheduled-tasks/new/+page.svelte`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import SchedulePresetPicker from '$components/SchedulePresetPicker.svelte';
  import PromptTemplateEditor from '$components/PromptTemplateEditor.svelte';
  import { apiFetch } from '$lib/utils/api';

  const { data } = $props();

  let name = $state('');
  let description = $state('');
  let agentId = $state('');
  let environmentId = $state('');
  let promptTemplate = $state('');
  let sessionMode = $state('new_session');
  let preset = $state('daily');
  let hour = $state(8);
  let minute = $state(0);
  let dayOfWeek = $state(1);
  let dayOfMonth = $state(1);
  let timezone = $state(Intl.DateTimeFormat().resolvedOptions().timeZone);
  let saving = $state(false);
  let error = $state('');

  function handleScheduleChange(values: { preset: string; hour: number; minute: number; dayOfWeek: number; dayOfMonth: number }) {
    preset = values.preset;
    hour = values.hour;
    minute = values.minute;
    dayOfWeek = values.dayOfWeek;
    dayOfMonth = values.dayOfMonth;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!name || !agentId || !environmentId || !promptTemplate) {
      error = 'Please fill in all required fields.';
      return;
    }

    saving = true;
    error = '';

    try {
      const task = await apiFetch<{ id: string }>('/api/scheduled-tasks', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: description || null,
          agentId,
          environmentId,
          promptTemplate,
          schedulePreset: preset,
          timezone,
          sessionMode,
          hour,
          minute,
          dayOfWeek,
          dayOfMonth
        })
      });
      await goto(`/scheduled-tasks/${task.id}`);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to create task';
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>New Scheduled Task | Managed Agents</title>
</svelte:head>

<div class="create-page">
  <div class="create-page__header">
    <a href="/scheduled-tasks" class="create-page__back">&larr; Back</a>
    <h1 class="create-page__title">New Scheduled Task</h1>
  </div>

  {#if error}
    <div class="create-page__error">{error}</div>
  {/if}

  <form class="task-form" onsubmit={handleSubmit}>
    <section class="task-form__section">
      <h2 class="task-form__section-title">Basics</h2>
      <div class="task-form__field">
        <label class="task-form__label" for="name">Name *</label>
        <input id="name" class="task-form__input" type="text" bind:value={name} placeholder="e.g., Daily Sales Report" required />
      </div>
      <div class="task-form__field">
        <label class="task-form__label" for="description">Description</label>
        <input id="description" class="task-form__input" type="text" bind:value={description} placeholder="Optional description" />
      </div>
    </section>

    <section class="task-form__section">
      <h2 class="task-form__section-title">Agent & Environment</h2>
      <div class="task-form__row">
        <div class="task-form__field">
          <label class="task-form__label" for="agent">Agent *</label>
          <select id="agent" class="task-form__select" bind:value={agentId} required>
            <option value="">Select an agent...</option>
            {#each data.agents as agent (agent.id)}
              <option value={agent.id}>{agent.name ?? agent.id}</option>
            {/each}
          </select>
        </div>
        <div class="task-form__field">
          <label class="task-form__label" for="env">Environment *</label>
          <select id="env" class="task-form__select" bind:value={environmentId} required>
            <option value="">Select an environment...</option>
            {#each data.environments as env (env.id)}
              <option value={env.id}>{env.name ?? env.id}</option>
            {/each}
          </select>
        </div>
      </div>
    </section>

    <section class="task-form__section">
      <h2 class="task-form__section-title">Prompt</h2>
      <PromptTemplateEditor value={promptTemplate} onchange={(v) => (promptTemplate = v)} />
    </section>

    <section class="task-form__section">
      <h2 class="task-form__section-title">Schedule</h2>
      <SchedulePresetPicker {preset} {hour} {minute} {dayOfWeek} {dayOfMonth} onchange={handleScheduleChange} />
      <div class="task-form__field" style="margin-top: var(--space-4);">
        <label class="task-form__label" for="timezone">Timezone</label>
        <input id="timezone" class="task-form__input" type="text" bind:value={timezone} />
      </div>
    </section>

    <section class="task-form__section">
      <h2 class="task-form__section-title">Session Mode</h2>
      <div class="task-form__radios">
        <label class="task-form__radio">
          <input type="radio" bind:group={sessionMode} value="new_session" />
          <div>
            <strong>New session each run</strong>
            <span>Each execution starts fresh — no memory of previous runs</span>
          </div>
        </label>
        <label class="task-form__radio">
          <input type="radio" bind:group={sessionMode} value="continue_session" />
          <div>
            <strong>Continue in same session</strong>
            <span>Agent remembers previous runs — good for tracking trends</span>
          </div>
        </label>
      </div>
    </section>

    <div class="task-form__actions">
      <a href="/scheduled-tasks" class="task-form__btn task-form__btn--cancel">Cancel</a>
      <button type="submit" class="task-form__btn task-form__btn--primary" disabled={saving}>
        {saving ? 'Creating...' : 'Create Task'}
      </button>
    </div>
  </form>
</div>

<style lang="scss">
  .create-page {
    max-width: 720px;
    &__header { margin-bottom: var(--space-8); }
    &__back {
      font-size: var(--text-sm);
      color: var(--text-muted);
      text-decoration: none;
      &:hover { color: var(--text-primary); }
    }
    &__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      color: var(--text-primary);
      margin-top: var(--space-3);
    }
    &__error {
      padding: var(--space-4) var(--space-5);
      background: var(--accent-danger-muted);
      color: var(--accent-danger);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      margin-bottom: var(--space-6);
    }
  }

  .task-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);

    &__section {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    &__section-title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    &__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    &__label {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
    }
    &__input, &__select {
      padding: var(--space-3) var(--space-4);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      &:focus { border-color: var(--border-focus); outline: none; box-shadow: 0 0 0 2px var(--accent-primary-muted); }
    }
    &__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
    }
    &__radios {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    &__radio {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: border-color var(--transition-fast);
      &:hover { border-color: var(--border-strong); }
      input[type='radio'] { margin-top: 3px; }
      div { display: flex; flex-direction: column; gap: 2px; }
      strong { font-size: var(--text-sm); color: var(--text-primary); }
      span { font-size: var(--text-xs); color: var(--text-muted); }
    }
    &__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--border-subtle);
    }
    &__btn {
      padding: var(--space-3) var(--space-6);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      cursor: pointer;
      text-decoration: none;
      transition: background var(--transition-fast);
      &--cancel { background: var(--surface-2); color: var(--text-primary); border-color: var(--border-default); &:hover { background: var(--surface-3); } }
      &--primary { background: var(--accent-primary); color: #fff; &:hover { background: var(--accent-primary-hover); } &:disabled { opacity: 0.6; cursor: not-allowed; } }
    }
  }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/scheduled-tasks/new/+page.server.ts src/routes/scheduled-tasks/new/+page.svelte
git commit -m "feat(ui): add create scheduled task page with form"
```

---

### Task 15: UI — Task Detail Page with Execution Log

**Files:**
- Create: `src/routes/scheduled-tasks/[id]/+page.server.ts`
- Create: `src/routes/scheduled-tasks/[id]/+page.svelte`

- [ ] **Step 1: Create page server load**

Create `src/routes/scheduled-tasks/[id]/+page.server.ts`:

```typescript
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks, taskExecutions, taskEditHistory, users } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const [task] = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.id, params.id))
    .limit(1);

  if (!task) throw error(404, 'Task not found');

  const [creator] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, task.createdBy))
    .limit(1);

  const executions = await db
    .select()
    .from(taskExecutions)
    .where(eq(taskExecutions.taskId, params.id))
    .orderBy(desc(taskExecutions.startedAt))
    .limit(50);

  const editHistory = await db
    .select({
      id: taskEditHistory.id,
      editedBy: taskEditHistory.editedBy,
      editorEmail: users.email,
      changes: taskEditHistory.changes,
      createdAt: taskEditHistory.createdAt
    })
    .from(taskEditHistory)
    .leftJoin(users, eq(taskEditHistory.editedBy, users.id))
    .where(eq(taskEditHistory.taskId, params.id))
    .orderBy(desc(taskEditHistory.createdAt));

  return {
    task: {
      ...task,
      nextRunAt: task.nextRunAt?.toISOString() ?? null,
      lastRunAt: task.lastRunAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      creatorEmail: creator?.email ?? 'Unknown'
    },
    executions: executions.map(e => ({
      ...e,
      startedAt: e.startedAt.toISOString(),
      completedAt: e.completedAt?.toISOString() ?? null,
      createdAt: undefined
    })),
    editHistory: editHistory.map(h => ({
      ...h,
      createdAt: h.createdAt.toISOString()
    }))
  };
};
```

- [ ] **Step 2: Create the task detail page**

Create `src/routes/scheduled-tasks/[id]/+page.svelte`:

```svelte
<script lang="ts">
  import { getPresetLabel } from '$lib/schedule-presets';

  const { data } = $props();

  let activeTab = $state<'executions' | 'history'>('executions');
  let expandedExecution = $state<string | null>(null);

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function formatDuration(ms: number | null): string {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  async function toggleTask() {
    await fetch(`/api/scheduled-tasks/${data.task.id}/toggle`, { method: 'POST' });
    window.location.reload();
  }

  async function runNow() {
    await fetch(`/api/scheduled-tasks/${data.task.id}/run`, { method: 'POST' });
    window.location.reload();
  }
</script>

<svelte:head>
  <title>{data.task.name} | Scheduled Tasks</title>
</svelte:head>

<div class="detail-page">
  <div class="detail-page__header">
    <a href="/scheduled-tasks" class="detail-page__back">&larr; Back</a>
    <div class="detail-page__title-row">
      <div>
        <h1 class="detail-page__title">{data.task.name}</h1>
        {#if data.task.description}
          <p class="detail-page__desc">{data.task.description}</p>
        {/if}
      </div>
      <div class="detail-page__actions">
        <button class="detail-btn" onclick={toggleTask}>{data.task.enabled ? 'Disable' : 'Enable'}</button>
        <button class="detail-btn detail-btn--primary" onclick={runNow}>Run Now</button>
        <a href="/scheduled-tasks/{data.task.id}/edit" class="detail-btn">Edit</a>
      </div>
    </div>
  </div>

  <div class="detail-meta">
    <div class="detail-meta__item">
      <span class="detail-meta__label">Status</span>
      <span class="detail-meta__value" data-enabled={data.task.enabled}>{data.task.enabled ? 'Active' : 'Disabled'}</span>
    </div>
    <div class="detail-meta__item">
      <span class="detail-meta__label">Schedule</span>
      <span class="detail-meta__value">{getPresetLabel(data.task.schedulePreset)} ({data.task.timezone})</span>
    </div>
    <div class="detail-meta__item">
      <span class="detail-meta__label">Session Mode</span>
      <span class="detail-meta__value">{data.task.sessionMode === 'continue_session' ? 'Continue session' : 'New session'}</span>
    </div>
    <div class="detail-meta__item">
      <span class="detail-meta__label">Runs</span>
      <span class="detail-meta__value">{data.task.runCount}</span>
    </div>
    <div class="detail-meta__item">
      <span class="detail-meta__label">Next Run</span>
      <span class="detail-meta__value">{formatDate(data.task.nextRunAt)}</span>
    </div>
    <div class="detail-meta__item">
      <span class="detail-meta__label">Last Run</span>
      <span class="detail-meta__value">{formatDate(data.task.lastRunAt)}</span>
    </div>
    <div class="detail-meta__item">
      <span class="detail-meta__label">Created by</span>
      <span class="detail-meta__value">{data.task.creatorEmail}</span>
    </div>
  </div>

  <div class="tabs">
    <button class="tabs__btn" class:tabs__btn--active={activeTab === 'executions'} onclick={() => (activeTab = 'executions')}>
      Executions ({data.executions.length})
    </button>
    <button class="tabs__btn" class:tabs__btn--active={activeTab === 'history'} onclick={() => (activeTab = 'history')}>
      Edit History ({data.editHistory.length})
    </button>
  </div>

  {#if activeTab === 'executions'}
    {#if data.executions.length === 0}
      <p class="empty-tab">No executions yet. This task hasn't run.</p>
    {:else}
      <div class="execution-list">
        {#each data.executions as exec (exec.id)}
          <div class="exec-row">
            <button class="exec-row__summary" onclick={() => (expandedExecution = expandedExecution === exec.id ? null : exec.id)}>
              <span class="exec-row__status" data-status={exec.status}>{exec.status}</span>
              <span class="exec-row__date">{formatDate(exec.startedAt)}</span>
              <span class="exec-row__duration">{formatDuration(exec.durationMs)}</span>
              <span class="exec-row__expand">{expandedExecution === exec.id ? '−' : '+'}</span>
            </button>
            {#if expandedExecution === exec.id}
              <div class="exec-row__detail">
                <div class="exec-row__block">
                  <h4>Prompt Sent</h4>
                  <pre>{exec.promptSent}</pre>
                </div>
                {#if exec.response}
                  <div class="exec-row__block">
                    <h4>Response</h4>
                    <pre>{exec.response}</pre>
                  </div>
                {/if}
                {#if exec.error}
                  <div class="exec-row__block exec-row__block--error">
                    <h4>Error</h4>
                    <pre>{exec.error}</pre>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {:else}
    {#if data.editHistory.length === 0}
      <p class="empty-tab">No edits yet.</p>
    {:else}
      <div class="history-list">
        {#each data.editHistory as entry (entry.id)}
          <div class="history-row">
            <span class="history-row__who">{entry.editorEmail}</span>
            <span class="history-row__when">{formatDate(entry.createdAt)}</span>
            <pre class="history-row__changes">{JSON.stringify(entry.changes, null, 2)}</pre>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .detail-page {
    &__header { margin-bottom: var(--space-6); }
    &__back { font-size: var(--text-sm); color: var(--text-muted); text-decoration: none; &:hover { color: var(--text-primary); } }
    &__title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-6); margin-top: var(--space-3); }
    &__title { font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--text-primary); }
    &__desc { font-size: var(--text-sm); color: var(--text-muted); margin-top: var(--space-2); }
    &__actions { display: flex; gap: var(--space-3); flex-shrink: 0; }
  }

  .detail-btn {
    padding: var(--space-3) var(--space-5);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
    background: var(--surface-1);
    color: var(--text-primary);
    cursor: pointer;
    text-decoration: none;
    transition: background var(--transition-fast);
    &:hover { background: var(--surface-3); }
    &--primary { background: var(--accent-primary); color: #fff; border-color: transparent; &:hover { background: var(--accent-primary-hover); } }
  }

  .detail-meta {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--space-4);
    padding: var(--space-5) var(--space-6);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-6);

    &__item { display: flex; flex-direction: column; gap: 2px; }
    &__label { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    &__value { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--text-primary);
      &[data-enabled='true'] { color: var(--accent-success); }
      &[data-enabled='false'] { color: var(--text-muted); }
    }
  }

  .tabs {
    display: flex;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
    border-bottom: 1px solid var(--border-default);

    &__btn {
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-muted);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      margin-bottom: -1px;
      transition: color var(--transition-fast), border-color var(--transition-fast);
      &:hover { color: var(--text-primary); }
      &--active { color: var(--accent-primary); border-bottom-color: var(--accent-primary); }
    }
  }

  .empty-tab { font-size: var(--text-sm); color: var(--text-muted); padding: var(--space-8) 0; text-align: center; }

  .execution-list { display: flex; flex-direction: column; gap: var(--space-2); }

  .exec-row {
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;

    &__summary {
      width: 100%;
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-5);
      background: transparent;
      border: none;
      cursor: pointer;
      font-family: var(--font-sans);
      text-align: left;
      transition: background var(--transition-fast);
      &:hover { background: var(--surface-2); }
    }
    &__status {
      font-size: 11px;
      font-weight: var(--weight-semibold);
      text-transform: uppercase;
      padding: 1px 7px;
      border-radius: var(--radius-full);
      &[data-status='completed'] { background: var(--accent-success-muted); color: var(--accent-success); }
      &[data-status='running'] { background: var(--accent-info-muted); color: var(--accent-info); }
      &[data-status='failed'] { background: var(--accent-danger-muted); color: var(--accent-danger); }
    }
    &__date { font-size: var(--text-sm); color: var(--text-primary); }
    &__duration { font-size: var(--text-xs); color: var(--text-muted); margin-left: auto; }
    &__expand { font-size: var(--text-lg); color: var(--text-muted); width: 20px; text-align: center; }

    &__detail {
      padding: var(--space-4) var(--space-5);
      border-top: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    &__block {
      h4 { font-size: var(--text-xs); font-weight: var(--weight-semibold); color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--space-2); }
      pre {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        color: var(--text-primary);
        background: var(--surface-2);
        padding: var(--space-4);
        border-radius: var(--radius-md);
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
      &--error pre { background: var(--accent-danger-muted); color: var(--accent-danger); }
    }
  }

  .history-list { display: flex; flex-direction: column; gap: var(--space-3); }

  .history-row {
    padding: var(--space-4) var(--space-5);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);

    &__who { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--text-primary); }
    &__when { font-size: var(--text-xs); color: var(--text-muted); margin-left: var(--space-3); }
    &__changes {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-secondary);
      background: var(--surface-2);
      padding: var(--space-3);
      border-radius: var(--radius-sm);
      margin-top: var(--space-3);
      overflow-x: auto;
      white-space: pre-wrap;
    }
  }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/scheduled-tasks/[id]/+page.server.ts src/routes/scheduled-tasks/[id]/+page.svelte
git commit -m "feat(ui): add scheduled task detail page with execution log and edit history"
```

---

### Task 16: UI — Edit Task Page

**Files:**
- Create: `src/routes/scheduled-tasks/[id]/edit/+page.server.ts`
- Create: `src/routes/scheduled-tasks/[id]/edit/+page.svelte`

- [ ] **Step 1: Create page server load**

Create `src/routes/scheduled-tasks/[id]/edit/+page.server.ts`:

```typescript
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { scheduledTasks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createAnthropicClient } from '$lib/server/anthropic';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const [task] = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.id, params.id))
    .limit(1);

  if (!task) throw error(404, 'Task not found');

  try {
    const client = await createAnthropicClient();

    const agents = [];
    for await (const agent of client.beta.agents.list()) {
      agents.push(JSON.parse(JSON.stringify(agent)));
    }

    const environments = [];
    for await (const env of client.beta.environments.list()) {
      environments.push(JSON.parse(JSON.stringify(env)));
    }

    return {
      task: {
        ...task,
        nextRunAt: task.nextRunAt?.toISOString() ?? null,
        lastRunAt: task.lastRunAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString()
      },
      agents,
      environments
    };
  } catch (e: unknown) {
    console.error('[scheduled-tasks/edit]', e);
    return {
      task: {
        ...task,
        nextRunAt: task.nextRunAt?.toISOString() ?? null,
        lastRunAt: task.lastRunAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString()
      },
      agents: [],
      environments: []
    };
  }
};
```

- [ ] **Step 2: Create the edit page**

Create `src/routes/scheduled-tasks/[id]/edit/+page.svelte`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import SchedulePresetPicker from '$components/SchedulePresetPicker.svelte';
  import PromptTemplateEditor from '$components/PromptTemplateEditor.svelte';
  import { apiFetch } from '$lib/utils/api';

  const { data } = $props();

  let name = $state(data.task.name);
  let description = $state(data.task.description ?? '');
  let agentId = $state(data.task.agentId);
  let environmentId = $state(data.task.environmentId);
  let promptTemplate = $state(data.task.promptTemplate);
  let sessionMode = $state(data.task.sessionMode);
  let preset = $state(data.task.schedulePreset);
  let hour = $state(8);
  let minute = $state(0);
  let dayOfWeek = $state(1);
  let dayOfMonth = $state(1);
  let timezone = $state(data.task.timezone);
  let saving = $state(false);
  let error = $state('');

  function handleScheduleChange(values: { preset: string; hour: number; minute: number; dayOfWeek: number; dayOfMonth: number }) {
    preset = values.preset;
    hour = values.hour;
    minute = values.minute;
    dayOfWeek = values.dayOfWeek;
    dayOfMonth = values.dayOfMonth;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!name || !agentId || !environmentId || !promptTemplate) {
      error = 'Please fill in all required fields.';
      return;
    }

    saving = true;
    error = '';

    try {
      await apiFetch(`/api/scheduled-tasks/${data.task.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          description: description || null,
          agentId,
          environmentId,
          promptTemplate,
          schedulePreset: preset,
          timezone,
          sessionMode,
          hour,
          minute,
          dayOfWeek,
          dayOfMonth
        })
      });
      await goto(`/scheduled-tasks/${data.task.id}`);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to update task';
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Edit {data.task.name} | Scheduled Tasks</title>
</svelte:head>

<div class="edit-page">
  <div class="edit-page__header">
    <a href="/scheduled-tasks/{data.task.id}" class="edit-page__back">&larr; Back</a>
    <h1 class="edit-page__title">Edit Task</h1>
  </div>

  {#if error}
    <div class="edit-page__error">{error}</div>
  {/if}

  <form class="task-form" onsubmit={handleSubmit}>
    <section class="task-form__section">
      <h2 class="task-form__section-title">Basics</h2>
      <div class="task-form__field">
        <label class="task-form__label" for="name">Name *</label>
        <input id="name" class="task-form__input" type="text" bind:value={name} required />
      </div>
      <div class="task-form__field">
        <label class="task-form__label" for="description">Description</label>
        <input id="description" class="task-form__input" type="text" bind:value={description} />
      </div>
    </section>

    <section class="task-form__section">
      <h2 class="task-form__section-title">Agent & Environment</h2>
      <div class="task-form__row">
        <div class="task-form__field">
          <label class="task-form__label" for="agent">Agent *</label>
          <select id="agent" class="task-form__select" bind:value={agentId} required>
            <option value="">Select an agent...</option>
            {#each data.agents as agent (agent.id)}
              <option value={agent.id}>{agent.name ?? agent.id}</option>
            {/each}
          </select>
        </div>
        <div class="task-form__field">
          <label class="task-form__label" for="env">Environment *</label>
          <select id="env" class="task-form__select" bind:value={environmentId} required>
            <option value="">Select an environment...</option>
            {#each data.environments as env (env.id)}
              <option value={env.id}>{env.name ?? env.id}</option>
            {/each}
          </select>
        </div>
      </div>
    </section>

    <section class="task-form__section">
      <h2 class="task-form__section-title">Prompt</h2>
      <PromptTemplateEditor value={promptTemplate} onchange={(v) => (promptTemplate = v)} />
    </section>

    <section class="task-form__section">
      <h2 class="task-form__section-title">Schedule</h2>
      <SchedulePresetPicker {preset} {hour} {minute} {dayOfWeek} {dayOfMonth} onchange={handleScheduleChange} />
      <div class="task-form__field" style="margin-top: var(--space-4);">
        <label class="task-form__label" for="timezone">Timezone</label>
        <input id="timezone" class="task-form__input" type="text" bind:value={timezone} />
      </div>
    </section>

    <section class="task-form__section">
      <h2 class="task-form__section-title">Session Mode</h2>
      <div class="task-form__radios">
        <label class="task-form__radio">
          <input type="radio" bind:group={sessionMode} value="new_session" />
          <div>
            <strong>New session each run</strong>
            <span>Each execution starts fresh</span>
          </div>
        </label>
        <label class="task-form__radio">
          <input type="radio" bind:group={sessionMode} value="continue_session" />
          <div>
            <strong>Continue in same session</strong>
            <span>Agent remembers previous runs</span>
          </div>
        </label>
      </div>
    </section>

    <div class="task-form__actions">
      <a href="/scheduled-tasks/{data.task.id}" class="task-form__btn task-form__btn--cancel">Cancel</a>
      <button type="submit" class="task-form__btn task-form__btn--primary" disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  </form>
</div>

<style lang="scss">
  .edit-page {
    max-width: 720px;
    &__header { margin-bottom: var(--space-8); }
    &__back { font-size: var(--text-sm); color: var(--text-muted); text-decoration: none; &:hover { color: var(--text-primary); } }
    &__title { font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--text-primary); margin-top: var(--space-3); }
    &__error { padding: var(--space-4) var(--space-5); background: var(--accent-danger-muted); color: var(--accent-danger); border-radius: var(--radius-md); font-size: var(--text-sm); margin-bottom: var(--space-6); }
  }

  .task-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);

    &__section { display: flex; flex-direction: column; gap: var(--space-4); }
    &__section-title { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
    &__field { display: flex; flex-direction: column; gap: var(--space-2); }
    &__label { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--text-primary); }
    &__input, &__select {
      padding: var(--space-3) var(--space-4);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      &:focus { border-color: var(--border-focus); outline: none; box-shadow: 0 0 0 2px var(--accent-primary-muted); }
    }
    &__row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
    &__radios { display: flex; flex-direction: column; gap: var(--space-3); }
    &__radio {
      display: flex; align-items: flex-start; gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
      background: var(--surface-1); border: 1px solid var(--border-default); border-radius: var(--radius-md);
      cursor: pointer; transition: border-color var(--transition-fast);
      &:hover { border-color: var(--border-strong); }
      input[type='radio'] { margin-top: 3px; }
      div { display: flex; flex-direction: column; gap: 2px; }
      strong { font-size: var(--text-sm); color: var(--text-primary); }
      span { font-size: var(--text-xs); color: var(--text-muted); }
    }
    &__actions { display: flex; justify-content: flex-end; gap: var(--space-3); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle); }
    &__btn {
      padding: var(--space-3) var(--space-6); font-family: var(--font-sans); font-size: var(--text-sm); font-weight: var(--weight-medium);
      border-radius: var(--radius-md); border: 1px solid transparent; cursor: pointer; text-decoration: none; transition: background var(--transition-fast);
      &--cancel { background: var(--surface-2); color: var(--text-primary); border-color: var(--border-default); &:hover { background: var(--surface-3); } }
      &--primary { background: var(--accent-primary); color: #fff; &:hover { background: var(--accent-primary-hover); } &:disabled { opacity: 0.6; cursor: not-allowed; } }
    }
  }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/scheduled-tasks/[id]/edit/+page.server.ts src/routes/scheduled-tasks/[id]/edit/+page.svelte
git commit -m "feat(ui): add edit scheduled task page"
```

---

### Task 17: Lint, Type-Check, and Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: No errors. Fix any issues found.

- [ ] **Step 2: Run type-check**

```bash
npm run check
```

Expected: No errors. Fix any type issues.

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: All tests pass, including the new template tests.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit any lint/type fixes**

```bash
git add -A
git commit -m "fix: resolve lint and type-check issues for scheduled tasks"
```

---

### Task 18: Final Integration Test

**Files:** None (manual verification)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev:local
```

- [ ] **Step 2: Verify the following flows work end-to-end**

1. Navigate to `/scheduled-tasks` — should show empty state
2. Click "New Task" — form should load with agents and environments
3. Create a task with "Every 15 minutes" preset
4. Task should appear in the list
5. Click into task detail — should show metadata and empty execution log
6. Click "Run Now" — should trigger an execution
7. Refresh detail page — execution should appear in the log
8. Edit the task — verify changes are saved and show in edit history
9. Toggle enable/disable — verify it works
10. Delete the task — verify it's removed

- [ ] **Step 3: Commit any final fixes and push**

```bash
git push -u origin feat/scheduled-tasks
```
