<script lang="ts">
  import { goto } from '$app/navigation';
  import { formatDate } from '$lib/utils/format';
  import { apiFetch } from '$lib/utils/api';

  const { data } = $props();
  const env = $derived(data.environment);

  let archiving = $state(false);
  let deleting = $state(false);
  let confirmDelete = $state(false);
  let confirmArchive = $state(false);
  let error = $state('');

  const networking = $derived(env.config?.networking);
  const packages = $derived(env.config?.packages);

  async function handleArchive() {
    if (!confirmArchive) {
      confirmArchive = true;
      return;
    }
    archiving = true;
    error = '';
    try {
      await apiFetch(`/api/environments/${env.id}/archive`, {
        method: 'POST'
      });
      window.location.reload();
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to archive environment';
    } finally {
      archiving = false;
      confirmArchive = false;
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      confirmDelete = true;
      return;
    }
    deleting = true;
    error = '';
    try {
      await apiFetch(`/api/environments/${env.id}/delete`, { method: 'DELETE' });
      await goto('/environments');
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to delete environment';
    } finally {
      deleting = false;
      confirmDelete = false;
    }
  }
</script>

<div class="page-header">
  <div>
    <h1 class="page-header__title">{env.name}</h1>
    <p class="page-header__subtitle">
      Created {formatDate(env.created_at)}
      {#if env.archived_at}
        <span class="badge badge--terminated" style="margin-left: var(--space-3);">Archived</span>
      {/if}
    </p>
  </div>
  <div class="page-header__actions">
    <a href="/environments/{env.id}/edit" class="btn btn--secondary">Edit</a>
    <button
      class="btn btn--secondary"
      onclick={handleArchive}
      disabled={archiving || !!env.archived_at}
    >
      {#if confirmArchive}
        Confirm Archive?
      {:else}
        {archiving ? 'Archiving...' : 'Archive'}
      {/if}
    </button>
    <button
      class="btn btn--danger"
      onclick={handleDelete}
      disabled={deleting}
    >
      {#if confirmDelete}
        Confirm Delete?
      {:else}
        {deleting ? 'Deleting...' : 'Delete'}
      {/if}
    </button>
  </div>
</div>

{#if error}
  <div class="form-error" style="margin-bottom: var(--space-6);">{error}</div>
{/if}

<div class="detail-grid">
  <section class="detail-card">
    <h2 class="detail-card__title">Configuration</h2>

    <div class="detail-row">
      <span class="detail-row__label">Type</span>
      <span class="detail-row__value">{env.config?.type ?? 'cloud'}</span>
    </div>

    <div class="detail-row">
      <span class="detail-row__label">Networking</span>
      <span class="detail-row__value">
        <span class="badge" class:badge--idle={networking?.type === 'unrestricted'} class:badge--info={networking?.type === 'limited'}>
          {networking?.type ?? 'unrestricted'}
        </span>
      </span>
    </div>

    {#if networking?.type === 'limited'}
      {#if networking.allowed_hosts?.length}
        <div class="detail-row">
          <span class="detail-row__label">Allowed Hosts</span>
          <span class="detail-row__value">
            <ul class="host-list">
              {#each networking.allowed_hosts as host, index (index)}
                <li>{host}</li>
              {/each}
            </ul>
          </span>
        </div>
      {/if}

      <div class="detail-row">
        <span class="detail-row__label">MCP Servers</span>
        <span class="detail-row__value">{networking.allow_mcp_servers ? 'Allowed' : 'Blocked'}</span>
      </div>

      <div class="detail-row">
        <span class="detail-row__label">Package Managers</span>
        <span class="detail-row__value">{networking.allow_package_managers ? 'Allowed' : 'Blocked'}</span>
      </div>
    {/if}
  </section>

  {#if packages && Object.keys(packages).length > 0}
    <section class="detail-card">
      <h2 class="detail-card__title">Packages</h2>

      {#each Object.entries(packages) as [manager, pkgs] (manager)}
        <div class="detail-row">
          <span class="detail-row__label">{manager}</span>
          <span class="detail-row__value">
            {#if Array.isArray(pkgs) && pkgs.length > 0}
              <div class="pkg-list">
                {#each pkgs as pkg, index (index)}
                  <span class="badge badge--sm badge--info">{pkg}</span>
                {/each}
              </div>
            {:else}
              <span class="text-muted">None</span>
            {/if}
          </span>
        </div>
      {/each}
    </section>
  {/if}
</div>

<style>
  .detail-grid {
    display: grid;
    gap: var(--space-6);
    grid-template-columns: 1fr;
    max-width: 800px;
  }

  .detail-card {
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }

  .detail-card__title {
    font-size: var(--text-md);
    font-weight: var(--weight-semibold);
    color: var(--text-primary);
    margin-bottom: var(--space-6);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--border-subtle);
  }

  .detail-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-6);
    padding: var(--space-3) 0;
  }

  .detail-row + .detail-row {
    border-top: 1px solid var(--border-subtle);
  }

  .detail-row__label {
    flex-shrink: 0;
    width: 160px;
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
  }

  .detail-row__value {
    font-size: var(--text-sm);
    color: var(--text-primary);
  }

  .host-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .pkg-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .text-muted {
    color: var(--text-muted);
  }
</style>
