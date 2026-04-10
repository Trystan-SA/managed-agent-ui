<script lang="ts">
  const { content }: { content: string } = $props();

  let expanded = $state(false);

  function toggle() {
    expanded = !expanded;
  }
</script>

<div class="event-card event-card--thinking" class:event-card--expanded={expanded}>
  <button class="event-card__header" onclick={toggle}>
    <svg class="event-card__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
    <span class="event-card__type">Thinking...</span>
  </button>
  <div class="event-card__body">
    <div class="event-card__content">
      <pre class="thinking-pre">{content}</pre>
    </div>
  </div>
</div>

<style>
  .thinking-pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: var(--leading-relaxed);
    max-height: 400px;
    overflow-y: auto;
  }
</style>
