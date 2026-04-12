<script lang="ts">
  import EmptyState from '$components/EmptyState.svelte';
  import iconAgents from '$lib/assets/icons/empty-agents.svg?raw';

  const { data } = $props();

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getModelId(agent: Record<string, unknown>): string {
    return typeof agent.model === 'string' ? agent.model : (agent.model as Record<string, unknown>)?.id as string ?? '';
  }

  function getModelLabel(m: string): string {
    const map: Record<string, string> = {
      'claude-sonnet-4-6': 'Sonnet 4.6',
      'claude-opus-4-6': 'Opus 4.6',
      'claude-haiku-4-5-20251001': 'Haiku 4.5',
      'claude-haiku-4-5': 'Haiku 4.5',
      'claude-opus-4-5': 'Opus 4.5',
      'claude-sonnet-4-5': 'Sonnet 4.5'
    };
    return map[m] ?? m;
  }

  function getModelTier(m: string): string {
    if (m.includes('opus')) return 'premium';
    if (m.includes('haiku')) return 'fast';
    return 'balanced';
  }

  function getEnabledToolCount(agent: Record<string, unknown>): number {
    const tools = agent.tools as Record<string, unknown>[] | undefined;
    if (!tools?.length) return 0;
    const allTools = ['bash', 'read', 'write', 'edit', 'glob', 'grep', 'web_fetch', 'web_search'];
    for (const tool of tools) {
      if (tool.type === 'agent_toolset_20260401') {
        const configs = (tool.configs ?? []) as Record<string, unknown>[];
        return allTools.filter(t => {
          const cfg = configs.find((c: Record<string, unknown>) => c.name === t);
          return cfg ? cfg.enabled !== false : true;
        }).length;
      }
    }
    return 0;
  }

  function getDescription(agent: Record<string, unknown>): string {
    return (agent.description ?? agent.system ?? '') as string;
  }

  const activeAgents = $derived(data.agents.filter((a: Record<string, unknown>) => !a.archived_at));
  const archivedAgents = $derived(data.agents.filter((a: Record<string, unknown>) => a.archived_at));
  let showArchived = $state(false);
</script>

<svelte:head>
  <title>Agents | Managed Agents</title>
</svelte:head>

<div class="agents-page">
  <div class="agents-page__header">
    <div>
      <h1 class="agents-page__title">Agents</h1>
      <p class="agents-page__subtitle">{activeAgents.length} active{#if archivedAgents.length > 0}, {archivedAgents.length} archived{/if}</p>
    </div>
    <a href="/agents/new" class="btn-new">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      New Agent
    </a>
  </div>

  {#if data.agents.length === 0}
    <EmptyState
      icon={iconAgents}
      title="No agents yet."
      description="Create one to define a model, tools, and instructions."
      actionHref="/agents/new"
      actionLabel="Create agent"
    />
  {:else}
    <div class="agent-grid">
      {#each activeAgents as agent (agent.id)}
        {@const mid = getModelId(agent)}
        {@const desc = getDescription(agent)}
        {@const toolCount = getEnabledToolCount(agent)}
        <a href="/agents/{agent.id}" class="agent-card">
          <div class="agent-card__top">
            <span class="agent-card__name">{agent.name}</span>
            <span class="agent-card__version">v{agent.version ?? 1}</span>
          </div>

          {#if desc}
            <p class="agent-card__desc">{desc.length > 100 ? desc.slice(0, 100) + '...' : desc}</p>
          {:else}
            <p class="agent-card__desc agent-card__desc--empty">No description</p>
          {/if}

          <div class="agent-card__footer">
            <span class="agent-card__model" data-tier={getModelTier(mid)}>{getModelLabel(mid)}</span>
            {#if toolCount > 0}
              <span class="agent-card__tools">{toolCount} tools</span>
            {/if}
            <span class="agent-card__date">{formatDate(agent.created_at as string)}</span>
          </div>
        </a>
      {/each}
    </div>

    {#if archivedAgents.length > 0}
      <div class="archived-section">
        <button class="archived-toggle" onclick={() => (showArchived = !showArchived)}>
          <svg
            width="12" height="12" viewBox="0 0 16 16" fill="none"
            class="archived-toggle__chevron"
            class:archived-toggle__chevron--open={showArchived}
          >
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {archivedAgents.length} archived agent{archivedAgents.length !== 1 ? 's' : ''}
        </button>

        {#if showArchived}
          <div class="agent-grid agent-grid--archived">
            {#each archivedAgents as agent (agent.id)}
              {@const mid = getModelId(agent)}
              <a href="/agents/{agent.id}" class="agent-card agent-card--archived">
                <div class="agent-card__top">
                  <span class="agent-card__name">{agent.name}</span>
                  <span class="agent-card__status-archived">Archived</span>
                </div>
                <div class="agent-card__footer">
                  <span class="agent-card__model" data-tier={getModelTier(mid)}>{getModelLabel(mid)}</span>
                  <span class="agent-card__date">{formatDate(agent.created_at as string)}</span>
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .agents-page {
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
    transition: background var(--transition-fast), box-shadow var(--transition-fast);
    flex-shrink: 0;

    &:hover {
      background: var(--accent-primary-hover);
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
    }
  }

  /* ---- Card grid ---- */
  .agent-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--space-4);

    &--archived {
      margin-top: var(--space-4);
    }
  }

  .agent-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-6);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    text-decoration: none;
    transition:
      border-color var(--transition-fast),
      box-shadow var(--transition-fast),
      transform var(--transition-fast);

    &:hover {
      border-color: var(--accent-primary);
      box-shadow: 0 4px 16px rgba(79, 70, 229, 0.08);
      transform: translateY(-1px);
    }

    &--archived {
      opacity: 0.6;
      gap: var(--space-2);
      padding: var(--space-5);

      &:hover {
        opacity: 0.85;
        border-color: var(--border-strong);
        box-shadow: none;
        transform: none;
      }
    }

    &__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    &__name {
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      line-height: var(--leading-tight);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    &__version {
      flex-shrink: 0;
      font-size: 11px;
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
      color: var(--accent-info);
      background: var(--accent-info-muted);
      padding: 1px 7px;
      border-radius: var(--radius-full);
    }

    &__status-archived {
      flex-shrink: 0;
      font-size: 10px;
      font-weight: var(--weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--accent-danger);
      background: var(--accent-danger-muted);
      padding: 1px 7px;
      border-radius: var(--radius-full);
    }

    &__desc {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      line-height: var(--leading-normal);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: calc(var(--text-sm) * 2 * 1.5);

      &--empty {
        color: var(--text-muted);
        font-style: italic;
      }
    }

    &__footer {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-top: auto;
      padding-top: var(--space-3);
      border-top: 1px solid var(--border-subtle);
    }

    &__model {
      font-size: 11px;
      font-weight: var(--weight-semibold);
      padding: 1px 7px;
      border-radius: var(--radius-sm);

      &[data-tier='balanced'] { color: var(--accent-primary); background: var(--accent-primary-muted); }
      &[data-tier='premium'] { color: var(--accent-warning); background: var(--accent-warning-muted); }
      &[data-tier='fast'] { color: var(--accent-success); background: var(--accent-success-muted); }
    }

    &__tools {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    &__date {
      font-size: var(--text-xs);
      color: var(--text-muted);
      margin-left: auto;
    }
  }

  /* ---- Archived section ---- */
  .archived-section {
    margin-top: var(--space-8);
    padding-top: var(--space-6);
    border-top: 1px solid var(--border-subtle);
  }

  .archived-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast), background var(--transition-fast);

    &:hover {
      color: var(--text-secondary);
      background: var(--surface-2);
    }

    &__chevron {
      transition: transform var(--transition-fast);

      &--open {
        transform: rotate(90deg);
      }
    }
  }

  @media (max-width: 640px) {
    .agent-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
