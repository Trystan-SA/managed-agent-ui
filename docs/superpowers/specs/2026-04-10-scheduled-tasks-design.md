# Scheduled Tasks — Design Spec

## Overview

A CRON-based scheduled task system that automatically launches AI agent tasks on a user-defined schedule without human intervention. Users define a prompt template, pick an agent + environment, set a friendly schedule, and the system fires it off automatically, storing execution results in a browsable history log.

## Requirements Summary

- **Schedule presets**: Friendly UI presets (every 30 min, hourly, daily at X, weekly on Y) that generate cron expressions under the hood. No raw cron editing.
- **Team-shared tasks**: Any user can create/edit tasks. Full audit trail (who created, who edited). Execution logs visible to everyone.
- **Session modes**: Per task, either create a new session each run or continue an existing session (for longitudinal context).
- **Prompt templates**: Support `{{date}}`, `{{time}}`, `{{run_number}}` variables rendered at execution time.
- **Execution history**: All runs stored with prompt sent, response received, status, duration. Browsable in the UI.
- **Failure handling**: Log failure, mark run as failed, move on. No retries.
- **Notifications**: Optional — if the user configured a notification channel, push a notification on completion. Out of scope for v1 (schema-ready).
- **Volume**: Moderate — dozens of tasks, some concurrent. Database lock row to prevent double-firing.

## Architecture

### Approach: In-Process Scheduler (node-cron)

The scheduler runs inside the existing SvelteKit Node process. On startup, it loads all enabled tasks from Postgres, registers cron jobs, and executes them by calling the Anthropic API through the existing `createAnthropicClient()` path.

```
App Startup
  └─ Scheduler Init
       ├─ Load enabled tasks from DB
       ├─ Register node-cron jobs
       └─ On tick:
            ├─ Acquire DB lock (UPDATE ... WHERE next_run_at <= now AND NOT locked)
            ├─ Render prompt template
            ├─ Create or resume Anthropic session
            ├─ Send message, collect response (non-streaming)
            ├─ Write execution log to task_executions
            ├─ Update next_run_at, run_count, last_run_at
            └─ Release lock
```

### Key Design Decisions

1. **Non-streaming execution**: Scheduled runs use `client.beta.sessions.events.send()` and then poll/wait for the response rather than SSE streaming. Simpler for background execution.
2. **Database lock**: Each task row has a `locked_at` timestamp. Before executing, the scheduler does an atomic `UPDATE scheduled_tasks SET locked_at = now() WHERE id = ? AND locked_at IS NULL`. Prevents double-firing if the app ever runs multiple instances.
3. **Startup catch-up**: On init, the scheduler checks for tasks where `next_run_at < now()` (missed during downtime). It runs them once immediately, then resumes normal schedule.
4. **Scheduler reload**: When a task is created, updated, or deleted via the API, the scheduler is notified to reload that specific task's cron job without restarting the entire scheduler.

## Data Model

### `scheduled_tasks`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | |
| `name` | varchar(255) | Human-readable task name |
| `description` | text, nullable | Optional longer description |
| `agent_id` | varchar(255) | Anthropic agent ID to use |
| `environment_id` | varchar(255) | Anthropic environment ID to use |
| `prompt_template` | text | Message template with variable support |
| `cron_expression` | varchar(100) | Generated from preset selection |
| `schedule_preset` | varchar(50) | Friendly preset key (e.g., `every_30m`, `daily_8am`) |
| `timezone` | varchar(50), default `UTC` | Timezone for schedule interpretation |
| `session_mode` | varchar(20) | `new_session` or `continue_session` |
| `active_session_id` | varchar(255), nullable | Current session ID when mode is `continue_session` |
| `enabled` | boolean, default true | Toggle on/off |
| `locked_at` | timestamp, nullable | Concurrency lock — set during execution |
| `next_run_at` | timestamp | Pre-computed next execution time |
| `last_run_at` | timestamp, nullable | When it last ran |
| `run_count` | integer, default 0 | Total runs (also feeds `{{run_number}}`) |
| `created_by` | UUID (FK -> users) | Who created it |
| `updated_by` | UUID (FK -> users), nullable | Who last edited it |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `task_executions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | |
| `task_id` | UUID (FK -> scheduled_tasks) | |
| `session_id` | varchar(255) | Anthropic session used |
| `status` | varchar(20) | `running`, `completed`, `failed` |
| `prompt_sent` | text | Rendered prompt after template substitution |
| `response` | text, nullable | Agent's response text |
| `error` | text, nullable | Error message if failed |
| `started_at` | timestamp | |
| `completed_at` | timestamp, nullable | |
| `duration_ms` | integer, nullable | Execution duration |

### `task_edit_history`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | |
| `task_id` | UUID (FK -> scheduled_tasks) | |
| `edited_by` | UUID (FK -> users) | |
| `changes` | jsonb | Diff of what changed |
| `created_at` | timestamp | |

## Schedule Presets

| Preset Key | Label | Cron Expression |
|-----------|-------|-----------------|
| `every_15m` | Every 15 minutes | `*/15 * * * *` |
| `every_30m` | Every 30 minutes | `*/30 * * * *` |
| `every_1h` | Every hour | `0 * * * *` |
| `every_2h` | Every 2 hours | `0 */2 * * *` |
| `every_6h` | Every 6 hours | `0 */6 * * *` |
| `daily` | Daily at (user picks time) | `0 {H} * * *` |
| `weekdays` | Weekdays at (user picks time) | `0 {H} * * 1-5` |
| `weekly` | Weekly on (user picks day + time) | `0 {H} * * {D}` |
| `monthly` | Monthly on (user picks date + time) | `0 {H} {D} * *` |

For presets with user-configurable time/day, the UI collects the time and day inputs separately and generates the cron expression.

## Template Variables

| Variable | Rendered As | Example |
|----------|-----------|---------|
| `{{date}}` | ISO date (`YYYY-MM-DD`) in task's timezone | `2026-04-10` |
| `{{time}}` | 24h time (`HH:mm`) in task's timezone | `08:00` |
| `{{datetime}}` | ISO datetime in task's timezone | `2026-04-10T08:00:00` |
| `{{run_number}}` | Incrementing run count for this task | `42` |
| `{{task_name}}` | The task's name | `Daily Sales Report` |

## API Routes

All under `src/routes/api/scheduled-tasks/`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/scheduled-tasks` | List all tasks (with optional filters: enabled, agent_id) |
| POST | `/api/scheduled-tasks` | Create new task |
| GET | `/api/scheduled-tasks/[id]` | Get task detail |
| PUT | `/api/scheduled-tasks/[id]` | Update task (records edit history) |
| DELETE | `/api/scheduled-tasks/[id]` | Delete task (cascades executions + history) |
| POST | `/api/scheduled-tasks/[id]/toggle` | Enable/disable task |
| POST | `/api/scheduled-tasks/[id]/run` | Manually trigger a run now |
| GET | `/api/scheduled-tasks/[id]/executions` | List execution history for a task |
| GET | `/api/scheduled-tasks/[id]/history` | List edit history for a task |
| GET | `/api/scheduled-tasks/executions` | List all executions across all tasks (dashboard view) |

## UI Pages

### `/scheduled-tasks` — Task List

- Table/card list of all scheduled tasks
- Columns: name, agent, schedule (human-readable), session mode, last run, next run, status (enabled/disabled), created by
- Actions: enable/disable toggle, edit, delete, "Run Now" button
- Empty state with CTA to create first task
- Filter by enabled/disabled, agent

### `/scheduled-tasks/new` — Create Task

Form with sections:
1. **Basics**: Name, description
2. **Agent & Environment**: Dropdowns populated from Anthropic API (reuse existing agent/env fetching)
3. **Prompt**: Textarea with template variable helper buttons (click to insert `{{date}}` etc.)
4. **Schedule**: Preset selector with dynamic time/day pickers based on preset choice. Shows "Next run: ..." preview.
5. **Session Mode**: Radio — "New session each run" / "Continue in same session"
6. **Timezone**: Dropdown defaulting to browser timezone

### `/scheduled-tasks/[id]` — Task Detail

- Task metadata + current status
- Tabs: **Executions** (log table) | **Edit History** (audit trail)
- Execution table: run number, status badge, prompt sent (truncated), response (truncated), duration, timestamp. Click to expand full content.
- Edit button, delete button, enable/disable toggle, "Run Now" button

### `/scheduled-tasks/[id]/edit` — Edit Task

Same form as create, pre-populated. On save, diffs changes and writes to `task_edit_history`.

## Scheduler Engine

File: `src/lib/server/scheduler.ts`

### Initialization

```
export function initScheduler():
  1. Load all enabled tasks from DB where enabled = true
  2. For each task, register a node-cron job keyed by task.id
  3. Check for missed runs (next_run_at < now), queue them for immediate execution
  4. Export functions: addTask, updateTask, removeTask, triggerNow
```

### Execution Flow

```
async function executeTask(taskId):
  1. Acquire lock: UPDATE scheduled_tasks SET locked_at = now() WHERE id = taskId AND locked_at IS NULL
     - If no rows affected, another instance is running it — skip
  2. Insert task_execution row with status = 'running'
  3. Render prompt template (substitute variables)
  4. If session_mode = 'new_session':
       - Create new session via Anthropic API
     If session_mode = 'continue_session':
       - Use active_session_id, or create new if null/terminated
  5. Send rendered prompt to session via events.send()
  6. Poll/wait for agent response (check session status until idle or terminated)
  7. Collect response text from session events
  8. Update task_execution: status = 'completed', response, duration_ms, completed_at
  9. Update scheduled_task: last_run_at, run_count++, next_run_at (recompute), active_session_id (if continue mode)
  10. Release lock: UPDATE scheduled_tasks SET locked_at = NULL WHERE id = taskId
  
  On error at any step:
  - Update task_execution: status = 'failed', error message
  - Release lock
  - Log error
  - Continue (no retry)
```

### Scheduler Lifecycle

- **Start**: Called from `hooks.server.ts` or a SvelteKit server hook on first request, or from a top-level module side-effect.
- **Reload**: API routes call `scheduler.updateTask(id)` or `scheduler.removeTask(id)` after mutations.
- **Shutdown**: Graceful stop of all cron jobs on `process.on('SIGTERM')`.

## Integration Points

### Existing Code Touched

- `src/lib/server/db/schema.ts` — Add 3 new tables
- `src/hooks.server.ts` — Initialize scheduler on startup
- `src/lib/server/anthropic.ts` — Reuse `createAnthropicClient()` as-is
- `src/routes/` — New `scheduled-tasks/` page routes and `api/scheduled-tasks/` API routes

### New Dependencies

- `node-cron` — Cron scheduling library
- `cronstrue` (optional) — Human-readable cron descriptions for the UI

### Navigation

- Add "Scheduled Tasks" to the sidebar navigation, with a clock/calendar icon

## Out of Scope (v1)

- External notifications (email, webhook, Slack) — schema supports it, UI deferred
- Raw cron expression editing
- Task dependencies / chaining (run task B after task A completes)
- Execution output formatting (markdown rendering of agent responses)
- Role-based restrictions on task creation (all authenticated users can create)
