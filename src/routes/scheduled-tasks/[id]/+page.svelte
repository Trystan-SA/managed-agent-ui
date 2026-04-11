<script lang="ts">
  import { getPresetLabel } from '$lib/schedule-presets';

  const { data } = $props();

  let activeTab = $state<'executions' | 'editHistory'>('executions');
  let expandedExecution = $state<string | null>(null);

  function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDuration(ms: number | null): string {
    if (ms === null) return '—';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  function formatSessionMode(mode: string): string {
    switch (mode) {
      case 'new_session': return 'New session each run';
      case 'persistent': return 'Persistent session';
      default: return mode;
    }
  }

  function toggleExecution(id: string) {
    expandedExecution = expandedExecution === id ? null : id;
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

<div class="task-detail">
  <!-- Header -->
  <div class="task-detail__header">
    <div class="task-detail__header-top">
      <a href="/scheduled-tasks" class="task-detail__back">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Scheduled Tasks
      </a>
      <div class="task-detail__actions">
        <button
          class="task-detail__btn task-detail__btn--toggle"
          class:task-detail__btn--disable={data.task.enabled}
          onclick={toggleTask}
        >
          {data.task.enabled ? 'Disable' : 'Enable'}
        </button>
        <button class="task-detail__btn task-detail__btn--run" onclick={runNow}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 3l9 5-9 5V3z" fill="currentColor"/>
          </svg>
          Run Now
        </button>
        <a href="/scheduled-tasks/{data.task.id}/edit" class="task-detail__btn task-detail__btn--edit">
          Edit
        </a>
      </div>
    </div>
    <h1 class="task-detail__title">{data.task.name}</h1>
    {#if data.task.description}
      <p class="task-detail__description">{data.task.description}</p>
    {/if}
  </div>

  <!-- Metadata grid -->
  <div class="task-detail__meta-card">
    <div class="task-meta-grid">
      <div class="task-meta-grid__item">
        <span class="task-meta-grid__label">Status</span>
        <span
          class="task-meta-grid__badge"
          class:task-meta-grid__badge--active={data.task.enabled}
          class:task-meta-grid__badge--disabled={!data.task.enabled}
        >
          {data.task.enabled ? 'Active' : 'Disabled'}
        </span>
      </div>

      <div class="task-meta-grid__item">
        <span class="task-meta-grid__label">Schedule</span>
        <span class="task-meta-grid__value">
          {getPresetLabel(data.task.schedulePreset)}
          <span class="task-meta-grid__sub">{data.task.timezone}</span>
        </span>
      </div>

      <div class="task-meta-grid__item">
        <span class="task-meta-grid__label">Session Mode</span>
        <span class="task-meta-grid__value">{formatSessionMode(data.task.sessionMode)}</span>
      </div>

      <div class="task-meta-grid__item">
        <span class="task-meta-grid__label">Run Count</span>
        <span class="task-meta-grid__value">{data.task.runCount}</span>
      </div>

      <div class="task-meta-grid__item">
        <span class="task-meta-grid__label">Next Run</span>
        <span class="task-meta-grid__value">{formatDateTime(data.task.nextRunAt)}</span>
      </div>

      <div class="task-meta-grid__item">
        <span class="task-meta-grid__label">Last Run</span>
        <span class="task-meta-grid__value">{formatDateTime(data.task.lastRunAt)}</span>
      </div>

      <div class="task-meta-grid__item">
        <span class="task-meta-grid__label">Created by</span>
        <span class="task-meta-grid__value">{data.task.creatorEmail ?? '—'}</span>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="task-detail__tabs">
    <button
      class="task-detail__tab"
      class:task-detail__tab--active={activeTab === 'executions'}
      onclick={() => (activeTab = 'executions')}
    >
      Executions ({data.executions.length})
    </button>
    <button
      class="task-detail__tab"
      class:task-detail__tab--active={activeTab === 'editHistory'}
      onclick={() => (activeTab = 'editHistory')}
    >
      Edit History ({data.editHistory.length})
    </button>
  </div>

  <!-- Executions tab -->
  {#if activeTab === 'executions'}
    {#if data.executions.length === 0}
      <div class="task-detail__empty">
        <p>No executions yet.</p>
      </div>
    {:else}
      <div class="execution-list">
        {#each data.executions as execution (execution.id)}
          <div class="execution-row">
            <button
              class="execution-row__summary"
              onclick={() => toggleExecution(execution.id)}
              aria-expanded={expandedExecution === execution.id}
            >
              <div class="execution-row__left">
                <span
                  class="exec-badge"
                  class:exec-badge--completed={execution.status === 'completed'}
                  class:exec-badge--running={execution.status === 'running'}
                  class:exec-badge--failed={execution.status === 'failed'}
                >
                  {execution.status}
                </span>
                <span class="execution-row__date">{formatDateTime(execution.startedAt)}</span>
              </div>
              <div class="execution-row__right">
                <span class="execution-row__duration">{formatDuration(execution.durationMs)}</span>
                <svg
                  class="execution-row__chevron"
                  class:execution-row__chevron--open={expandedExecution === execution.id}
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </button>

            {#if expandedExecution === execution.id}
              <div class="execution-detail">
                <div class="execution-detail__block">
                  <span class="execution-detail__label">Prompt Sent</span>
                  <pre class="execution-detail__pre">{execution.promptSent}</pre>
                </div>
                {#if execution.response}
                  <div class="execution-detail__block">
                    <span class="execution-detail__label">Response</span>
                    <pre class="execution-detail__pre">{execution.response}</pre>
                  </div>
                {/if}
                {#if execution.error}
                  <div class="execution-detail__block">
                    <span class="execution-detail__label execution-detail__label--error">Error</span>
                    <pre class="execution-detail__pre execution-detail__pre--error">{execution.error}</pre>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- Edit History tab -->
  {#if activeTab === 'editHistory'}
    {#if data.editHistory.length === 0}
      <div class="task-detail__empty">
        <p>No edit history yet.</p>
      </div>
    {:else}
      <div class="history-list">
        {#each data.editHistory as entry (entry.id)}
          <div class="history-entry">
            <div class="history-entry__header">
              <span class="history-entry__editor">{entry.editorEmail ?? '—'}</span>
              <span class="history-entry__date">{formatDateTime(entry.createdAt)}</span>
            </div>
            <pre class="history-entry__changes">{JSON.stringify(entry.changes, null, 2)}</pre>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .task-detail {
    &__header {
      margin-bottom: var(--space-8);
    }

    &__header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-6);
      margin-bottom: var(--space-5);
    }

    &__back {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--text-muted);
      text-decoration: none;
      transition: color var(--transition-fast);

      &:hover { color: var(--text-primary); }
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-shrink: 0;
    }

    &__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      color: var(--text-primary);
      line-height: var(--leading-tight);
    }

    &__description {
      font-size: var(--text-sm);
      color: var(--text-muted);
      margin-top: var(--space-3);
      line-height: var(--leading-relaxed);
    }

    &__btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
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
      transition: background var(--transition-fast), border-color var(--transition-fast);

      &:hover {
        background: var(--surface-2);
        border-color: var(--border-strong);
      }

      &--toggle {
        background: var(--accent-success-muted);
        color: var(--accent-success);
        border-color: transparent;

        &:hover {
          background: var(--accent-success);
          color: #fff;
          border-color: transparent;
        }
      }

      &--disable {
        background: var(--surface-2);
        color: var(--text-muted);
        border-color: var(--border-default);

        &:hover {
          background: var(--accent-danger-muted);
          color: var(--accent-danger);
          border-color: transparent;
        }
      }

      &--run {
        background: var(--accent-primary);
        color: #fff;
        border-color: transparent;

        &:hover {
          background: var(--accent-primary-hover);
          border-color: transparent;
        }
      }

      &--edit {
        background: var(--surface-2);
        color: var(--text-primary);
        border-color: var(--border-default);

        &:hover {
          background: var(--surface-3);
          border-color: var(--border-strong);
        }
      }
    }

    &__meta-card {
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      padding: var(--space-7) var(--space-8);
      margin-bottom: var(--space-8);
    }

    &__tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--border-default);
      margin-bottom: var(--space-6);
    }

    &__tab {
      padding: var(--space-4) var(--space-6);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-muted);
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      cursor: pointer;
      transition: color var(--transition-fast), border-color var(--transition-fast);

      &:hover { color: var(--text-primary); }

      &--active {
        color: var(--accent-primary);
        border-bottom-color: var(--accent-primary);
      }
    }

    &__empty {
      padding: var(--space-10) var(--space-8);
      text-align: center;
      color: var(--text-muted);
      font-size: var(--text-sm);
    }
  }

  /* Metadata grid */
  .task-meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-6) var(--space-8);

    &__item {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    &__label {
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    &__value {
      font-size: var(--text-sm);
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    &__sub {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    &__badge {
      display: inline-flex;
      align-self: flex-start;
      padding: 2px var(--space-4);
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.04em;

      &--active {
        background: var(--accent-success-muted);
        color: var(--accent-success);
      }

      &--disabled {
        background: var(--surface-3);
        color: var(--text-muted);
      }
    }
  }

  /* Execution list */
  .execution-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .execution-row {
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
    transition: border-color var(--transition-fast);

    &:has(.execution-row__summary[aria-expanded='true']) {
      border-color: var(--border-strong);
    }

    &__summary {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-6);
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      gap: var(--space-4);
      transition: background var(--transition-fast);

      &:hover { background: var(--surface-2); }
    }

    &__left {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    &__right {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      flex-shrink: 0;
    }

    &__date {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    &__duration {
      font-size: var(--text-xs);
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    &__chevron {
      color: var(--text-muted);
      transition: transform var(--transition-fast);

      &--open { transform: rotate(180deg); }
    }
  }

  /* Execution status badges */
  .exec-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px var(--space-4);
    border-radius: var(--radius-full);
    font-size: 11px;
    font-weight: var(--weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.04em;

    &--completed {
      background: var(--accent-success-muted);
      color: var(--accent-success);
    }

    &--running {
      background: var(--accent-info-muted);
      color: var(--accent-info);
    }

    &--failed {
      background: var(--accent-danger-muted);
      color: var(--accent-danger);
    }
  }

  /* Execution detail expanded section */
  .execution-detail {
    padding: var(--space-5) var(--space-6);
    border-top: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    background: var(--surface-0);

    &__block {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    &__label {
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;

      &--error { color: var(--accent-danger); }
    }

    &__pre {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      color: var(--text-secondary);
      background: var(--surface-1);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: var(--space-5);
      white-space: pre-wrap;
      word-break: break-word;
      line-height: var(--leading-relaxed);
      margin: 0;

      &--error {
        background: var(--accent-danger-muted);
        border-color: var(--accent-danger);
        color: var(--accent-danger);
      }
    }
  }

  /* Edit history */
  .history-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .history-entry {
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-6);
      border-bottom: 1px solid var(--border-subtle);
      background: var(--surface-2);
    }

    &__editor {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
    }

    &__date {
      font-size: var(--text-xs);
      color: var(--text-muted);
      white-space: nowrap;
    }

    &__changes {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      color: var(--text-secondary);
      padding: var(--space-5) var(--space-6);
      white-space: pre-wrap;
      word-break: break-word;
      line-height: var(--leading-relaxed);
      margin: 0;
    }
  }

  @media (max-width: 640px) {
    .task-detail__header-top {
      flex-direction: column;
      align-items: flex-start;
    }

    .task-detail__actions {
      width: 100%;
      flex-wrap: wrap;
    }

    .task-meta-grid {
      grid-template-columns: 1fr 1fr;
    }

    .execution-row__date {
      display: none;
    }
  }
</style>
