<script lang="ts">
  const { content }: { content: string } = $props();

  let expanded = $state(false);

  function toggle() {
    expanded = !expanded;
  }
</script>

<div class="thinking" class:thinking--expanded={expanded}>
  <button class="thinking__toggle" type="button" onclick={toggle} aria-expanded={expanded}>
    <svg class="thinking__chevron" viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <polyline points="6 4 10 8 6 12" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span class="thinking__label">Thought</span>
  </button>

  {#if expanded}
    <pre class="thinking__content">{content}</pre>
  {/if}
</div>

<style>
  .thinking {
    font-family: var(--font-sans);
  }

  .thinking__toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    font-family: inherit;
    font-size: var(--text-xs);
    font-style: italic;
    letter-spacing: 0.01em;
    transition: color var(--transition-fast);
  }

  .thinking__toggle:hover {
    color: var(--text-secondary);
  }

  .thinking__chevron {
    color: var(--text-muted);
    flex-shrink: 0;
    transition: transform var(--transition-fast);
  }

  .thinking--expanded .thinking__chevron {
    transform: rotate(90deg);
  }

  .thinking__label {
    font-weight: var(--weight-medium);
  }

  /* Expanded content: reads as marginalia — subtle left rule + mono prose */
  .thinking__content {
    margin: var(--space-3) 0 0 0;
    padding: var(--space-2) 0 var(--space-2) var(--space-5);
    border-left: 2px solid var(--border-subtle);
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: var(--leading-relaxed);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 400px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border-strong) transparent;
  }

  .thinking__content::-webkit-scrollbar {
    width: 4px;
  }

  .thinking__content::-webkit-scrollbar-track {
    background: transparent;
  }

  .thinking__content::-webkit-scrollbar-thumb {
    background: var(--border-strong);
    border-radius: var(--radius-full);
  }
</style>
