<script lang="ts">
  import { formatDate } from '$lib/utils/format';
  import EmptyState from '$components/EmptyState.svelte';
  import iconEnvs from '$lib/assets/icons/empty-environments.svg';

  const { data } = $props();
</script>

<div class="page-header">
  <div>
    <h1 class="page-header__title">Environments</h1>
    <p class="page-header__subtitle">Manage sandbox environments for your agents</p>
  </div>
  <div class="page-header__actions">
    <a href="/environments/new" class="btn">New Environment</a>
  </div>
</div>

{#if data.environments.length === 0}
  <EmptyState
    icon={iconEnvs}
    title="No environments yet."
    description="Create a sandboxed runtime for your agents."
    actionHref="/environments/new"
    actionLabel="Create environment"
  />
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Networking</th>
          <th>Status</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {#each data.environments as env (env.id)}
          <tr
            class="table__row--clickable"
            onclick={() => window.location.href = `/environments/${env.id}`}
          >
            <td>
              <a href="/environments/{env.id}" style="color: var(--text-primary); font-weight: var(--weight-medium);">
                {env.name}
              </a>
            </td>
            <td>
              <span class="badge badge--info">
                {((env.config as Record<string, unknown>)?.networking as Record<string, unknown>)?.type ?? 'unrestricted'}
              </span>
            </td>
            <td>
              {#if env.archived_at}
                <span class="badge badge--terminated">Archived</span>
              {:else}
                <span class="badge badge--idle">Active</span>
              {/if}
            </td>
            <td>{formatDate(env.created_at as string)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
