<script lang="ts">
  import EmptyState from '$components/EmptyState.svelte';
  import { getPresetLabel } from '$lib/schedule-presets';
  import iconTasks from '$lib/assets/icons/empty-idle.svg';

  const { data } = $props();

  let deleteTargetId = $state<string | null>(null);

  interface Task {
    id: string;
    name: string;
    description: string | null;
    schedulePreset: string;
    cronExpression: string;
    timezone: string;
    sessionMode: string;
    enabled: boolean;
    runCount: number;
    nextRunAt: string | null;
    lastRunAt: string | null;
    createdAt: string;
    creatorEmail: string | null;
  }

  const tasks = $derived(data.tasks as Task[]);
  const enabledCount = $derived(tasks.filter((t) => t.enabled).length);

  function formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatSessionMode(mode: string): string {
    switch (mode) {
      case 'new_session': return 'New session';
      case 'reuse_session': return 'Reuse session';
      default: return mode;
    }
  }

  async function toggleTask(id: string) {
    await fetch(`/api/scheduled-tasks/${id}/toggle`, { method: 'POST' });
    window.location.reload();
  }

  async function runNow(id: string) {
    await fetch(`/api/scheduled-tasks/${id}/run`, { method: 'POST' });
    window.location.reload();
  }

  async function doDelete() {
    if (!deleteTargetId) return;
    await fetch(`/api/scheduled-tasks/${deleteTargetId}`, { method: 'DELETE' });
    deleteTargetId = null;
    window.location.reload();
  }
</script>

<svelte:head>
  <title>Scheduled Tasks | Managed Agents</title>
</svelte:head>

{#if deleteTargetId}
  <div
    class="confirm-backdrop"
    onclick={() => (deleteTargetId = null)}
    role="presentation"
  >
    <div
      class="confirm-modal"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
      onkeydown={(e) => e.key === 'Escape' && (deleteTargetId = null)}
    >
      <p class="confirm-modal__text">
        Delete this scheduled task? This action cannot be undone.
      </p>
      <div class="confirm-modal__actions">
        <button
          class="confirm-modal__btn confirm-modal__btn--cancel"
          onclick={() => (deleteTargetId = null)}
        >
          Cancel
        </button>
        <button
          class="confirm-modal__btn confirm-modal__btn--danger"
          onclick={doDelete}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}

<div class="tasks-page">
  <div class="tasks-page__header">
    <div>
      <h1 class="tasks-page__title">Scheduled Tasks</h1>
      <p class="tasks-page__subtitle">
        {tasks.length} task{tasks.length !== 1 ? 's' : ''}{#if enabledCount > 0}, {enabledCount} enabled{/if}
      </p>
    </div>
    <a href="/scheduled-tasks/new" class="btn-new">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      New Task
    </a>
  </div>

  {#if tasks.length === 0}
    <EmptyState
      icon={iconTasks}
      title="No scheduled tasks yet."
      description="Create a task to run agent prompts on a recurring schedule."
      actionHref="/scheduled-tasks/new"
      actionLabel="New Task"
    />
  {:else}
    <div class="task-list">
      {#each tasks as task (task.id)}
        <div class="task-row" class:task-row--disabled={!task.enabled}>
          <a href="/scheduled-tasks/{task.id}" class="task-row__main">
            <div class="task-row__left">
              <span
                class="status-dot"
                class:status-dot--enabled={task.enabled}
                class:status-dot--disabled={!task.enabled}
                title={task.enabled ? 'Enabled' : 'Disabled'}
              ></span>
              <div class="task-row__info">
                <span class="task-row__name">{task.name}</span>
                <span class="task-row__meta">
                  {getPresetLabel(task.schedulePreset)}
                  &middot;
                  {formatSessionMode(task.sessionMode)}
                  {#if task.creatorEmail}
                    &middot;
                    {task.creatorEmail}
                  {/if}
                </span>
              </div>
            </div>
            <div class="task-row__right">
              <div class="task-row__stat">
                <span class="task-row__stat-label">Runs</span>
                <span class="task-row__stat-value">{task.runCount}</span>
              </div>
              <div class="task-row__stat">
                <span class="task-row__stat-label">Next run</span>
                <span class="task-row__stat-value">{formatDateTime(task.nextRunAt)}</span>
              </div>
            </div>
          </a>
          <div class="task-row__actions">
            <button
              class="action-btn"
              class:action-btn--success={!task.enabled}
              class:action-btn--warning={task.enabled}
              title={task.enabled ? 'Disable task' : 'Enable task'}
              onclick={() => toggleTask(task.id)}
            >
              {#if task.enabled}
                <!-- Pause icon -->
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="3" width="3.5" height="10" rx="1" fill="currentColor"/>
                  <rect x="9.5" y="3" width="3.5" height="10" rx="1" fill="currentColor"/>
                </svg>
              {:else}
                <!-- Play icon -->
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 3l10 5-10 5V3z" fill="currentColor"/>
                </svg>
              {/if}
            </button>
            <button
              class="action-btn action-btn--run"
              title="Run now"
              onclick={() => runNow(task.id)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.25"/>
                <path d="M6 5.5l5 2.5-5 2.5V5.5z" fill="currentColor"/>
              </svg>
            </button>
            <a
              href="/scheduled-tasks/{task.id}/edit"
              class="action-btn"
              title="Edit task"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M11 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11 2.5z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
            <button
              class="action-btn action-btn--danger"
              title="Delete task"
              onclick={() => (deleteTargetId = task.id)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
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

    &:hover {
      background: var(--accent-primary-hover);
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
    }
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
    transition: border-color var(--transition-fast), opacity var(--transition-fast);

    &:hover {
      border-color: var(--border-strong);
    }

    &--disabled {
      opacity: 0.55;
    }

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

    &__info {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      min-width: 0;
    }

    &__name {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__meta {
      font-size: var(--text-xs);
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__right {
      display: flex;
      align-items: center;
      gap: var(--space-6);
      flex-shrink: 0;
    }

    &__stat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1px;
    }

    &__stat-label {
      font-size: 10px;
      font-weight: var(--weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    &__stat-value {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      white-space: nowrap;
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding-right: var(--space-3);
      flex-shrink: 0;
    }
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    flex-shrink: 0;

    &--enabled {
      background: var(--accent-success);
      box-shadow: 0 0 0 2px var(--accent-success-muted);
    }

    &--disabled {
      background: var(--text-muted);
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

    &:hover {
      background: var(--surface-3);
      color: var(--text-primary);
    }

    &--success:hover {
      background: var(--accent-success-muted);
      color: var(--accent-success);
    }

    &--warning:hover {
      background: var(--accent-warning-muted);
      color: var(--accent-warning);
    }

    &--run:hover {
      background: var(--accent-primary-muted);
      color: var(--accent-primary);
    }

    &--danger:hover {
      background: var(--accent-danger-muted);
      color: var(--accent-danger);
    }
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

    &__text {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      line-height: var(--leading-relaxed);
      margin-bottom: var(--space-6);
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
    }

    &__btn {
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      cursor: pointer;
      transition: background var(--transition-fast);

      &--cancel {
        background: var(--surface-2);
        color: var(--text-primary);
        border-color: var(--border-default);

        &:hover {
          background: var(--surface-3);
        }
      }

      &--danger {
        background: var(--accent-danger);
        color: #fff;

        &:hover {
          background: var(--accent-danger-hover);
        }
      }
    }
  }

  @media (max-width: 640px) {
    .task-row__right {
      display: none;
    }
  }
</style>
