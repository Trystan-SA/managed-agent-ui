<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import Badge from '$components/Badge.svelte';
  import ChatView, { type ChatSession } from '$components/ChatView.svelte';
  import { apiFetch } from '$lib/utils/api';

  const { data } = $props();

  // --- Types ---
  interface Session { id: string; title?: string; name?: string; status?: string; agent_id?: string; created_at?: string; [key: string]: unknown; }
  interface McpServerRef { name: string; type: 'url'; url: string; }
  interface Agent { id: string; name: string; model: string | Record<string, unknown>; mcp_servers?: McpServerRef[]; [key: string]: unknown; }
  interface Environment { id: string; name: string; config?: { networking?: { type?: string } }; [key: string]: unknown; }

  // --- Session list (sidebar) ---
  let localSessions: Session[] = $state([...(data.sessions as Session[])]);
  const activeSessions = $derived(localSessions.filter((s) => s.status === 'running'));
  const pastSessions = $derived(localSessions.filter((s) => s.status !== 'running'));

  // --- Agents / Environments (for new chat form) ---
  const agents = $derived((data.agents ?? []) as Agent[]);
  const environments = $derived((data.environments ?? []) as Environment[]);

  // --- API key gate ---
  const apiKeyConfigured = $derived(data.apiKeyConfigured !== false);
  const isAdmin = $derived(data.userRole === 'admin');

  // --- User connections (for MCP status row on agent selection) ---
  const connectedMcpUrls = new SvelteSet<string>();
  let connectionsLoaded = $state(false);

  async function loadConnections() {
    try {
      const res = await apiFetch<{ services: { service: { mcpServerUrl: string }; connected: boolean }[] }>(
        '/api/connections'
      );
      connectedMcpUrls.clear();
      for (const s of res.services) {
        if (s.connected) connectedMcpUrls.add(s.service.mcpServerUrl);
      }
    } catch {
      // Non-fatal — the status row just won't appear.
    } finally {
      connectionsLoaded = true;
    }
  }

  // --- New chat form ---
  let selectedAgentId = $state('');
  let selectedEnvId = $state('');

  $effect(() => {
    if (!selectedAgentId && agents.length > 0) selectedAgentId = agents[0].id;
  });

  const selectedAgent = $derived(agents.find((a) => a.id === selectedAgentId));
  const selectedAgentMcpStatus = $derived(
    (selectedAgent?.mcp_servers ?? []).map((srv) => ({
      name: srv.name,
      url: srv.url,
      connected: connectedMcpUrls.has(srv.url)
    }))
  );
  const hasMissingMcp = $derived(selectedAgentMcpStatus.some((s) => !s.connected));

  // --- Current chat state (minimal; ChatView owns messages + streaming) ---
  let currentSessionId = $state<string | null>(null);
  let currentSession = $state<Session | null>(null);
  let status = $state<string>('idle');

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
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name ?? agentId.slice(0, 10);
  }

  function getNetworkingType(env: Environment): string {
    return env.config?.networking?.type ?? 'unrestricted';
  }

  // --- Session lifecycle ---
  function selectSession(session: Session) {
    currentSessionId = session.id;
    currentSession = session;
    status = (session.status as string) ?? 'idle';
  }

  function startNewChat() {
    currentSessionId = null;
    currentSession = null;
    status = 'idle';
  }

  // ChatView invokes this when the user sends their first message without a
  // session — we create one via the API and hand it back.
  async function createSession(): Promise<ChatSession | null> {
    if (!selectedAgentId) return null;
    const body: Record<string, unknown> = { agent: selectedAgentId };
    if (selectedEnvId) body.environment_id = selectedEnvId;
    return await apiFetch<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  function onSessionCreated(session: ChatSession) {
    currentSessionId = session.id;
    currentSession = session as Session;
    localSessions = [session as Session, ...localSessions];
  }

  function onStatusChange(next: string) {
    status = next;
    // Reflect the live status on the sidebar badge as well.
    if (currentSessionId) {
      const idx = localSessions.findIndex((s) => s.id === currentSessionId);
      if (idx !== -1 && localSessions[idx].status !== next) {
        localSessions[idx] = { ...localSessions[idx], status: next };
      }
    }
  }

  onMount(() => {
    if (apiKeyConfigured) void loadConnections();
  });
</script>

<svelte:head>
  <title>Dashboard — Managed Agents</title>
</svelte:head>

<div class="dashboard">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar__header">Conversations</div>

    <div class="sidebar__new">
      <button
        class="sidebar__new-btn"
        onclick={startNewChat}
        class:sidebar__new-btn--active={!hasActiveChat}
        disabled={!apiKeyConfigured}
      >
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
    {#if !apiKeyConfigured}
      <div class="no-key">
        <div class="no-key__card">
          <div class="no-key__icon">
            <svg width="28" height="28" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.5 1.5a3.5 3.5 0 0 1 .885 6.889L11 8.5l-1 1-1 1-1.5.5-.5 1.5H5v1.5H3.5V13H2v-1.5l5.111-5.111A3.5 3.5 0 0 1 10.5 1.5z" />
              <circle cx="11" cy="5" r="1" fill="currentColor" />
            </svg>
          </div>
          <h3 class="no-key__title">API key required</h3>
          {#if isAdmin}
            <p class="no-key__desc">Add your Anthropic API key in Settings to start creating agents and chatting.</p>
            <a class="no-key__cta" href="/settings">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
              Configure API key
            </a>
          {:else}
            <p class="no-key__desc">Your admin hasn't configured an Anthropic API key yet. Contact them to get started.</p>
          {/if}
        </div>
      </div>
    {:else}
      <header class="main__header">
        <div class="main__header-left">
          <h2 class="main__header-title">{chatTitle}</h2>
          {#if hasActiveChat}
            <Badge {status} size="sm" />
          {/if}
        </div>
      </header>

      <div class="main__view">
        <ChatView
          sessionId={currentSessionId}
          {createSession}
          {onSessionCreated}
          {onStatusChange}
          canSend={hasActiveChat || !!selectedAgentId}
          composerPlaceholder={hasActiveChat ? 'Continue the conversation…' : 'Type your first message…'}
        >
          {#snippet emptyState()}
            {#if hasActiveChat}
              <div class="welcome">
                <div class="welcome__icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p class="welcome__desc">Send a message to continue the conversation.</p>
              </div>
            {:else}
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
                          <option value={agent.id}>{agent.name}</option>
                        {/each}
                      </select>
                    {/if}
                  </div>

                  {#if connectionsLoaded && selectedAgentMcpStatus.length > 0}
                    <div class="welcome__field">
                      <label class="welcome__label">
                        MCP servers
                        {#if hasMissingMcp}
                          <span class="welcome__optional welcome__optional--warn">action needed</span>
                        {/if}
                      </label>
                      <ul class="mcp-status">
                        {#each selectedAgentMcpStatus as srv (srv.url)}
                          <li class="mcp-status__row" class:mcp-status__row--ok={srv.connected}>
                            {#if srv.connected}
                              <span class="mcp-status__dot mcp-status__dot--ok" aria-hidden="true"></span>
                              <span class="mcp-status__name">{srv.name}</span>
                              <span class="mcp-status__hint">connected</span>
                            {:else}
                              <span class="mcp-status__dot mcp-status__dot--warn" aria-hidden="true"></span>
                              <span class="mcp-status__name">{srv.name}</span>
                              <a class="mcp-status__action" href="/connections">Connect →</a>
                            {/if}
                          </li>
                        {/each}
                      </ul>
                    </div>
                  {/if}

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
            {/if}
          {/snippet}
        </ChatView>
      </div>
    {/if}
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

    &__view {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      // Parent-controlled column padding: cap at 820px, fall back to 16px.
      --chat-view-padding: var(--space-8) max(var(--space-6), calc((100% - 820px) / 2)) var(--space-10);
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

    &__optional--warn { color: var(--accent-warning); }
  }

  /* === MCP status row in welcome form === */
  .mcp-status {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);

    &__row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
    }

    &__dot {
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);
      flex-shrink: 0;

      &--ok { background: var(--accent-success); }
      &--warn { background: var(--accent-warning); }
    }

    &__name {
      flex: 1;
      color: var(--text-primary);
      font-weight: var(--weight-medium);
    }

    &__hint {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    &__action {
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--accent-primary);
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }
  }

  /* === No API key state === */
  .no-key {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-10);

    &__card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      max-width: 420px;
      padding: var(--space-10) var(--space-8);
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      text-align: center;
      box-shadow: var(--shadow-sm);
    }

    &__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: var(--radius-lg);
      background: var(--accent-primary-muted);
      color: var(--accent-primary);
      margin-bottom: var(--space-2);
    }

    &__title {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      margin: 0;
    }

    &__desc {
      font-size: var(--text-sm);
      color: var(--text-muted);
      line-height: var(--leading-normal);
      margin: 0;
    }

    &__cta {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      margin-top: var(--space-4);
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: #fff;
      background: var(--accent-primary);
      border-radius: var(--radius-md);
      text-decoration: none;
      transition: background var(--transition-fast);

      &:hover { background: var(--accent-primary-hover); }
    }
  }

  .sidebar__new-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* === Responsive === */
  @media (max-width: 768px) {
    .sidebar { display: none; }
  }
</style>
