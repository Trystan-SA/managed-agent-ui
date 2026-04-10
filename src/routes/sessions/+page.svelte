<script lang="ts">
  import EmptyState from '$components/EmptyState.svelte';
  import iconSessions from '$lib/assets/icons/empty-sessions.svg';

  const { data } = $props();

  let confirmAction = $state<{ type: 'archive' | 'delete'; id: string } | null>(null);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'running': return 'running';
      case 'idle': return 'idle';
      case 'terminated': return 'terminated';
      case 'archived': return 'archived';
      default: return 'unknown';
    }
  }

  async function doAction() {
    if (!confirmAction) return;
    const { type, id } = confirmAction;
    if (type === 'archive') {
      await fetch(`/api/sessions/${id}/archive`, { method: 'POST' });
    } else {
      await fetch(`/api/sessions/${id}/delete`, { method: 'DELETE' });
    }
    confirmAction = null;
    window.location.reload();
  }

  const runningSessions = $derived(data.sessions.filter((s: Record<string, unknown>) => s.status === 'running'));
  const otherSessions = $derived(data.sessions.filter((s: Record<string, unknown>) => s.status !== 'running'));
</script>

<svelte:head>
  <title>Sessions | Managed Agents</title>
</svelte:head>

{#if confirmAction}
  <div class="confirm-backdrop" onclick={() => (confirmAction = null)} role="presentation">
    <div class="confirm-modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (confirmAction = null)}>
      <p class="confirm-modal__text">
        {confirmAction.type === 'delete'
          ? 'Delete this session? This action cannot be undone.'
          : 'Archive this session?'}
      </p>
      <div class="confirm-modal__actions">
        <button class="confirm-modal__btn confirm-modal__btn--cancel" onclick={() => (confirmAction = null)}>Cancel</button>
        <button class="confirm-modal__btn confirm-modal__btn--danger" onclick={doAction}>
          {confirmAction.type === 'delete' ? 'Delete' : 'Archive'}
        </button>
      </div>
    </div>
  </div>
{/if}

<div class="sessions-page">
  <div class="sessions-page__header">
    <div>
      <h1 class="sessions-page__title">Sessions</h1>
      <p class="sessions-page__subtitle">
        {data.sessions.length} total{#if runningSessions.length > 0}, {runningSessions.length} running{/if}
      </p>
    </div>
    <a href="/chat" class="btn-new">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M14 8c0 3.314-2.686 6-6 6a6.1 6.1 0 0 1-2.8-.68L2 14l.68-3.2A6.1 6.1 0 0 1 2 8c0-3.314 2.686-6 6-6s6 2.686 6 6z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      New Chat
    </a>
  </div>

  {#if data.sessions.length === 0}
    <EmptyState
      icon={iconSessions}
      title="No sessions yet."
      description="Start a chat with an agent to create one."
      actionHref="/chat"
      actionLabel="Start chat"
    />
  {:else}
    <!-- Running sessions -->
    {#if runningSessions.length > 0}
      <div class="section-label">
        <span class="section-label__dot section-label__dot--running"></span>
        Running
      </div>
      <div class="session-grid">
        {#each runningSessions as session (session.id)}
          <a href="/chat/{session.id}" class="session-card session-card--running">
            <div class="session-card__top">
              <span class="session-card__title">{session.title ?? session.name ?? 'Untitled'}</span>
              <span class="status-dot" data-status="running"></span>
            </div>
            <code class="session-card__id">{(session.id as string).slice(0, 16)}</code>
            <div class="session-card__footer">
              {#if session.agent_id}
                <span class="session-card__agent">Agent {(session.agent_id as string)?.slice(0, 8)}</span>
              {/if}
              <span class="session-card__date">{formatDate(session.created_at as string)} {formatTime(session.created_at as string)}</span>
            </div>
          </a>
        {/each}
      </div>
    {/if}

    <!-- Other sessions -->
    {#if otherSessions.length > 0}
      {#if runningSessions.length > 0}
        <div class="section-label" style="margin-top: var(--space-8);">Recent</div>
      {/if}
      <div class="session-list">
        {#each otherSessions as session (session.id)}
          <div class="session-row">
            <a href="/sessions/{session.id}" class="session-row__main">
              <div class="session-row__left">
                <span class="status-dot" data-status={getStatusColor((session.status as string) ?? 'unknown')}></span>
                <div class="session-row__info">
                  <span class="session-row__title">{session.title ?? session.name ?? 'Untitled'}</span>
                  <code class="session-row__id">{(session.id as string).slice(0, 16)}</code>
                </div>
              </div>
              <div class="session-row__right">
                <span class="session-row__status" data-status={session.status}>{session.status ?? 'unknown'}</span>
                <span class="session-row__date">{formatDate(session.created_at as string)}</span>
              </div>
            </a>
            <div class="session-row__actions">
              {#if session.status === 'idle'}
                <a href="/chat/{session.id}" class="action-btn action-btn--resume" title="Resume chat">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M5 3l8 5-8 5V3z" fill="currentColor"/>
                  </svg>
                </a>
              {/if}
              <button class="action-btn" title="Archive" onclick={() => (confirmAction = { type: 'archive', id: session.id as string })}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M4 4v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4M6 2h4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <button class="action-btn action-btn--danger" title="Delete" onclick={() => (confirmAction = { type: 'delete', id: session.id as string })}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .sessions-page {
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

  .section-label {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: var(--space-4);

    &__dot {
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);

      &--running {
        background: var(--accent-success);
        box-shadow: 0 0 0 3px var(--accent-success-muted);
        animation: pulse 2s ease-in-out infinite;
      }
    }
  }

  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 3px var(--accent-success-muted); }
    50% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.05); }
  }

  /* ---- Running sessions as cards ---- */
  .session-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-4);
  }

  .session-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-5) var(--space-6);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    text-decoration: none;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

    &:hover { border-color: var(--accent-primary); box-shadow: 0 4px 16px rgba(79, 70, 229, 0.08); }

    &--running { border-left: 3px solid var(--accent-success); }

    &__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    &__title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__id {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    &__footer {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-top: var(--space-2);
      padding-top: var(--space-3);
      border-top: 1px solid var(--border-subtle);
    }

    &__agent {
      font-size: var(--text-xs);
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    &__date {
      font-size: var(--text-xs);
      color: var(--text-muted);
      margin-left: auto;
    }
  }

  /* ---- Other sessions as rows ---- */
  .session-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .session-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    transition: border-color var(--transition-fast);

    &:hover { border-color: var(--border-strong); }

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
      gap: 1px;
      min-width: 0;
    }

    &__title {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__id {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
    }

    &__right {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      flex-shrink: 0;
    }

    &__status {
      font-size: 11px;
      font-weight: var(--weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 1px 7px;
      border-radius: var(--radius-full);

      &[data-status='idle'] { background: var(--accent-info-muted); color: var(--accent-info); }
      &[data-status='terminated'] { background: var(--surface-3); color: var(--text-muted); }
      &[data-status='archived'] { background: var(--accent-danger-muted); color: var(--accent-danger); }
    }

    &__date {
      font-size: var(--text-xs);
      color: var(--text-muted);
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

    &[data-status='running'] { background: var(--accent-success); box-shadow: 0 0 0 2px var(--accent-success-muted); }
    &[data-status='idle'] { background: var(--accent-info); }
    &[data-status='terminated'] { background: var(--text-muted); }
    &[data-status='archived'] { background: var(--accent-danger); }
    &[data-status='unknown'] { background: var(--border-strong); }
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
    &--resume:hover { background: var(--accent-primary-muted); color: var(--accent-primary); }
    &--danger:hover { background: var(--accent-danger-muted); color: var(--accent-danger); }
  }

  /* ---- Confirm modal ---- */
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

      &--cancel {
        background: var(--surface-2); color: var(--text-primary); border-color: var(--border-default);
        &:hover { background: var(--surface-3); }
      }
      &--danger {
        background: var(--accent-danger); color: #fff;
        &:hover { background: var(--accent-danger-hover); }
      }
    }
  }

  @media (max-width: 640px) {
    .session-grid { grid-template-columns: 1fr; }
    .session-row__right { display: none; }
  }
</style>
