<script lang="ts">
  import { goto } from '$app/navigation';
  import { formatDate } from '$lib/utils/format';
  import { apiFetch } from '$lib/utils/api';

  const { data } = $props();
  const env = $derived(data.environment);

  let deleting = $state(false);
  let showDeleteConfirm = $state(false);
  let error = $state('');

  const networking = $derived(env.config?.networking);
  const packages = $derived(env.config?.packages);
  const isArchived = $derived(!!env.archived_at);

  async function handleDelete() {
    deleting = true;
    error = '';
    try {
      await apiFetch(`/api/environments/${env.id}/delete`, { method: 'DELETE' });
      await goto('/environments');
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to delete environment';
    } finally {
      deleting = false;
      showDeleteConfirm = false;
    }
  }
</script>

<svelte:head>
  <title>{env.name} | Environments | Managed Agents</title>
</svelte:head>

<div class="env-detail">
  <div class="env-detail__header">
    <a href="/environments" class="back-link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Environments
    </a>

    <div class="title-row">
      <h1 class="title-row__name">{env.name}</h1>
      <span class="pill pill--type">{env.config?.type ?? 'cloud'}</span>
      {#if isArchived}
        <span class="pill pill--archived">Archived</span>
      {:else}
        <span class="pill pill--active">Active</span>
      {/if}
    </div>

    <p class="env-detail__meta">
      Created {formatDate(env.created_at)}
      {#if env.archived_at}
        &middot; Archived {formatDate(env.archived_at)}
      {/if}
    </p>
  </div>

  {#if error}
    <div class="error-banner">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.25"/>
        <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
      </svg>
      {error}
    </div>
  {/if}

  <div class="actions-bar">
    {#if !isArchived}
      <a href="/environments/{env.id}/edit" class="actions-bar__btn actions-bar__btn--primary">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Edit
      </a>
    {/if}
    <button
      class="actions-bar__btn actions-bar__btn--danger"
      onclick={() => (showDeleteConfirm = true)}
      disabled={deleting}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
      </svg>
      Delete
    </button>
  </div>

  {#if showDeleteConfirm}
    <div class="confirm-backdrop" onclick={() => (showDeleteConfirm = false)} onkeydown={(e) => e.key === 'Escape' && (showDeleteConfirm = false)} role="presentation">
      <div class="confirm-modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
        <div class="confirm-modal__icon confirm-modal__icon--danger">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
          </svg>
        </div>
        <p class="confirm-modal__text">
          Permanently delete <strong>{env.name}</strong>? This action cannot be undone.
        </p>
        <div class="confirm-modal__actions">
          <button class="confirm-modal__btn confirm-modal__btn--cancel" onclick={() => (showDeleteConfirm = false)}>Cancel</button>
          <button class="confirm-modal__btn confirm-modal__btn--danger" onclick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Environment'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <div class="sections">
    <section class="section-card">
      <div class="section-card__header">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.25"/>
          <path d="M2 8h12M8 2c1.5 1.5 2.5 3.5 2.5 6s-1 4.5-2.5 6c-1.5-1.5-2.5-3.5-2.5-6s1-4.5 2.5-6z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h2 class="section-card__title">Networking</h2>
        <span class="pill" class:pill--open={networking?.type !== 'limited'} class:pill--limited={networking?.type === 'limited'}>
          {networking?.type ?? 'unrestricted'}
        </span>
      </div>

      {#if networking?.type === 'limited'}
        <div class="detail-rows">
          {#if networking.allowed_hosts?.length}
            <div class="detail-row">
              <span class="detail-row__label">Allowed Hosts</span>
              <div class="detail-row__value">
                <div class="host-chips">
                  {#each networking.allowed_hosts as host, index (index)}
                    <span class="host-chip">{host}</span>
                  {/each}
                </div>
              </div>
            </div>
          {/if}

          <div class="detail-row">
            <span class="detail-row__label">MCP Servers</span>
            <span class="detail-row__value">
              <span class="status-dot" data-allowed={networking.allow_mcp_servers ? 'true' : 'false'}></span>
              {networking.allow_mcp_servers ? 'Allowed' : 'Blocked'}
            </span>
          </div>

          <div class="detail-row">
            <span class="detail-row__label">Package Managers</span>
            <span class="detail-row__value">
              <span class="status-dot" data-allowed={networking.allow_package_managers ? 'true' : 'false'}></span>
              {networking.allow_package_managers ? 'Allowed' : 'Blocked'}
            </span>
          </div>
        </div>
      {:else}
        <p class="section-card__desc">All outbound network access is allowed. No host restrictions configured.</p>
      {/if}
    </section>

    {#if packages && Object.keys(packages).length > 0}
      <section class="section-card">
        <div class="section-card__header">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1l6 3v8l-6 3-6-3V4l6-3z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>
            <path d="M8 8v7M2 4l6 4 6-4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h2 class="section-card__title">Packages</h2>
        </div>

        <div class="detail-rows">
          {#each Object.entries(packages) as [manager, pkgs] (manager)}
            <div class="detail-row">
              <span class="detail-row__label">{manager}</span>
              <div class="detail-row__value">
                {#if Array.isArray(pkgs) && pkgs.length > 0}
                  <div class="pkg-chips">
                    {#each pkgs as pkg, index (index)}
                      <span class="pkg-chip">{pkg}</span>
                    {/each}
                  </div>
                {:else}
                  <span class="text-muted">None</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <section class="section-card section-card--compact">
      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-item__label">Environment ID</span>
          <code class="meta-item__value">{env.id}</code>
        </div>
        <div class="meta-item">
          <span class="meta-item__label">Type</span>
          <span class="meta-item__value">{env.config?.type ?? 'cloud'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-item__label">Created</span>
          <span class="meta-item__value">{formatDate(env.created_at)}</span>
        </div>
      </div>
    </section>
  </div>
</div>

<style lang="scss">
  .env-detail {
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
    text-decoration: none;
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

    &--type {
      background: var(--surface-2);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    &--active { background: var(--accent-success-muted); color: var(--accent-success); }
    &--archived { background: var(--accent-danger-muted); color: var(--accent-danger); }
    &--open { background: var(--accent-success-muted); color: var(--accent-success); }
    &--limited { background: var(--accent-warning-muted); color: var(--accent-warning); }
  }

  /* ---- Error banner ---- */
  .error-banner {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    margin-bottom: var(--space-6);
    background: var(--accent-danger-muted);
    color: var(--accent-danger);
    border: 1px solid var(--accent-danger);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
  }

  /* ---- Actions bar ---- */
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
      transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast), color var(--transition-fast);
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
      }

      &:disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
    }
  }

  /* ---- Confirmation modals ---- */
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

    &__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-full);
      margin-bottom: var(--space-5);

      &--danger {
        background: var(--accent-danger-muted);
        color: var(--accent-danger);
      }
    }

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
        background: var(--surface-2);
        color: var(--text-primary);
        border-color: var(--border-default);
        &:hover { background: var(--surface-3); }
      }

      &--danger {
        background: var(--accent-danger);
        color: #fff;
        &:hover { background: var(--accent-danger-hover); }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }
    }
  }

  /* ---- Content sections ---- */
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
    &__desc { font-size: var(--text-sm); color: var(--text-muted); line-height: var(--leading-normal); }
  }

  .detail-rows {
    display: flex;
    flex-direction: column;
  }

  .detail-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-6);
    padding: var(--space-4) 0;

    & + & {
      border-top: 1px solid var(--border-subtle);
    }

    &__label {
      flex-shrink: 0;
      width: 140px;
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding-top: var(--space-1);
    }

    &__value {
      flex: 1;
      font-size: var(--text-sm);
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
  }

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: var(--radius-full);
    flex-shrink: 0;

    &[data-allowed='true'] { background: var(--accent-success); }
    &[data-allowed='false'] { background: var(--accent-danger); }
  }

  .host-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .host-chip {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-4);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    font-family: var(--font-mono);
    background: var(--surface-2);
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
  }

  .pkg-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .pkg-chip {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-4);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    background: var(--accent-info-muted);
    color: var(--accent-info);
    border-radius: var(--radius-sm);
  }

  .text-muted { color: var(--text-muted); }

  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-5); }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);

    &__label { font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    &__value { font-size: var(--text-sm); color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    code { font-family: var(--font-mono); font-size: var(--text-xs); user-select: all; }
  }

  @media (max-width: 640px) {
    .meta-grid { grid-template-columns: 1fr; }
    .actions-bar {
      flex-direction: column;

      .actions-bar__btn { justify-content: center; }
    }
    .detail-row {
      flex-direction: column;
      gap: var(--space-2);
    }
    .detail-row__label { width: auto; }
  }
</style>
