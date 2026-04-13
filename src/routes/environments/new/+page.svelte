<script lang="ts">
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import EnvironmentForm, { type EnvironmentPayload } from '$components/EnvironmentForm.svelte';

  let submitting = $state(false);
  let error = $state('');

  async function handleSubmit(payload: EnvironmentPayload) {
    submitting = true;
    error = '';
    try {
      const result = await apiFetch<{ id: string }>('/api/environments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      await goto(`/environments/${result.id}`);
    } catch (e: unknown) {
      error = (e as Error).message || 'Failed to create environment';
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>New Environment | Managed Agents</title>
</svelte:head>

<div class="env-new">
  <div class="env-new__header">
    <a href="/environments" class="back-link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      Environments
    </a>
    <h1 class="env-new__title">New Environment</h1>
    <p class="env-new__subtitle">Configure a sandboxed cloud runtime for your agents</p>
  </div>

  <EnvironmentForm
    {submitting}
    {error}
    submitLabel="Create Environment"
    submittingLabel="Creating..."
    submitIcon="arrow"
    cancelHref="/environments"
    onsubmit={handleSubmit}
  />
</div>

<style lang="scss">
  .env-new {
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
</style>