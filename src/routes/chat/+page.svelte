<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import EmptyState from '$components/EmptyState.svelte';
  import iconIdle from '$lib/assets/icons/empty-idle.svg';

  interface Agent {
    id: string;
    name: string;
    model: string;
    archived_at?: string | null;
  }

  interface Environment {
    id: string;
    name: string;
    config?: { networking?: { type?: string } };
    archived_at?: string | null;
  }

  interface Session {
    id: string;
    title?: string;
    name?: string;
    status: string;
    agent?: string;
    agent_id?: string;
    created_at: string;
  }

  let agents = $state<Agent[]>([]);
  let environments = $state<Environment[]>([]);
  let idleSessions = $state<Session[]>([]);
  let agentsMap = $state<Record<string, Agent>>({});

  let selectedAgentId = $state('');
  let selectedEnvId = $state('');
  let title = $state('');

  let loadingAgents = $state(true);
  let loadingEnvs = $state(true);
  let loadingSessions = $state(true);
  let submitting = $state(false);
  let error = $state('');

  onMount(async () => {
    const [agentsRes, envsRes, sessionsRes] = await Promise.allSettled([
      apiFetch<Agent[]>('/api/agents'),
      apiFetch<Environment[]>('/api/environments'),
      apiFetch<Session[]>('/api/sessions')
    ]);

    if (agentsRes.status === 'fulfilled') {
      agents = agentsRes.value.filter((a) => !a.archived_at);
      agentsMap = Object.fromEntries(agents.map((a) => [a.id, a]));
      if (agents.length > 0) selectedAgentId = agents[0].id;
    }
    loadingAgents = false;

    if (envsRes.status === 'fulfilled') {
      environments = envsRes.value.filter((e) => !e.archived_at);
      if (environments.length > 0) selectedEnvId = environments[0].id;
    }
    loadingEnvs = false;

    if (sessionsRes.status === 'fulfilled') {
      idleSessions = sessionsRes.value.filter((s) => s.status === 'idle');
    }
    loadingSessions = false;
  });

  async function handleStartSession(e: SubmitEvent) {
    e.preventDefault();
    if (!selectedAgentId) return;
    error = '';
    submitting = true;

    try {
      const body: Record<string, unknown> = {
        agent: selectedAgentId
      };
      if (selectedEnvId) body.environment_id = selectedEnvId;
      if (title.trim()) body.title = title.trim();

      const session = await apiFetch<{ id: string }>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      await goto(`/chat/${session.id}`);
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to start session';
    } finally {
      submitting = false;
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getSessionLabel(session: Session): string {
    return session.title || session.name || session.id.slice(0, 12);
  }

  function getNetworkingType(env: Environment): string {
    return env.config?.networking?.type ?? 'unrestricted';
  }
</script>

<svelte:head>
  <title>Chat | Managed Agents</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1 class="page-header__title">Chat</h1>
    <p class="page-header__subtitle">Start a new agent session or resume an existing one</p>
  </div>
</div>

<div class="chat-landing">
  <section class="chat-section">
    <h2 class="section-title">New Session</h2>

    {#if error}
      <div class="alert alert--error">{error}</div>
    {/if}

    <form class="session-form" onsubmit={handleStartSession}>
      <div class="form-group">
        <label class="form-label" for="agent">Agent</label>
        {#if loadingAgents}
          <div class="form-loading">Loading agents...</div>
        {:else if agents.length === 0}
          <div class="form-empty">
            No active agents found. <a href="/agents/new">Create an agent</a> first.
          </div>
        {:else}
          <select id="agent" class="form-input" bind:value={selectedAgentId}>
            {#each agents as agent}
              <option value={agent.id}>{agent.name} — {agent.model}</option>
            {/each}
          </select>
        {/if}
      </div>

      <div class="form-group">
        <label class="form-label" for="environment">
          Environment
          <span class="form-label__hint">optional</span>
        </label>
        {#if loadingEnvs}
          <div class="form-loading">Loading environments...</div>
        {:else if environments.length === 0}
          <div class="form-empty">
            No active environments. <a href="/environments/new">Create one</a> or proceed without.
          </div>
        {:else}
          <select id="environment" class="form-input" bind:value={selectedEnvId}>
            <option value="">None</option>
            {#each environments as env}
              <option value={env.id}>{env.name} — {getNetworkingType(env)}</option>
            {/each}
          </select>
        {/if}
      </div>

      <div class="form-group">
        <label class="form-label" for="title">
          Title
          <span class="form-label__hint">optional</span>
        </label>
        <input
          id="title"
          class="form-input"
          type="text"
          bind:value={title}
          placeholder="e.g. Debug auth issue"
          maxlength="200"
        />
      </div>

      <div class="form-actions">
        <button
          type="submit"
          class="btn"
          disabled={submitting || !selectedAgentId || loadingAgents}
        >
          {submitting ? 'Starting...' : 'Start Session'}
        </button>
      </div>
    </form>
  </section>

  <section class="chat-section">
    <h2 class="section-title">Resume Session</h2>

    {#if loadingSessions}
      <div class="form-loading">Loading sessions...</div>
    {:else if idleSessions.length === 0}
      <EmptyState
        icon={iconIdle}
        title="No idle sessions."
        description="Start a new one above, or check all sessions."
        actionHref="/sessions"
        actionLabel="All sessions"
      />
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Title / ID</th>
              <th>Agent</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each idleSessions as session}
              <tr
                class="table__row--clickable"
                onclick={() => goto(`/chat/${session.id}`)}
              >
                <td>
                  <span class="session-label">{getSessionLabel(session)}</span>
                  {#if session.title || session.name}
                    <span class="session-id-sub">{session.id.slice(0, 12)}</span>
                  {/if}
                </td>
                <td>
                  {#if session.agent && agentsMap[session.agent]}
                    <span class="badge badge--info">{agentsMap[session.agent].name}</span>
                  {:else if session.agent_id && agentsMap[session.agent_id]}
                    <span class="badge badge--info">{agentsMap[session.agent_id].name}</span>
                  {:else}
                    <span class="text-muted">—</span>
                  {/if}
                </td>
                <td class="text-muted">{formatDate(session.created_at)}</td>
                <td>
                  <a
                    href="/chat/{session.id}"
                    class="btn btn--secondary btn--sm"
                    onclick={(e) => e.stopPropagation()}
                  >
                    Resume
                  </a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</div>

<style lang="scss">
  .chat-landing {
    display: flex;
    flex-direction: column;
    gap: var(--space-10);
  }

  .chat-section {
    max-width: 720px;
  }

  .section-title {
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    color: var(--text-primary);
    margin-bottom: var(--space-6);
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--border-default);
  }

  .session-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .form-label__hint {
    font-size: var(--text-xs);
    font-weight: var(--weight-normal);
    color: var(--text-tertiary);
    margin-left: var(--space-2);
  }

  .form-loading {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    padding: var(--space-3) 0;
  }

  .form-empty {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    padding: var(--space-3) var(--space-4);
    background: var(--surface-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);

    a {
      color: var(--accent-primary);

      &:hover {
        color: var(--accent-primary-hover);
      }
    }
  }

  .form-actions {
    display: flex;
    gap: var(--space-3);
    padding-top: var(--space-2);
  }

  .alert {
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    margin-bottom: var(--space-2);

    &--error {
      background: var(--accent-danger-muted);
      border: 1px solid var(--accent-danger);
      color: var(--text-primary);
    }
  }

  .session-label {
    font-weight: var(--weight-medium);
    color: var(--text-primary);
    display: block;
  }

  .session-id-sub {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    display: block;
    margin-top: var(--space-1);
  }

  .text-muted {
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }

</style>
