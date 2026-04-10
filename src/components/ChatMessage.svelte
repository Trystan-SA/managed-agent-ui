<script lang="ts">
  import ToolUseCard from './ToolUseCard.svelte';
  import ThinkingBlock from './ThinkingBlock.svelte';

  interface ContentBlock {
    [key: string]: unknown;
    type: string;
    text?: string;
    name?: string;
    input?: Record<string, unknown>;
    result?: string;
    status?: string;
    thinking?: string;
    content?: string;
  }

  const {
    role,
    content
  }: {
    role: 'user' | 'assistant';
    content: ContentBlock[];
  } = $props();

  /**
   * Apply basic inline formatting: **bold** and `code`.
   * Returns an HTML string for use with {@html}.
   */
  function formatInlineText(text: string): string {
    // Escape HTML first
    let safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold: **text**
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Inline code: `code`
    safe = safe.replace(/`([^`]+)`/g, '<code class="code-block--inline">$1</code>');

    // Preserve newlines
    safe = safe.replace(/\n/g, '<br>');

    return safe;
  }
</script>

<div class="message message--{role}">
  <div class="message__bubble">
    {#each content as block, index (index)}
      {#if block.type === 'text'}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <div class="message-text">{@html formatInlineText(block.text as string)}</div>
      {:else if block.type === 'tool_use'}
        <ToolUseCard
          name={block.name ?? ''}
          input={block.input ?? {}}
          result={block.result}
          status={(block.status as 'pending' | 'done' | 'error') ?? 'done'}
        />
      {:else if block.type === 'thinking'}
        <ThinkingBlock content={block.thinking ?? block.content ?? block.text ?? ''} />
      {/if}
    {/each}
  </div>
</div>

<style>
  .message-text {
    line-height: var(--leading-normal);
  }

  .message-text :global(strong) {
    font-weight: var(--weight-semibold);
  }

  .message-text :global(code) {
    font-size: 0.85em;
  }

  /* Give tool/thinking blocks inside messages some spacing */
  .message__bubble > :global(.event-card) {
    margin-top: var(--space-4);
  }

  .message__bubble > :global(.event-card:first-child) {
    margin-top: 0;
  }
</style>
