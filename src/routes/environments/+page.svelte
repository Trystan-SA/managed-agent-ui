<script lang="ts">
  import { formatDate } from '$lib/utils/format';
  import EmptyState from '$components/EmptyState.svelte';
  import iconEnvs from '$lib/assets/icons/empty-environments.svg?raw';

  const { data } = $props();

  function getNetworkingType(env: Record<string, unknown>): string {
    const config = env.config as Record<string, unknown> | undefined;
    const networking = config?.networking as Record<string, unknown> | undefined;
    return (networking?.type as string) ?? 'unrestricted';
  }

  function getAllowedHostsCount(env: Record<string, unknown>): number {
    const config = env.config as Record<string, unknown> | undefined;
    const networking = config?.networking as Record<string, unknown> | undefined;
    const hosts = networking?.allowed_hosts as string[] | undefined;
    return hosts?.length ?? 0;
  }

  function getPackageManagers(env: Record<string, unknown>): Array<{ name: string; count: number }> {
    const config = env.config as Record<string, unknown> | undefined;
    const packages = config?.packages as Record<string, string[]> | undefined;
    if (!packages) return [];
    return Object.entries(packages)
      .filter(([, pkgs]) => Array.isArray(pkgs) && pkgs.length > 0)
      .map(([name, pkgs]) => ({ name, count: pkgs.length }));
  }

  function getConfigType(env: Record<string, unknown>): string {
    const config = env.config as Record<string, unknown> | undefined;
    return (config?.type as string) ?? 'cloud';
  }

  const activeEnvs = $derived(data.environments.filter((e: Record<string, unknown>) => !e.archived_at));
  const archivedEnvs = $derived(data.environments.filter((e: Record<string, unknown>) => e.archived_at));
  let showArchived = $state(false);
</script>

<svelte:head>
  <title>Environments | Managed Agents</title>
</svelte:head>

<div class="envs-page">
  <div class="envs-page__header">
    <div>
      <h1 class="envs-page__title">Environments</h1>
      <p class="envs-page__subtitle">
        {activeEnvs.length} active{#if archivedEnvs.length > 0}, {archivedEnvs.length} archived{/if}
      </p>
    </div>
    <a href="/environments/new" class="btn-new">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      New Environment
    </a>
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
    <div class="env-grid">
      {#each activeEnvs as env (env.id)}
        {@const netType = getNetworkingType(env)}
        {@const hostsCount = getAllowedHostsCount(env)}
        {@const pkgManagers = getPackageManagers(env)}
        {@const configType = getConfigType(env)}
        <a href="/environments/{env.id}" class="env-card">
          <div class="env-card__top">
            <div class="env-card__name-row">
              <span class="env-card__status" data-active="true"></span>
              <span class="env-card__name">{env.name}</span>
            </div>
            <span class="env-card__type">{configType}</span>
          </div>

          <div class="env-card__attrs">
            <div class="env-card__attr" data-variant={netType === 'limited' ? 'limited' : 'open'}>
              {#if netType === 'limited'}
                <svg class="env-card__attr-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 2 1.5 3.5 2.5 4.5l2 2 2-2c1-1 2.5-2.5 2.5-4.5A4.5 4.5 0 0 0 8 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="8" cy="6" r="1.5" stroke="currentColor" stroke-width="1.2"/>
                </svg>
              {:else}
                <svg class="env-card__attr-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2"/>
                  <path d="M2 8h12M8 2c1.5 1.5 2.5 3.5 2.5 6s-1 4.5-2.5 6c-1.5-1.5-2.5-3.5-2.5-6s1-4.5 2.5-6z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              {/if}
              <span>{netType}</span>
              {#if netType === 'limited' && hostsCount > 0}
                <span class="env-card__attr-detail">{hostsCount} host{hostsCount !== 1 ? 's' : ''}</span>
              {/if}
            </div>

            {#if pkgManagers.length > 0}
              <div class="env-card__attr" data-variant="packages">
                <svg class="env-card__attr-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1l6 3v8l-6 3-6-3V4l6-3z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
                  <path d="M8 8v7M2 4l6 4 6-4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {#each pkgManagers as pm (pm.name)}
                  <span class="env-card__pkg-pill">{pm.name} <span class="env-card__pkg-count">{pm.count}</span></span>
                {/each}
              </div>
            {/if}
          </div>

          <div class="env-card__footer">
            <span class="env-card__date">{formatDate(env.created_at as string)}</span>
          </div>
        </a>
      {/each}
    </div>

    {#if archivedEnvs.length > 0}
      <div class="archived-section">
        <button class="archived-toggle" onclick={() => (showArchived = !showArchived)}>
          <svg
            width="12" height="12" viewBox="0 0 16 16" fill="none"
            class="archived-toggle__chevron"
            class:archived-toggle__chevron--open={showArchived}
          >
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {archivedEnvs.length} archived environment{archivedEnvs.length !== 1 ? 's' : ''}
        </button>

        {#if showArchived}
          <div class="env-grid env-grid--archived">
            {#each archivedEnvs as env (env.id)}
              {@const netType = getNetworkingType(env)}
              <a href="/environments/{env.id}" class="env-card env-card--archived">
                <div class="env-card__top">
                  <div class="env-card__name-row">
                    <span class="env-card__status" data-active="false"></span>
                    <span class="env-card__name">{env.name}</span>
                  </div>
                  <span class="env-card__status-archived">Archived</span>
                </div>
                <div class="env-card__footer">
                  <span class="env-card__net-label">{netType}</span>
                  <span class="env-card__date">{formatDate(env.created_at as string)}</span>
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
  .envs-page {
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
  .env-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-4);

    &--archived {
      margin-top: var(--space-4);
    }
  }

  .env-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
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

    &__name-row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-width: 0;
    }

    &__status {
      flex-shrink: 0;
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);
      background: var(--accent-success);

      &[data-active='false'] {
        background: var(--text-muted);
      }
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

    &__type {
      flex-shrink: 0;
      font-size: 11px;
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
      color: var(--text-muted);
      background: var(--surface-2);
      padding: 1px 7px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.03em;
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

    /* ---- Attribute rows ---- */
    &__attrs {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    &__attr {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--text-xs);
      color: var(--text-secondary);

      &[data-variant='limited'] {
        color: var(--accent-warning);
      }

      &[data-variant='open'] {
        color: var(--accent-success);
      }

      &[data-variant='packages'] {
        color: var(--accent-info);
      }
    }

    &__attr-icon {
      flex-shrink: 0;
    }

    &__attr-detail {
      font-size: var(--text-xs);
      color: var(--text-muted);
      margin-left: var(--space-1);

      &::before {
        content: '·';
        margin-right: var(--space-2);
      }
    }

    &__pkg-pill {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 11px;
      font-weight: var(--weight-medium);
      background: var(--accent-info-muted);
      color: var(--accent-info);
      padding: 0 6px;
      border-radius: var(--radius-sm);
      line-height: 1.6;
    }

    &__pkg-count {
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
      opacity: 0.7;
    }

    /* ---- Footer ---- */
    &__footer {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-top: auto;
      padding-top: var(--space-3);
      border-top: 1px solid var(--border-subtle);
    }

    &__net-label {
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
    .env-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
