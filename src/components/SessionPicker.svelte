<script lang="ts">
  import Badge from './Badge.svelte';

  const {
    sessions,
    currentSessionId
  }: {
    sessions: Record<string, unknown>[];
    currentSessionId?: string;
  } = $props();

  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function truncateId(id: string): string {
    if (id.length <= 12) return id;
    return id.slice(0, 12) + '...';
  }
</script>

<nav class="sidebar">
  <div class="sidebar__header">Sessions</div>

  <div class="sidebar-new">
    <a href="/chat" class="sidebar-new__button">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      New Session
    </a>
  </div>

  <div class="sidebar__items">
    {#each sessions as session (session.id)}
      {@const isActive = session.id === currentSessionId}
      <a
        href="/chat/{session.id}"
        class="sidebar__item"
        class:sidebar__item--active={isActive}
      >
        <div class="session-info">
          <span class="session-info__title">
            {session.title ?? session.name ?? truncateId(session.id)}
          </span>
          <span class="session-info__date">
            {formatDate(session.created_at ?? session.createdAt)}
          </span>
        </div>
        {#if session.status}
          <Badge status={session.status} size="sm" />
        {/if}
      </a>
    {/each}
  </div>
</nav>

<style>
  .sidebar-new {
    padding: var(--space-3) var(--space-3) var(--space-2);
  }

  .sidebar-new__button {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-4) var(--space-5);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--accent-primary);
    background: var(--accent-primary-muted);
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: background var(--transition-fast);
  }

  .sidebar-new__button:hover {
    background: var(--surface-2);
  }

  .session-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
    flex: 1;
  }

  .session-info__title {
    font-size: var(--text-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .session-info__date {
    font-size: var(--text-xs);
    color: var(--text-muted);
  }
</style>
