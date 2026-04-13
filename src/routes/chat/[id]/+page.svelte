<script lang="ts">
  import { onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import ChatMessage from '$components/ChatMessage.svelte';
  import Badge from '$components/Badge.svelte';
  import { apiFetch } from '$lib/utils/api';
  import { applyEventToMessages, type ChatMessage as ChatMessageData, type ContentBlock } from '$lib/utils/chatEvents';

  const { data } = $props();

  const messages: ChatMessageData[] = $state((data.messages as ChatMessageData[] | undefined) ?? []);
  let status: string = $state('idle');
  let inputText: string = $state('');
  let evtSource: EventSource | null = $state(null);

  $effect(() => {
    const s = (data.session as Record<string, unknown> | undefined)?.status as string | undefined;
    if (s && status === 'idle') status = s;
  });

  let scrollContainer: HTMLDivElement | undefined = $state(undefined);
  let shouldAutoScroll: boolean = $state(true);

  function checkScrollPosition() {
    if (!scrollContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    shouldAutoScroll = scrollHeight - scrollTop - clientHeight < 80;
  }

  function scrollToBottom() {
    if (scrollContainer && shouldAutoScroll) {
      requestAnimationFrame(() => { scrollContainer!.scrollTop = scrollContainer!.scrollHeight; });
    }
  }

  $effect(() => {
    void messages.length;
    if (messages.length > 0) void messages[messages.length - 1].content.length;
    scrollToBottom();
  });

  const isRunning = $derived(status === 'running');
  const sessionId = $derived($page.params.id);
  const sessionObj = $derived(data.session as Record<string, unknown> | undefined);
  const sessionTitle = $derived((sessionObj?.title ?? sessionObj?.name ?? 'Untitled') as string);
  const agentId = $derived(sessionObj?.agent_id as string | undefined);
  const environmentId = $derived(sessionObj?.environment_id as string | undefined);
  const model = $derived(sessionObj?.model as string | undefined);
  const createdAt = $derived(sessionObj?.created_at as string | undefined);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  // --- SSE ---
  function openStream() {
    closeStream();
    const src = new EventSource(`/api/sessions/${sessionId}/stream`);
    evtSource = src;
    src.onmessage = (event) => {
      try { handleStreamEvent(JSON.parse(event.data)); }
      catch { /* no-op */ }
    };
    src.onerror = () => {
      if (src.readyState === EventSource.CLOSED) {
        closeStream();
        if (status === 'running') status = 'idle';
      }
    };
  }

  function closeStream() {
    if (evtSource) { evtSource.close(); evtSource = null; }
  }

  function handleStreamEvent(eventData: ContentBlock) {
    // The user message was pushed optimistically in sendMessage(); skip the
    // server echo so we don't duplicate it.
    if (eventData.type === 'user.message') return;
    if (eventData.type === 'session.status_idle') { status = 'idle'; closeStream(); return; }
    if (eventData.type === 'session.status_running') { status = 'running'; return; }
    if (applyEventToMessages(messages, eventData)) scrollToBottom();
  }

  async function sendMessage() {
    const text = inputText.trim();
    if (!text || isRunning) return;
    messages.push({ role: 'user', content: [{ type: 'text', text }] });
    inputText = '';
    status = 'running';
    shouldAutoScroll = true;
    scrollToBottom();
    try {
      await apiFetch(`/api/sessions/${sessionId}/events`, {
        method: 'POST',
        body: JSON.stringify({ events: [{ type: 'user.message', content: [{ type: 'text', text }] }] })
      });
      openStream();
    } catch (err) {
      status = 'idle';
      messages.push({ role: 'assistant', content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : 'Failed to send message'}` }] });
    }
  }

  async function interrupt() {
    try {
      await apiFetch(`/api/sessions/${sessionId}/events`, {
        method: 'POST',
        body: JSON.stringify({ events: [{ type: 'user.interrupt' }] })
      });
    } catch { /* no-op */ }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  onDestroy(() => { closeStream(); });
</script>

<svelte:head>
  <title>{sessionTitle} | Chat | Managed Agents</title>
</svelte:head>

<div class="chat-detail">
  <!-- Header: back-link + title row + meta — same as agents/[id] -->
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

  <!-- Actions bar -->
  <div class="actions-bar">
    {#if isRunning}
      <button class="actions-bar__btn actions-bar__btn--danger-fill" onclick={interrupt}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
        Stop
      </button>
    {/if}
  </div>

  <!-- Session info card -->
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

    <!-- Chat card -->
    <section class="section-card section-card--chat">
      <div class="section-card__header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <h2 class="section-card__title">Conversation</h2>
        {#if messages.length > 0}
          <span class="section-card__count">{messages.length} messages</span>
        {/if}
      </div>

      <!-- Messages area -->
      <div class="chat-messages" bind:this={scrollContainer} onscroll={checkScrollPosition}>
        {#if messages.length === 0}
          <p class="section-card__empty">Send a message below to start the conversation.</p>
        {/if}

        {#each messages as msg, index (index)}
          <ChatMessage role={msg.role} content={msg.content} />
        {/each}

        {#if isRunning}
          {@const lastMsg = messages[messages.length - 1]}
          {#if !lastMsg || lastMsg.role !== 'assistant' || lastMsg.content.length === 0}
            <div class="chat__typing">
              <div class="chat__typing-dots"><span></span><span></span><span></span></div>
              Agent is thinking...
            </div>
          {:else}
            <div class="chat__streaming">Streaming...</div>
          {/if}
        {/if}
      </div>

      <!-- Input area -->
      <div class="chat-input">
        <textarea
          class="chat-input__field"
          placeholder={isRunning ? 'Agent is responding...' : 'Type a message...'}
          bind:value={inputText}
          onkeydown={handleKeydown}
          disabled={isRunning}
          rows="1"
        ></textarea>
        <button
          class="chat-input__send"
          onclick={sendMessage}
          disabled={isRunning || !inputText.trim()}
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
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

  /* === Actions bar === */
  .actions-bar {
    display: flex;
    gap: var(--space-3);
    margin-bottom: var(--space-8);
    min-height: var(--space-9);

    &__btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      cursor: pointer;
      transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
      text-decoration: none;

      &--danger-fill {
        background: var(--accent-danger);
        color: #fff;
        &:hover { background: var(--accent-danger-hover); box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25); }
      }
    }
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
    &__count { margin-left: auto; font-size: var(--text-xs); color: var(--text-muted); font-variant-numeric: tabular-nums; }
    &__empty { font-size: var(--text-sm); color: var(--text-muted); font-style: italic; padding: var(--space-8) 0; text-align: center; }
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

  /* === Chat messages area inside the card === */
  .chat-messages {
    min-height: 200px;
    max-height: 60vh;
    overflow-y: auto;
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    scrollbar-width: thin;
    scrollbar-color: var(--border-strong) transparent;
  }

  /* === Input bar at bottom of card === */
  .chat-input {
    display: flex;
    align-items: flex-end;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--border-subtle);
    background: var(--surface-0);
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);

    &__field {
      flex: 1;
      min-height: 40px;
      max-height: 160px;
      resize: none;
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      outline: none;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

      &::placeholder { color: var(--text-muted); }
      &:hover { border-color: var(--border-strong); }
      &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px var(--accent-primary-muted); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    &__send {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      padding: 0;
      background: var(--accent-primary);
      color: #fff;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background var(--transition-fast);

      &:hover { background: var(--accent-primary-hover); }
      &:disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
    }
  }

  @media (max-width: 640px) {
    .meta-grid { grid-template-columns: 1fr; }
  }
</style>
