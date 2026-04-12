<script lang="ts">
  const {
    icon,
    title,
    description,
    actionHref = '',
    actionLabel = ''
  }: {
    icon: string;
    title: string;
    description: string;
    actionHref?: string;
    actionLabel?: string;
  } = $props();
</script>

<div class="empty-state">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  <div class="empty-state__icon">{@html icon}</div>
  <h3 class="empty-state__title">{title}</h3>
  <p class="empty-state__desc">{description}</p>
  {#if actionHref && actionLabel}
    <a href={actionHref} class="empty-state__btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {actionLabel}
    </a>
  {/if}
</div>

<style lang="scss">
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-11) var(--space-8);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);

    &__icon {
      margin-bottom: var(--space-5);
      opacity: 0.25;
      color: var(--text-primary);
      width: 36px;
      height: 36px;

      :global(svg) {
        width: 100%;
        height: 100%;
      }
    }

    &__title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      margin: 0 0 var(--space-2);
    }

    &__desc {
      font-size: var(--text-sm);
      color: var(--text-muted);
      margin: 0;
      max-width: 280px;
      text-align: center;
      line-height: var(--leading-normal);
    }

    &__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      margin-top: var(--space-6);
      padding: var(--space-4) var(--space-6);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: #fff;
      background: var(--accent-primary);
      border: none;
      border-radius: var(--radius-md);
      text-decoration: none;
      cursor: pointer;
      transition: background var(--transition-fast), box-shadow var(--transition-fast);

      &:hover {
        background: var(--accent-primary-hover);
        box-shadow: var(--shadow-md);
      }

      &:active {
        background: var(--accent-primary-active);
      }
    }
  }
</style>
