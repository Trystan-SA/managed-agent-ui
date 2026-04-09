<script lang="ts">
  import Badge from '$components/Badge.svelte';
  import EventTimeline from '$components/EventTimeline.svelte';

  let { data } = $props();

  const session: any = data.session;
  const events: any[] = data.events;

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function archiveSession() {
    if (!confirm('Are you sure you want to archive this session?')) return;
    await fetch(`/api/sessions/${session.id}/archive`, { method: 'POST' });
    window.location.reload();
  }

  async function deleteSession() {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) return;
    await fetch(`/api/sessions/${session.id}`, { method: 'DELETE' });
    window.location.href = '/sessions';
  }
</script>

<svelte:head>
  <title>Session {session.id.slice(0, 12)} | Managed Agents</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1 class="page-header__title">
      Session <code class="session-id">{session.id.slice(0, 12)}</code>
    </h1>
    <p class="page-header__subtitle">
      Created {formatDate(session.created_at)}
    </p>
  </div>
  <div class="page-header__actions">
    {#if session.status === 'idle'}
      <a href="/chat/{session.id}" class="btn">Open in Chat</a>
    {/if}
    <button class="btn btn--secondary" onclick={archiveSession}>Archive</button>
    <button class="btn btn--danger" onclick={deleteSession}>Delete</button>
  </div>
</div>

<div class="session-detail">
  <!-- Session metadata -->
  <div class="session-meta">
    <div class="session-meta__item">
      <span class="session-meta__label">Status</span>
      <Badge status={session.status ?? 'unknown'} />
    </div>
    <div class="session-meta__item">
      <span class="session-meta__label">Full ID</span>
      <code class="session-meta__value session-meta__value--mono">{session.id}</code>
    </div>
    {#if session.agent_id}
      <div class="session-meta__item">
        <span class="session-meta__label">Agent</span>
        <a href="/agents/{session.agent_id}" class="session-meta__link">{session.agent_id.slice(0, 12)}</a>
      </div>
    {/if}
    {#if session.environment_id}
      <div class="session-meta__item">
        <span class="session-meta__label">Environment</span>
        <a href="/environments/{session.environment_id}" class="session-meta__link">{session.environment_id.slice(0, 12)}</a>
      </div>
    {/if}
    {#if session.model}
      <div class="session-meta__item">
        <span class="session-meta__label">Model</span>
        <span class="badge badge--info badge--sm">{session.model}</span>
      </div>
    {/if}
  </div>

  <!-- Event timeline -->
  <div class="session-events">
    <h2 class="session-events__heading">Event Timeline</h2>
    <EventTimeline {events} />
  </div>
</div>

<style lang="scss">
  .session-id {
    font-family: var(--font-mono);
    font-size: var(--text-lg);
    color: var(--accent-primary);
    font-weight: var(--weight-normal);
  }

  .session-detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .session-meta {
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-6);

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
      letter-spacing: 0.04em;
    }

    &__value {
      font-size: var(--text-sm);
      color: var(--text-secondary);

      &--mono {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        word-break: break-all;
      }
    }

    &__link {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      color: var(--accent-primary);

      &:hover {
        color: var(--accent-primary-hover);
      }
    }
  }

  .session-events {
    &__heading {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      margin-bottom: var(--space-4);
    }
  }
</style>
