<script lang="ts">
  const { events }: { events: Record<string, unknown>[] } = $props();

  const expandedCards: Record<number, boolean> = $state({});

  function toggleCard(index: number) {
    expandedCards[index] = !expandedCards[index];
  }

  function formatTimestamp(ts: unknown): string {
    if (typeof ts !== 'string' || !ts) return '';
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function getToolName(event: Record<string, unknown>): string {
    return (event.name ?? event.tool_name ?? event.tool ?? 'unknown') as string;
  }

  function getTextContent(event: Record<string, unknown>): string {
    if (typeof event.content === 'string') return event.content;
    if (typeof event.text === 'string') return event.text;
    if (typeof event.message === 'string') return event.message;
    if (Array.isArray(event.content)) {
      return (event.content as Record<string, unknown>[])
        .filter((b: Record<string, unknown>) => b.type === 'text')
        .map((b: Record<string, unknown>) => b.text)
        .join('\n');
    }
    return '';
  }

  function formatJson(obj: unknown): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }
</script>

<div class="event-timeline">
  {#if events.length === 0}
    <div class="event-timeline__empty">
      <p class="event-timeline__empty-text">No events recorded for this session.</p>
    </div>
  {:else}
    {#each events as event, i (i)}
      {@const type = event.type ?? ''}

      {#if type === 'user.message'}
        <!-- User message bubble -->
        <div class="message message--user">
          <div class="message__meta">{formatTimestamp(event.created_at ?? event.timestamp)}</div>
          <div class="message__bubble">{getTextContent(event)}</div>
        </div>

      {:else if type === 'agent.message'}
        <!-- Assistant message bubble -->
        <div class="message message--assistant">
          <div class="message__meta">Assistant &middot; {formatTimestamp(event.created_at ?? event.timestamp)}</div>
          <div class="message__bubble">{getTextContent(event)}</div>
        </div>

      {:else if type === 'agent.thinking'}
        <!-- Thinking: collapsible, dimmed, collapsed by default -->
        <div class="event-card event-card--thinking" class:event-card--expanded={expandedCards[i]}>
          <button class="event-card__header" onclick={() => toggleCard(i)}>
            <svg class="event-card__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span class="event-card__type">Thinking</span>
            <span class="event-card__title">Agent reasoning</span>
            <span class="event-card__timestamp">{formatTimestamp(event.created_at ?? event.timestamp)}</span>
          </button>
          <div class="event-card__body">
            <div class="event-card__content">
              <pre class="event-card__pre">{getTextContent(event)}</pre>
            </div>
          </div>
        </div>

      {:else if type === 'agent.tool_use' || type === 'agent.mcp_tool_use'}
        <!-- Tool use: collapsible card -->
        <div
          class="event-card event-card--tool"
          class:event-card--expanded={expandedCards[i]}
        >
          <button class="event-card__header" onclick={() => toggleCard(i)}>
            <svg class="event-card__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span class="event-card__type">
              {type === 'agent.mcp_tool_use' ? 'MCP' : 'Tool'}
            </span>
            <span class="event-card__title">{getToolName(event)}</span>
            <span class="event-card__timestamp">{formatTimestamp(event.created_at ?? event.timestamp)}</span>
          </button>
          <div class="event-card__body">
            <div class="event-card__content">
              <pre class="event-card__pre">{formatJson(event.input ?? event.parameters ?? event)}</pre>
            </div>
          </div>
        </div>

      {:else if type === 'agent.tool_result' || type === 'agent.mcp_tool_result'}
        <!-- Tool result -->
        <div class="event-card event-card--result" class:event-card--expanded={expandedCards[i]}>
          <button class="event-card__header" onclick={() => toggleCard(i)}>
            <svg class="event-card__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span class="event-card__type">
              {type === 'agent.mcp_tool_result' ? 'MCP Result' : 'Result'}
            </span>
            <span class="event-card__title">
              {event.is_error ? 'Error' : 'Success'}
            </span>
            <span class="event-card__timestamp">{formatTimestamp(event.created_at ?? event.timestamp)}</span>
          </button>
          <div class="event-card__body">
            <div class="event-card__content">
              <pre class="event-card__pre">{getTextContent(event) || formatJson(event.output ?? event.result ?? event)}</pre>
            </div>
          </div>
        </div>

      {:else if type === 'session.status_idle'}
        <!-- Status: idle -->
        <div class="event-timeline__status">
          <span class="badge badge--idle badge--sm">idle</span>
          <span class="event-timeline__status-time">{formatTimestamp(event.created_at ?? event.timestamp)}</span>
        </div>

      {:else if type === 'session.status_running'}
        <!-- Status: running -->
        <div class="event-timeline__status">
          <span class="badge badge--running badge--sm">running</span>
          <span class="event-timeline__status-time">{formatTimestamp(event.created_at ?? event.timestamp)}</span>
        </div>

      {:else}
        <!-- Unknown / other event types -->
        <div class="event-timeline__other">
          <span class="event-timeline__other-type">{type || 'unknown'}</span>
          <span class="event-timeline__other-time">{formatTimestamp(event.created_at ?? event.timestamp)}</span>
        </div>
      {/if}
    {/each}
  {/if}
</div>

<style lang="scss">
  .event-timeline {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-6) 0;

    &__empty {
      text-align: center;
      padding: var(--space-12) var(--space-8);
    }

    &__empty-text {
      color: var(--text-muted);
      font-size: var(--text-sm);
    }

    &__status {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-3) var(--space-6);
    }

    &__status-time {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    &__other {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-2) var(--space-6);
    }

    &__other-type {
      font-size: var(--text-xs);
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    &__other-time {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
  }

  .event-card__pre {
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
