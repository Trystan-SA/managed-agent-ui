<script lang="ts">
  const { text }: { text: string } = $props();
</script>

<span class="help-badge" tabindex="0" role="button" aria-label="Help">
  ?
  <span class="help-badge__tooltip" role="tooltip">{text}</span>
</span>

<style lang="scss">
  .help-badge {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: var(--radius-full);
    background: var(--surface-2);
    color: var(--text-muted);
    border: 1px solid var(--border-default);
    font-size: 11px;
    font-weight: var(--weight-semibold);
    line-height: 1;
    cursor: help;
    user-select: none;
    transition:
      background var(--transition-fast),
      color var(--transition-fast),
      border-color var(--transition-fast);

    &:hover,
    &:focus-visible {
      background: var(--accent-primary-muted);
      color: var(--accent-primary);
      border-color: var(--accent-primary);
      outline: none;
    }

    &__tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      width: max-content;
      max-width: 280px;
      padding: var(--space-3) var(--space-4);
      background: var(--surface-3);
      color: var(--text-primary);
      font-size: 11px;
      font-weight: var(--weight-normal);
      line-height: var(--leading-normal);
      border-radius: var(--radius-sm);
      text-align: left;
      white-space: normal;
      pointer-events: none;
      opacity: 0;
      transition: opacity var(--transition-fast);
      box-shadow: var(--shadow-md);
      z-index: 10;

      &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-top-color: var(--surface-3);
      }
    }

    &:hover .help-badge__tooltip,
    &:focus-visible .help-badge__tooltip {
      opacity: 1;
    }
  }
</style>