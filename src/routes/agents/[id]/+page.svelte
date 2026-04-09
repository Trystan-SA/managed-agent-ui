<script lang="ts">
  import { goto } from '$app/navigation';

  let { data } = $props();
  let archiving = $state(false);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function truncate(text: string, max: number): string {
    if (!text || text.length <= max) return text || '-';
    return text.slice(0, max) + '...';
  }

  function getToolNames(agent: any): string[] {
    if (!agent.tools?.length) return [];
    const tools: string[] = [];
    for (const tool of agent.tools) {
      if (tool.type === 'agent') {
        const allTools = ['bash', 'read', 'write', 'edit', 'glob', 'grep', 'web_fetch', 'web_search'];
        const disabled = tool.disabled_tools ?? [];
        tools.push(...allTools.filter(t => !disabled.includes(t)));
      }
    }
    return tools;
  }

  async function handleArchive() {
    if (!confirm(`Are you sure you want to archive "${data.agent.name}"? This action cannot be undone.`)) {
      return;
    }

    archiving = true;
    try {
      const res = await fetch(`/api/agents/${data.agent.id}/archive`, {
        method: 'POST'
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Archive failed (${res.status})`);
      }

      await goto('/agents');
    } catch (err: any) {
      alert(err.message);
    } finally {
      archiving = false;
    }
  }
</script>

<svelte:head>
  <title>{data.agent.name} | Agents | Managed Agents</title>
</svelte:head>

<div class="page-header">
  <div>
    <div class="agent-header">
      <h1 class="page-header__title">{data.agent.name}</h1>
      <span class="badge badge--info">{data.agent.model}</span>
      <span class="badge">v{data.agent.version ?? 1}</span>
      {#if data.agent.archived_at}
        <span class="badge badge--terminated">Archived</span>
      {/if}
    </div>
    <p class="page-header__subtitle">Created {formatDate(data.agent.created_at)}</p>
  </div>
  <div class="page-header__actions">
    <a href="/agents" class="btn--secondary">Back</a>
    {#if !data.agent.archived_at}
      <a href="/agents/{data.agent.id}/edit" class="btn--secondary">Edit</a>
      <button class="btn--danger" onclick={handleArchive} disabled={archiving}>
        {archiving ? 'Archiving...' : 'Archive'}
      </button>
    {/if}
  </div>
</div>

<div class="detail-grid">
  <section class="detail-card">
    <h2 class="detail-card__title">System Prompt</h2>
    {#if data.agent.instructions}
      <pre class="prompt-block">{data.agent.instructions}</pre>
    {:else}
      <p class="detail-card__empty">No system prompt configured</p>
    {/if}
  </section>

  <section class="detail-card">
    <h2 class="detail-card__title">Tools</h2>
    {#if getToolNames(data.agent).length > 0}
      <div class="tool-tags">
        {#each getToolNames(data.agent) as tool}
          <span class="badge badge--info badge--sm">{tool}</span>
        {/each}
      </div>
    {:else}
      <p class="detail-card__empty">No tools enabled</p>
    {/if}
  </section>
</div>

{#if data.versions.length > 0}
  <section class="versions-section">
    <h2 class="versions-section__title">Version History</h2>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Version</th>
            <th>Updated</th>
            <th>System Prompt</th>
          </tr>
        </thead>
        <tbody>
          {#each data.versions as version}
            <tr>
              <td>v{version.version}</td>
              <td>{formatDate(version.updated_at ?? version.created_at)}</td>
              <td class="prompt-snippet">{truncate(version.instructions ?? '', 80)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
{/if}

<style lang="scss">
  .agent-header {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .detail-grid {
    display: grid;
    gap: var(--space-6);
    margin-bottom: var(--space-8);
  }

  .detail-card {
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-6);

    &__title {
      font-size: var(--text-md);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      margin-bottom: var(--space-4);
    }

    &__empty {
      font-size: var(--text-sm);
      color: var(--text-muted);
      font-style: italic;
    }
  }

  .prompt-block {
    background: var(--surface-2);
    border: 1px solid var(--border-default);
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
  }

  .tool-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .versions-section {
    margin-top: var(--space-6);

    &__title {
      font-size: var(--text-md);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      margin-bottom: var(--space-4);
    }
  }

  .prompt-snippet {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-muted);
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
