<script lang="ts">
  import { goto } from '$app/navigation';

  let { data } = $props();
  let archiving = $state(false);
  let showArchiveConfirm = $state(false);

  const agent: any = data.agent;
  const modelId: string = typeof agent.model === 'string' ? agent.model : agent.model?.id ?? '';
  const description: string = agent.description ?? agent.system ?? '';
  const isArchived = !!agent.archived_at;

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function truncate(text: string, max: number): string {
    if (!text || text.length <= max) return text || '-';
    return text.slice(0, max) + '...';
  }

  function getToolNames(): { enabled: string[]; disabled: string[] } {
    const allTools = ['bash', 'read', 'write', 'edit', 'glob', 'grep', 'web_fetch', 'web_search'];
    const enabled: string[] = [];
    const disabled: string[] = [];

    if (!agent.tools?.length) return { enabled: [], disabled: [] };

    for (const tool of agent.tools) {
      if (tool.type === 'agent_toolset_20260401') {
        const configs = tool.configs ?? [];
        for (const t of allTools) {
          const cfg = configs.find((c: any) => c.name === t);
          if (cfg ? cfg.enabled !== false : true) {
            enabled.push(t);
          } else {
            disabled.push(t);
          }
        }
      }
    }
    return { enabled, disabled };
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

  const tools = getToolNames();

  async function handleArchive() {
    archiving = true;
    try {
      const res = await fetch(`/api/agents/${agent.id}/archive`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Archive failed (${res.status})`);
      }
      await goto('/agents');
    } catch (err: any) {
      alert(err.message);
    } finally {
      archiving = false;
      showArchiveConfirm = false;
    }
  }
</script>

<svelte:head>
  <title>{agent.name} | Agents | Managed Agents</title>
</svelte:head>

<div class="agent-detail">
  <div class="agent-detail__header">
    <a href="/agents" class="back-link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Agents
    </a>

    <div class="title-row">
      <h1 class="title-row__name">{agent.name}</h1>
      <span class="pill pill--version">v{agent.version ?? 1}</span>
      <span class="pill pill--model" data-tier={getModelTier(modelId)}>{getModelLabel(modelId)}</span>
      {#if isArchived}
        <span class="pill pill--archived">Archived</span>
      {/if}
    </div>

    <p class="agent-detail__meta">
      Created {formatDate(agent.created_at)}
      {#if agent.updated_at && agent.updated_at !== agent.created_at}
        &middot; Updated {formatDate(agent.updated_at)}
      {/if}
    </p>
  </div>

  {#if !isArchived}
    <div class="actions-bar">
      <a href="/agents/{agent.id}/edit" class="actions-bar__btn actions-bar__btn--primary">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Edit Agent
      </a>
      <button
        class="actions-bar__btn actions-bar__btn--danger"
        onclick={() => (showArchiveConfirm = true)}
        disabled={archiving}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M4 4v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4M6 2h4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Archive
      </button>
    </div>
  {/if}

  {#if showArchiveConfirm}
    <div class="confirm-backdrop" onclick={() => (showArchiveConfirm = false)} role="presentation">
      <div class="confirm-modal" onclick={(e) => e.stopPropagation()} role="dialog">
        <p class="confirm-modal__text">
          Archive <strong>{agent.name}</strong>? This cannot be undone. The agent will no longer be usable in new sessions.
        </p>
        <div class="confirm-modal__actions">
          <button class="confirm-modal__btn confirm-modal__btn--cancel" onclick={() => (showArchiveConfirm = false)}>Cancel</button>
          <button class="confirm-modal__btn confirm-modal__btn--danger" onclick={handleArchive} disabled={archiving}>
            {archiving ? 'Archiving...' : 'Archive Agent'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <div class="sections">
    <section class="section-card">
      <div class="section-card__header">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 3h10M3 6.5h7M3 10h10M3 13.5h5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
        </svg>
        <h2 class="section-card__title">Description</h2>
      </div>
      {#if description}
        <pre class="prompt-block">{description}</pre>
      {:else}
        <p class="section-card__empty">No description configured</p>
      {/if}
    </section>

    <section class="section-card">
      <div class="section-card__header">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 2l1.5 3L11 6.5 8.5 9l.5 4-3-1.5L3 13l.5-4L1 6.5l3.5-1.5L6 2z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12.5" cy="3.5" r="2" stroke="currentColor" stroke-width="1.25"/>
        </svg>
        <h2 class="section-card__title">Capabilities</h2>
        <span class="section-card__count">{tools.enabled.length} / {tools.enabled.length + tools.disabled.length}</span>
      </div>
      {#if tools.enabled.length > 0 || tools.disabled.length > 0}
        <div class="tool-grid">
          {#each tools.enabled as tool}
            <span class="tool-chip tool-chip--on">{tool}</span>
          {/each}
          {#each tools.disabled as tool}
            <span class="tool-chip tool-chip--off">{tool}</span>
          {/each}
        </div>
      {:else}
        <p class="section-card__empty">No tools configured</p>
      {/if}
    </section>

    <section class="section-card section-card--compact">
      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-item__label">Agent ID</span>
          <code class="meta-item__value">{agent.id}</code>
        </div>
        <div class="meta-item">
          <span class="meta-item__label">Model</span>
          <span class="meta-item__value">{modelId}</span>
        </div>
        <div class="meta-item">
          <span class="meta-item__label">Version</span>
          <span class="meta-item__value">{agent.version ?? 1}</span>
        </div>
      </div>
    </section>
  </div>

  {#if data.versions.length > 1}
    <section class="versions">
      <h2 class="versions__title">Version History</h2>
      <div class="versions__list">
        {#each data.versions as ver, i}
          {@const verDesc = ver.description ?? ver.system ?? ''}
          <div class="version-row" class:version-row--current={i === 0}>
            <div class="version-row__marker">
              <span class="version-row__dot"></span>
              {#if i < data.versions.length - 1}
                <span class="version-row__line"></span>
              {/if}
            </div>
            <div class="version-row__content">
              <div class="version-row__header">
                <span class="version-row__label">v{ver.version}</span>
                {#if i === 0}
                  <span class="pill pill--version" style="font-size: 10px;">Current</span>
                {/if}
                <span class="version-row__date">{formatDate(ver.updated_at ?? ver.created_at)}</span>
              </div>
              {#if verDesc}
                <p class="version-row__prompt">{truncate(verDesc, 120)}</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style lang="scss">
  .agent-detail {
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

    &--version { background: var(--accent-info-muted); color: var(--accent-info); }
    &--model {
      &[data-tier='balanced'] { background: var(--accent-primary-muted); color: var(--accent-primary); }
      &[data-tier='premium'] { background: var(--accent-warning-muted); color: var(--accent-warning); }
      &[data-tier='fast'] { background: var(--accent-success-muted); color: var(--accent-success); }
    }
    &--archived { background: var(--accent-danger-muted); color: var(--accent-danger); }
  }

  .actions-bar {
    display: flex;
    gap: var(--space-3);
    margin-bottom: var(--space-8);

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

      &--primary {
        background: var(--accent-primary);
        color: #fff;
        &:hover { background: var(--accent-primary-hover); box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25); }
      }
      &--danger {
        background: var(--surface-2);
        color: var(--text-secondary);
        border-color: var(--border-default);
        &:hover { background: var(--accent-danger-muted); color: var(--accent-danger); border-color: var(--accent-danger); }
        &:disabled { opacity: 0.45; cursor: not-allowed; }
      }
    }
  }

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
    max-width: 420px;
    width: 90%;

    &__text {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      line-height: var(--leading-relaxed);
      margin-bottom: var(--space-6);
      strong { color: var(--text-primary); }
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
        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }
    }
  }

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

    &__header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-5);
      color: var(--text-muted);
    }

    &__title { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--text-primary); }
    &__count { margin-left: auto; font-size: var(--text-xs); color: var(--text-muted); font-variant-numeric: tabular-nums; }
    &__empty { font-size: var(--text-sm); color: var(--text-muted); font-style: italic; }
  }

  .prompt-block {
    background: var(--surface-0);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-5);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 400px;
    overflow-y: auto;
    margin: 0;
    line-height: var(--leading-relaxed);
  }

  .tool-grid { display: flex; flex-wrap: wrap; gap: var(--space-2); }

  .tool-chip {
    display: inline-flex;
    align-items: center;
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    border-radius: var(--radius-full);
    border: 1px solid transparent;

    &--on { background: var(--accent-primary-muted); color: var(--accent-primary); border-color: rgba(79, 70, 229, 0.15); }
    &--off { background: var(--surface-2); color: var(--text-muted); text-decoration: line-through; opacity: 0.6; }
  }

  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-5); }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);

    &__label { font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    &__value { font-size: var(--text-sm); color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    code { font-family: var(--font-mono); font-size: var(--text-xs); user-select: all; }
  }

  .versions {
    margin-top: var(--space-8);

    &__title { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--text-primary); margin-bottom: var(--space-5); }
    &__list { display: flex; flex-direction: column; }
  }

  .version-row {
    display: flex;
    gap: var(--space-4);
    min-height: 48px;

    &__marker { display: flex; flex-direction: column; align-items: center; width: 16px; flex-shrink: 0; padding-top: 5px; }
    &__dot { width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--border-strong); flex-shrink: 0; }
    &--current .version-row__dot { background: var(--accent-primary); box-shadow: 0 0 0 3px var(--accent-primary-muted); }
    &__line { width: 1px; flex: 1; background: var(--border-subtle); margin-top: var(--space-1); }
    &__content { flex: 1; padding-bottom: var(--space-5); }
    &__header { display: flex; align-items: center; gap: var(--space-3); }
    &__label { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--text-primary); font-variant-numeric: tabular-nums; }
    &__date { font-size: var(--text-xs); color: var(--text-muted); margin-left: auto; }
    &__prompt { font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-2); font-family: var(--font-mono); line-height: var(--leading-normal); }
  }

  @media (max-width: 640px) {
    .meta-grid { grid-template-columns: 1fr; }
    .actions-bar { flex-direction: column; .actions-bar__btn { justify-content: center; } }
  }
</style>
