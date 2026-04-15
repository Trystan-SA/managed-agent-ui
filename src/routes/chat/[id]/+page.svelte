<script lang="ts">
  import { page } from '$app/stores';
  import Badge from '$components/Badge.svelte';
  import ChatView from '$components/ChatView.svelte';
  import type { ChatMessage as ChatMessageData } from '$lib/utils/chatEvents';

  const { data } = $props();

  const sessionId = $derived($page.params.id);
  const sessionObj = $derived(data.session as Record<string, unknown> | undefined);
  const sessionTitle = $derived((sessionObj?.title ?? sessionObj?.name ?? 'Untitled') as string);
  const agentId = $derived(sessionObj?.agent_id as string | undefined);
  const environmentId = $derived(sessionObj?.environment_id as string | undefined);
  const model = $derived(sessionObj?.model as string | undefined);
  const createdAt = $derived(sessionObj?.created_at as string | undefined);
  const initialStatus = $derived((sessionObj?.status as string | undefined) ?? 'idle');

  const preloadedMessages = (data.messages as ChatMessageData[] | undefined) ?? [];

  // Track live status from ChatView so the header badge stays in sync.
  let status = $state(initialStatus);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
</script>

<svelte:head>
  <title>{sessionTitle} | Chat | Managed Agents</title>
</svelte:head>

<div class="chat-detail">
  <div class="chat-detail__header">
    <a href="/dashboard" class="back-link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Dashboard
    </a>

    <div class="title-row">
      <h1 class="title-row__name">{sessionTitle}</h1>
      <Badge {status} size="sm" />
      {#if model}
        <span class="pill pill--model">{model}</span>
      {/if}
    </div>

    {#if createdAt}
      <p class="chat-detail__meta">Created {formatDate(createdAt)}</p>
    {/if}
  </div>

  <div class="sections">
    <section class="section-card section-card--compact">
      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-item__label">Session ID</span>
          <code class="meta-item__value">{sessionId}</code>
        </div>
        {#if agentId}
          <div class="meta-item">
            <span class="meta-item__label">Agent</span>
            <a href="/agents/{agentId}" class="meta-item__value meta-item__link">{agentId}</a>
          </div>
        {/if}
        {#if environmentId}
          <div class="meta-item">
            <span class="meta-item__label">Environment</span>
            <a href="/environments/{environmentId}" class="meta-item__value meta-item__link">{environmentId}</a>
          </div>
        {/if}
      </div>
    </section>

    <section class="section-card section-card--chat">
      <div class="section-card__header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <h2 class="section-card__title">Conversation</h2>
      </div>

      <div class="chat-detail__view">
        <ChatView
          {sessionId}
          {preloadedMessages}
          preloadedStatus={initialStatus}
          composerPlaceholder="Continue the conversation…"
          onStatusChange={(s) => (status = s)}
        >
          {#snippet emptyState()}
            <p class="chat-detail__empty">Send a message below to start the conversation.</p>
          {/snippet}
        </ChatView>
      </div>
    </section>
  </div>
</div>

<style lang="scss">
  /* === Page wrapper — identical to agents/[id] === */
  .chat-detail {
    max-width: 720px;
    padding-bottom: var(--space-12);

    &__header { margin-bottom: var(--space-6); }
    &__meta { font-size: var(--text-sm); color: var(--text-muted); margin-top: var(--space-2); }

    &__view {
      min-height: 320px;
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      // Uniform inner padding for the single-column card layout.
      --chat-view-padding: var(--space-6);
    }

    &__empty {
      font-size: var(--text-sm);
      color: var(--text-muted);
      font-style: italic;
      text-align: center;
      padding: var(--space-8) 0;
    }
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: color var(--transition-fast);
    &:hover { color: var(--accent-primary); }
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
    margin-top: var(--space-4);

    &__name {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      color: var(--text-primary);
      line-height: var(--leading-tight);
    }
  }

  .pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: var(--weight-semibold);
    border-radius: var(--radius-full);
    white-space: nowrap;

    &--model { background: var(--accent-primary-muted); color: var(--accent-primary); }
  }

  /* === Sections === */
  .sections {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .section-card {
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-6);

    &--compact { padding: var(--space-5) var(--space-6); }
    &--chat { padding: 0; display: flex; flex-direction: column; }

    &__header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-5) var(--space-6);
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
    }

    &__title { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--text-primary); }
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-5);
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);

    &__label { font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    &__value { font-size: var(--text-sm); color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    &__link { color: var(--accent-primary); text-decoration: none; &:hover { color: var(--accent-primary-hover); } }
    code { font-family: var(--font-mono); font-size: var(--text-xs); user-select: all; }
  }

  @media (max-width: 640px) {
    .meta-grid { grid-template-columns: 1fr; }
  }
</style>
