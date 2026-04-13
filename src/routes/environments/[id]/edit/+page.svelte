<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { apiFetch } from '$lib/utils/api';
  import EnvironmentForm, {
    valuesFromEnvironment,
    type EnvironmentFormValues,
    type EnvironmentPayload
  } from '$components/EnvironmentForm.svelte';

  let loading = $state(true);
  let submitting = $state(false);
  let error = $state('');
  let initial = $state<Partial<EnvironmentFormValues>>({});

  const envId = $derived($page.params.id);

  onMount(async () => {
    try {
      const env = await apiFetch<Record<string, unknown>>(`/api/environments/${envId}`);
      initial = valuesFromEnvironment(env);
    } catch (e: unknown) {
      error = (e as Error).message || 'Failed to load environment';
    } finally {
      loading = false;
    }
  });

  async function handleSubmit(payload: EnvironmentPayload) {
    submitting = true;
    error = '';
    try {
      await apiFetch(`/api/environments/${envId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      await goto(`/environments/${envId}`);
    } catch (e: unknown) {
      error = (e as Error).message || 'Failed to update environment';
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Edit Environment | Managed Agents</title>
</svelte:head>

<div class="env-edit">
  <div class="env-edit__header">
    <a href="/environments/{envId}" class="back-link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      Back to Environment
    </a>
    <h1 class="env-edit__title">Edit Environment</h1>
    <p class="env-edit__subtitle">Update the environment configuration</p>
  </div>

  {#if loading}
    <div class="loading-card">
      <span class="spinner"></span>
      Loading environment...
    </div>
  {:else}
    <EnvironmentForm
      {initial}
      {submitting}
      {error}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      submitIcon="check"
      cancelHref="/environments/{envId}"
      onsubmit={handleSubmit}
    />
  {/if}
</div>

<style lang="scss">
  .env-edit {
    max-width: 680px;
    padding-bottom: var(--space-12);

    &__header { margin-bottom: var(--space-9); }
    &__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      color: var(--text-primary);
      line-height: var(--leading-tight);
      margin-top: var(--space-4);
    }
    &__subtitle {
      font-size: var(--text-sm);
      color: var(--text-muted);
      margin-top: var(--space-2);
    }
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

  .loading-card {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-8);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    font-size: var(--text-sm);
    color: var(--text-muted);
  }

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid var(--border-strong);
    border-top-color: var(--accent-primary);
    border-radius: var(--radius-full);
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>