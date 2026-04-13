<script lang="ts">
  import { onDestroy } from 'svelte';
  import ChatMessage from '$components/ChatMessage.svelte';
  import Badge from '$components/Badge.svelte';
  import { apiFetch } from '$lib/utils/api';
  import { applyEventToMessages, type ContentBlock } from '$lib/utils/chatEvents';

  const { data } = $props();

  // --- Types ---
  interface Session { id: string; title?: string; name?: string; status?: string; agent_id?: string; created_at?: string; [key: string]: unknown; }
  interface Agent { id: string; name: string; model: string | Record<string, unknown>; [key: string]: unknown; }
  interface Environment { id: string; name: string; config?: { networking?: { type?: string } }; [key: string]: unknown; }

  // --- Session list (sidebar) ---
  let localSessions: Session[] = $derived([...(data.sessions as Session[])]);
  const activeSessions = $derived(localSessions.filter(s => s.status === 'running'));
  const pastSessions = $derived(localSessions.filter(s => s.status !== 'running'));

  // --- Agents / Environments (for new chat form) ---
  const agents = $derived((data.agents ?? []) as Agent[]);
  const environments = $derived((data.environments ?? []) as Environment[]);

  // --- Current chat state ---
  let currentSessionId = $state<string | null>(null);
  let currentSession = $state<Session | null>(null);
  const messages: { role: 'user' | 'assistant'; content: ContentBlock[] }[] = $state([]);
  let status: string = $state('idle');
  let inputText: string = $state('');
  let evtSource: EventSource | null = $state(null);

  // --- New chat form ---
  let selectedAgentId = $state('');
  let selectedEnvId = $state('');

  $effect(() => {
    if (!selectedAgentId && agents.length > 0) selectedAgentId = agents[0].id;
  });

  // --- Scroll ---
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

  // --- Derived ---
  const isRunning = $derived(status === 'running');
  const hasActiveChat = $derived(currentSessionId !== null);
  const chatTitle = $derived(
    currentSession
      ? ((currentSession.title ?? currentSession.name ?? currentSession.id.slice(0, 12)) as string)
      : 'New Chat'
  );

  // --- Helpers ---
  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function getAgentName(agentId: string | undefined): string {
    if (!agentId) return '';
    const agent = agents.find(a => a.id === agentId);
    return agent?.name ?? agentId.slice(0, 10);
  }

  function getModelId(agent: Agent): string {
    return typeof agent.model === 'string' ? agent.model : (agent.model?.id as string) ?? '';
  }

  function getNetworkingType(env: Environment): string {
    return env.config?.networking?.type ?? 'unrestricted';
  }

  // --- Session selection ---
  async function selectSession(session: Session) {
    closeStream();
    messages.length = 0;
    currentSessionId = session.id;
    currentSession = session;
    status = (session.status as string) ?? 'idle';

    // Load conversation history from Anthropic — fetched fresh each time since
    // idle sessions may have been advanced by other clients.
    try {
      const { events } = await apiFetch<{ events: ContentBlock[] }>(`/api/sessions/${session.id}/events`);
      // Guard against a race if the user quickly switched to another session.
      if (currentSessionId !== session.id) return;
      for (const ev of events) {
        applyEventToMessages(messages, ev);
      }
      shouldAutoScroll = true;
      scrollToBottom();
    } catch (err) {
      if (currentSessionId !== session.id) return;
      messages.push({
        role: 'assistant',
        content: [{ type: 'text', text: `Failed to load history: ${err instanceof Error ? err.message : 'Unknown error'}` }]
      });
    }
  }

  function startNewChat() {
    closeStream();
    messages.length = 0;
    currentSessionId = null;
    currentSession = null;
    status = 'idle';
  }

  // --- SSE Streaming ---
  function openStream(sessionId: string) {
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
        updateSessionStatus(sessionId, 'idle');
      }
    };
  }

  function closeStream() {
    if (evtSource) { evtSource.close(); evtSource = null; }
  }

  function updateSessionStatus(sessionId: string, newStatus: string) {
    const idx = localSessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      localSessions[idx] = { ...localSessions[idx], status: newStatus };
    }
  }

  function handleStreamEvent(eventData: ContentBlock) {
    // The user message was pushed optimistically in sendMessage(); skip the
    // server echo so we don't duplicate it.
    if (eventData.type === 'user.message') return;
    if (eventData.type === 'session.status_idle') {
      status = 'idle';
      if (currentSessionId) updateSessionStatus(currentSessionId, 'idle');
      closeStream();
      return;
    }
    if (eventData.type === 'session.status_running') {
      status = 'running';
      if (currentSessionId) updateSessionStatus(currentSessionId, 'running');
      return;
    }
    if (applyEventToMessages(messages, eventData)) scrollToBottom();
  }

  // --- Send message ---
  async function sendMessage() {
    const text = inputText.trim();
    if (!text || isRunning) return;

    // If no session yet, create one first
    if (!currentSessionId) {
      if (!selectedAgentId) return;
      try {
        const body: Record<string, unknown> = { agent: selectedAgentId };
        if (selectedEnvId) body.environment_id = selectedEnvId;

        const session = await apiFetch<Session>('/api/sessions', {
          method: 'POST',
          body: JSON.stringify(body)
        });

        currentSessionId = session.id;
        currentSession = session;
        localSessions = [session, ...localSessions];
      } catch (err) {
        messages.push({ role: 'assistant', content: [{ type: 'text', text: `Error creating session: ${err instanceof Error ? err.message : 'Unknown error'}` }] });
        return;
      }
    }

    messages.push({ role: 'user', content: [{ type: 'text', text }] });
    inputText = '';
    status = 'running';
    shouldAutoScroll = true;
    scrollToBottom();

    try {
      await apiFetch(`/api/sessions/${currentSessionId}/events`, {
        method: 'POST',
        body: JSON.stringify({ events: [{ type: 'user.message', content: [{ type: 'text', text }] }] })
      });
      openStream(currentSessionId);
    } catch (err) {
      status = 'idle';
      messages.push({ role: 'assistant', content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : 'Failed to send message'}` }] });
    }
  }

  async function interrupt() {
    if (!currentSessionId) return;
    try {
      await apiFetch(`/api/sessions/${currentSessionId}/events`, {
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
  <title>Dashboard — Managed Agents</title>
</svelte:head>

<div class="dashboard">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar__header">Conversations</div>

    <div class="sidebar__new">
      <button class="sidebar__new-btn" onclick={startNewChat} class:sidebar__new-btn--active={!hasActiveChat}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Chat
      </button>
    </div>

    <div class="sidebar__list">
      {#if activeSessions.length > 0}
        <div class="sidebar__group-label">
          <span class="sidebar__group-dot sidebar__group-dot--active"></span>
          Active
        </div>
        {#each activeSessions as session (session.id)}
          <button
            class="sidebar__item"
            class:sidebar__item--active={currentSessionId === session.id}
            onclick={() => selectSession(session)}
          >
            <div class="sidebar__item-info">
              <span class="sidebar__item-title">{session.title ?? session.name ?? session.id.slice(0, 12)}</span>
              <span class="sidebar__item-meta">{getAgentName(session.agent_id)} &middot; {formatDate(session.created_at)}</span>
            </div>
            <Badge status="running" size="sm" />
          </button>
        {/each}
      {/if}

      {#if pastSessions.length > 0}
        {#if activeSessions.length > 0}
          <div class="sidebar__group-label">Past</div>
        {/if}
        {#each pastSessions as session (session.id)}
          <button
            class="sidebar__item"
            class:sidebar__item--active={currentSessionId === session.id}
            onclick={() => selectSession(session)}
          >
            <div class="sidebar__item-info">
              <span class="sidebar__item-title">{session.title ?? session.name ?? session.id.slice(0, 12)}</span>
              <span class="sidebar__item-meta">{getAgentName(session.agent_id)} &middot; {formatDate(session.created_at)}</span>
            </div>
            {#if session.status}
              <Badge status={session.status} size="sm" />
            {/if}
          </button>
        {/each}
      {/if}

      {#if localSessions.length === 0}
        <p class="sidebar__empty">No conversations yet</p>
      {/if}
    </div>
  </aside>

  <!-- Main chat area -->
  <main class="main">
    <!-- Header -->
    <header class="main__header">
      <div class="main__header-left">
        <h2 class="main__header-title">{chatTitle}</h2>
        {#if hasActiveChat}
          <Badge {status} size="sm" />
        {/if}
      </div>
      <div class="main__header-right">
        {#if isRunning}
          <button class="main__stop" onclick={interrupt}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
            Stop
          </button>
        {/if}
      </div>
    </header>

    <!-- Messages / Welcome -->
    <div class="main__messages" bind:this={scrollContainer} onscroll={checkScrollPosition}>
      {#if !hasActiveChat && messages.length === 0}
        <!-- New chat: agent selector -->
        <div class="welcome">
          <div class="welcome__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 class="welcome__title">Start a conversation</h3>
          <p class="welcome__desc">Select an agent and send your first message.</p>

          <div class="welcome__form">
            <div class="welcome__field">
              <label class="welcome__label" for="agent-select">Agent</label>
              {#if agents.length === 0}
                <p class="welcome__hint">No agents available. <a href="/agents/new">Create one</a> first.</p>
              {:else}
                <select id="agent-select" class="welcome__select" bind:value={selectedAgentId}>
                  {#each agents as agent (agent.id)}
                    <option value={agent.id}>{agent.name} — {getModelId(agent)}</option>
                  {/each}
                </select>
              {/if}
            </div>

            <div class="welcome__field">
              <label class="welcome__label" for="env-select">
                Environment
                <span class="welcome__optional">optional</span>
              </label>
              {#if environments.length === 0}
                <p class="welcome__hint">No environments. Agent will run without one.</p>
              {:else}
                <select id="env-select" class="welcome__select" bind:value={selectedEnvId}>
                  <option value="">None</option>
                  {#each environments as env (env.id)}
                    <option value={env.id}>{env.name} — {getNetworkingType(env)}</option>
                  {/each}
                </select>
              {/if}
            </div>
          </div>
        </div>
      {:else if hasActiveChat && messages.length === 0}
        <!-- Existing session, no messages yet -->
        <div class="welcome">
          <div class="welcome__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p class="welcome__desc">Send a message to continue the conversation.</p>
        </div>
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

    <!-- Input bar -->
    <div class="main__input">
      <div class="main__input-inner">
        <textarea
          class="main__textarea"
          placeholder={isRunning ? 'Agent is responding...' : hasActiveChat ? 'Type a message...' : 'Type your first message...'}
          bind:value={inputText}
          onkeydown={handleKeydown}
          disabled={isRunning || (!hasActiveChat && !selectedAgentId)}
          rows="1"
        ></textarea>
        <button
          class="main__send"
          onclick={sendMessage}
          disabled={isRunning || !inputText.trim() || (!hasActiveChat && !selectedAgentId)}
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  </main>
</div>

<style lang="scss">
  .dashboard {
    display: flex;
    height: calc(100vh - 56px);
    overflow: hidden;
  }

  /* === Sidebar === */
  .sidebar {
    width: 280px;
    flex-shrink: 0;
    background: var(--surface-1);
    border-right: 1px solid var(--border-default);
    display: flex;
    flex-direction: column;
    height: 100%;

    &__header {
      padding: var(--space-5) var(--space-6) var(--space-3);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    &__new {
      padding: 0 var(--space-3) var(--space-3);
    }

    &__new-btn {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--accent-primary);
      background: var(--accent-primary-muted);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background var(--transition-fast);

      &:hover { background: var(--surface-2); }
      &--active { background: var(--accent-primary-muted); color: var(--accent-primary); }
    }

    &__list {
      flex: 1;
      overflow-y: auto;
      padding: 0 var(--space-3);
      scrollbar-width: thin;
      scrollbar-color: var(--border-strong) transparent;
    }

    &__group-label {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-3) var(--space-2);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    &__group-dot {
      width: 6px;
      height: 6px;
      border-radius: var(--radius-full);

      &--active {
        background: var(--accent-success);
        box-shadow: 0 0 0 2px var(--accent-success-muted);
      }
    }

    &__item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-3) var(--space-4);
      background: none;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      text-align: left;
      font-family: var(--font-sans);
      transition: background var(--transition-fast);

      &:hover { background: var(--surface-2); }

      &--active {
        background: var(--accent-primary-muted);
        &:hover { background: var(--accent-primary-muted); }
      }
    }

    &__item-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    &__item-title {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__item-meta {
      font-size: var(--text-xs);
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__empty {
      padding: var(--space-6) var(--space-4);
      font-size: var(--text-sm);
      color: var(--text-muted);
      text-align: center;
      font-style: italic;
    }
  }

  /* === Main chat area === */
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--surface-0);

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-6);
      background: var(--surface-1);
      border-bottom: 1px solid var(--border-default);
      flex-shrink: 0;
    }

    &__header-left {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-width: 0;
    }

    &__header-title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__header-right {
      flex-shrink: 0;
    }

    &__stop {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      font-family: var(--font-sans);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: #fff;
      background: var(--accent-danger);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background var(--transition-fast);
      &:hover { background: var(--accent-danger-hover); }
    }

    &__messages {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: var(--space-6);
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      scrollbar-width: thin;
      scrollbar-color: var(--border-strong) transparent;
    }

    &__input {
      flex-shrink: 0;
      border-top: 1px solid var(--border-default);
      background: var(--surface-1);
      padding: var(--space-4) var(--space-6);
    }

    &__input-inner {
      display: flex;
      align-items: flex-end;
      gap: var(--space-3);
      max-width: 720px;
      margin: 0 auto;
    }

    &__textarea {
      flex: 1;
      min-height: 40px;
      max-height: 160px;
      resize: none;
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--surface-0);
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

  /* === Welcome / New chat state === */
  .welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: var(--space-3);
    padding: var(--space-10);

    &__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: var(--radius-lg);
      background: var(--surface-2);
      color: var(--text-muted);
      margin-bottom: var(--space-2);
    }

    &__title {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
    }

    &__desc {
      font-size: var(--text-sm);
      color: var(--text-muted);
    }

    &__form {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
      width: 100%;
      max-width: 360px;
      margin-top: var(--space-6);
    }

    &__field {
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

    &__optional {
      font-weight: var(--weight-normal);
      text-transform: none;
      letter-spacing: normal;
      margin-left: var(--space-2);
      color: var(--text-muted);
    }

    &__select {
      width: 100%;
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      outline: none;
      transition: border-color var(--transition-fast);

      &:hover { border-color: var(--border-strong); }
      &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px var(--accent-primary-muted); }
    }

    &__hint {
      font-size: var(--text-sm);
      color: var(--text-muted);

      a {
        color: var(--accent-primary);
        &:hover { color: var(--accent-primary-hover); }
      }
    }
  }

  /* === Responsive === */
  @media (max-width: 768px) {
    .sidebar { display: none; }
  }
</style>
