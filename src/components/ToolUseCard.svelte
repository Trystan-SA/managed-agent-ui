<script lang="ts">
  import CodeBlock from './CodeBlock.svelte';

  const {
    name,
    input,
    result,
    status = 'pending'
  }: {
    name: string;
    input: Record<string, unknown>;
    result?: string;
    status?: 'pending' | 'done' | 'error';
  } = $props();

  let expanded = $state(false);

  // Auto-expand when result arrives
  $effect(() => {
    if (result != null) {
      expanded = true;
    }
  });

  function toggle() {
    expanded = !expanded;
  }

  function formatJson(obj: Record<string, unknown>): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }
</script>

<div class="event-card event-card--tool" class:event-card--expanded={expanded}>
  <button class="event-card__header" onclick={toggle}>
    <svg class="event-card__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
    <span class="event-card__type">Tool</span>
    <span class="event-card__title">{name}</span>
    <span class="tool-status">
      {#if status === 'pending'}
        <svg class="tool-status__spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      {:else if status === 'done'}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      {:else if status === 'error'}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      {/if}
    </span>
  </button>
  <div class="event-card__body">
    <div class="event-card__content">
      <div class="tool-section">
        <div class="tool-section__label">Input</div>
        <CodeBlock code={formatJson(input)} language="json" />
      </div>
      {#if result != null}
        <div class="tool-section">
          <div class="tool-section__label">Result</div>
          <CodeBlock code={result} />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .tool-status {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    margin-left: auto;
  }

  .tool-status__spinner {
    animation: spin 1s linear infinite;
    color: var(--accent-info);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .tool-section {
    margin-top: var(--space-4);
  }

  .tool-section:first-child {
    margin-top: 0;
  }

  .tool-section__label {
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: var(--space-3);
  }
</style>
