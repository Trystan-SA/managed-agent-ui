<script lang="ts">
  import { fly } from 'svelte/transition';
  import { toasts } from '$lib/stores/toast';
</script>

<div class="toaster" aria-live="polite" aria-atomic="true">
  {#each $toasts as toast (toast.id)}
    <div
      class="toast toast--{toast.type}"
      role={toast.type === 'error' ? 'alert' : 'status'}
      transition:fly={{ y: 12, duration: 200 }}
    >
      <span class="toast__icon" aria-hidden="true">
        {#if toast.type === 'success'}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
            <path d="M5 8.5l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        {:else if toast.type === 'error'}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
            <path d="M8 5v3.5M8 10.5h.007" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        {:else}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
            <path d="M8 11V7.5M8 5.5h.007" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        {/if}
      </span>
      <span class="toast__msg">{toast.message}</span>
    </div>
  {/each}
</div>

<style lang="scss">
  .toaster {
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-6);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 280px;
    max-width: 420px;
    padding: var(--space-4) var(--space-5);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    font-size: var(--text-sm);
    line-height: var(--leading-normal);
    pointer-events: auto;
  }

  .toast--success {
    background: var(--accent-success-muted);
    border-color: var(--accent-success);
    color: var(--accent-success);
  }

  .toast--error {
    background: var(--accent-danger-muted);
    border-color: var(--accent-danger);
    color: var(--accent-danger);
  }

  .toast--info {
    background: var(--accent-primary-muted);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }

  .toast__icon {
    display: inline-flex;
    flex-shrink: 0;
  }

  .toast__msg {
    flex: 1;
    color: var(--text-primary);
  }
</style>
