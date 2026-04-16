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
    let safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/`([^`]+)`/g, '<code class="code-block--inline">$1</code>');
    safe = safe.replace(/\n/g, '<br>');
    return safe;
  }
</script>

{#if role === 'user'}
  <!-- User speech: compact right-aligned note with a small attribution -->
  <div class="message message--user">
    <span class="message__attribution">You</span>
    <div class="message__bubble">
      {#each content as block, index (index)}
        {#if block.type === 'text'}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <div class="message-text">{@html formatInlineText(block.text as string)}</div>
        {/if}
      {/each}
    </div>
  </div>
{:else}
  <!-- Assistant transcript: monogram + name strip, then content stream -->
  <div class="message message--assistant">
    <div class="message__speaker">
      <span class="message__monogram" aria-hidden="true">A</span>
      <span class="message__name">Assistant</span>
    </div>
    <div class="message__stream">
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
          {@const thinkingText = (block.thinking ?? block.content ?? block.text ?? '') as string}
          {#if thinkingText.trim()}
            <ThinkingBlock content={thinkingText} />
          {/if}
        {/if}
      {/each}
    </div>
  </div>
{/if}

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
</style>
