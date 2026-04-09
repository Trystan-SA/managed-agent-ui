<script lang="ts">
  let { data } = $props();

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
</script>

<svelte:head>
  <title>Agents | Managed Agents</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1 class="page-header__title">Agents</h1>
    <p class="page-header__subtitle">Manage your configured agents</p>
  </div>
  <div class="page-header__actions">
    <a href="/agents/new" class="btn">New Agent</a>
  </div>
</div>

{#if data.agents.length === 0}
  <div class="table-wrap">
    <div class="table-empty">
      <div class="table-empty__icon">&#x1F916;</div>
      <p class="table-empty__title">No agents yet</p>
      <p class="table-empty__description">Create your first agent to get started with managed agent workflows.</p>
    </div>
  </div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Model</th>
          <th>Version</th>
          <th>Created</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each data.agents as agent}
          <tr
            class="table__row--clickable"
            onclick={() => window.location.href = `/agents/${agent.id}`}
          >
            <td>
              <a href="/agents/{agent.id}" class="agent-name">{agent.name}</a>
            </td>
            <td>
              <span class="badge badge--info">{agent.model}</span>
            </td>
            <td>{agent.version ?? '-'}</td>
            <td>{formatDate(agent.created_at)}</td>
            <td>
              {#if agent.archived_at}
                <span class="badge badge--terminated">Archived</span>
              {:else}
                <span class="badge badge--idle">Active</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style lang="scss">
  .agent-name {
    font-weight: var(--weight-medium);
    color: var(--text-primary);

    &:hover {
      color: var(--accent-primary);
    }
  }
</style>
