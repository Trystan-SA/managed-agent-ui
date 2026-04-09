<script lang="ts">
  import Badge from '$components/Badge.svelte';

  let { data } = $props();

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function truncateId(id: string): string {
    return id.slice(0, 12);
  }

  async function archiveSession(id: string) {
    if (!confirm('Are you sure you want to archive this session?')) return;
    await fetch(`/api/sessions/${id}/archive`, { method: 'POST' });
    window.location.reload();
  }

  async function deleteSession(id: string) {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) return;
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    window.location.reload();
  }
</script>

<svelte:head>
  <title>Sessions | Managed Agents</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1 class="page-header__title">Sessions</h1>
    <p class="page-header__subtitle">View and manage your agent sessions</p>
  </div>
</div>

{#if data.sessions.length === 0}
  <div class="table-wrap">
    <div class="table-empty">
      <div class="table-empty__icon">&#128172;</div>
      <p class="table-empty__title">No sessions yet</p>
      <p class="table-empty__description">Sessions will appear here once you start interacting with agents.</p>
    </div>
  </div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>Session ID</th>
          <th>Title</th>
          <th>Status</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each data.sessions as session}
          <tr
            class="table__row--clickable"
            onclick={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('.actions-cell')) return;
              window.location.href = `/sessions/${session.id}`;
            }}
          >
            <td>
              <a href="/sessions/{session.id}" class="session-id">
                <code>{truncateId(session.id)}</code>
              </a>
            </td>
            <td>{session.title ?? session.name ?? '-'}</td>
            <td>
              <Badge status={session.status ?? 'unknown'} size="sm" />
            </td>
            <td>{formatDate(session.created_at)}</td>
            <td class="actions-cell">
              <div class="actions-cell__buttons">
                <button class="btn btn--ghost btn--sm" onclick={() => archiveSession(session.id)}>
                  Archive
                </button>
                <button class="btn btn--danger btn--sm" onclick={() => deleteSession(session.id)}>
                  Delete
                </button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style lang="scss">
  .session-id {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--accent-primary);

    &:hover {
      color: var(--accent-primary-hover);
    }
  }

  .actions-cell {
    &__buttons {
      display: flex;
      gap: var(--space-3);
    }
  }
</style>
