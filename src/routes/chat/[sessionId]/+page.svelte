<script lang="ts">
  import { onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import ChatMessage from '$components/ChatMessage.svelte';
  import SessionPicker from '$components/SessionPicker.svelte';
  import Badge from '$components/Badge.svelte';
  import { apiFetch } from '$lib/utils/api';

  let { data } = $props();

  // --- Session list for sidebar ---
  let sessions: any[] = $state([]);

  async function loadSessions() {
    try {
      const result = await apiFetch<any>('/api/sessions');
      sessions = Array.isArray(result) ? result : result.data ?? [];
    } catch {
      sessions = [];
    }
  }

  $effect(() => {
    loadSessions();
  });

  // --- Message state ---
  let messages: { role: 'user' | 'assistant'; content: any[] }[] = $state([]);
  let status: string = $state(data.session?.status ?? 'idle');
  let inputText: string = $state('');
  let evtSource: EventSource | null = $state(null);

  // --- Scroll refs & auto-scroll ---
  let scrollContainer: HTMLDivElement | undefined = $state(undefined);
  let shouldAutoScroll: boolean = $state(true);

  function checkScrollPosition() {
    if (!scrollContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    shouldAutoScroll = scrollHeight - scrollTop - clientHeight < 80;
  }

  function scrollToBottom() {
    if (scrollContainer && shouldAutoScroll) {
      requestAnimationFrame(() => {
        scrollContainer!.scrollTop = scrollContainer!.scrollHeight;
      });
    }
  }

  // Auto-scroll when messages change
  $effect(() => {
    // Access messages length to create dependency
    void messages.length;
    // Also access content of last message for streaming updates
    if (messages.length > 0) {
      void messages[messages.length - 1].content.length;
    }
    scrollToBottom();
  });

  // --- Derived state ---
  let isRunning = $derived(status === 'running');
  let sessionId = $derived($page.params.sessionId);
  let sessionTitle = $derived(
    data.session?.title ?? data.session?.name ?? `Session ${sessionId.slice(0, 8)}...`
  );

  // --- SSE Streaming ---
  function openStream() {
    closeStream();

    // Add empty assistant message to populate
    messages.push({ role: 'assistant', content: [] });

    const src = new EventSource(`/api/sessions/${sessionId}/stream`);
    evtSource = src;

    src.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        handleStreamEvent(eventData);
      } catch {
        // Ignore malformed events
      }
    };

    src.onerror = () => {
      // EventSource will auto-reconnect on transient errors.
      // If the connection is truly dead, close it.
      if (src.readyState === EventSource.CLOSED) {
        closeStream();
        if (status === 'running') {
          status = 'idle';
        }
      }
    };
  }

  function closeStream() {
    if (evtSource) {
      evtSource.close();
      evtSource = null;
    }
  }

  function handleStreamEvent(eventData: any) {
    const assistantMsg = messages.findLast((m) => m.role === 'assistant');
    if (!assistantMsg && eventData.type !== 'session.status_idle' && eventData.type !== 'session.status_running') {
      // No assistant message to append to — create one
      messages.push({ role: 'assistant', content: [] });
    }

    const currentMsg = messages.findLast((m) => m.role === 'assistant');

    switch (eventData.type) {
      case 'agent.message': {
        if (!currentMsg) break;
        for (const block of eventData.content ?? []) {
          if (block.type === 'text') {
            const lastBlock = currentMsg.content[currentMsg.content.length - 1];
            if (lastBlock && lastBlock.type === 'text') {
              // Append to existing text block
              lastBlock.text += block.text;
            } else {
              currentMsg.content.push({ type: 'text', text: block.text });
            }
          }
        }
        scrollToBottom();
        break;
      }

      case 'agent.thinking': {
        if (!currentMsg) break;
        currentMsg.content.push({
          type: 'thinking',
          thinking: eventData.thinking ?? eventData.content ?? eventData.text ?? ''
        });
        scrollToBottom();
        break;
      }

      case 'agent.tool_use': {
        if (!currentMsg) break;
        currentMsg.content.push({
          type: 'tool_use',
          id: eventData.id ?? eventData.tool_use_id,
          name: eventData.name ?? eventData.tool_name ?? 'tool',
          input: eventData.input ?? {},
          status: 'running',
          result: undefined
        });
        scrollToBottom();
        break;
      }

      case 'agent.tool_result': {
        if (!currentMsg) break;
        const toolId = eventData.tool_use_id ?? eventData.id;
        const toolBlock = currentMsg.content.find(
          (b: any) => b.type === 'tool_use' && b.id === toolId
        );
        if (toolBlock) {
          toolBlock.result = eventData.content ?? eventData.result ?? eventData.output;
          toolBlock.status = 'done';
        }
        scrollToBottom();
        break;
      }

      case 'session.status_idle': {
        status = 'idle';
        closeStream();
        break;
      }

      case 'session.status_running': {
        status = 'running';
        break;
      }
    }
  }

  // --- Send message ---
  async function sendMessage() {
    const text = inputText.trim();
    if (!text || isRunning) return;

    // Add user message locally
    messages.push({ role: 'user', content: [{ type: 'text', text }] });
    inputText = '';
    status = 'running';
    shouldAutoScroll = true;
    scrollToBottom();

    try {
      await apiFetch(`/api/sessions/${sessionId}/events`, {
        method: 'POST',
        body: JSON.stringify({
          events: [
            {
              type: 'user.message',
              content: [{ type: 'text', text }]
            }
          ]
        })
      });

      openStream();
    } catch (err) {
      status = 'idle';
      messages.push({
        role: 'assistant',
        content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : 'Failed to send message'}` }]
      });
    }
  }

  // --- Interrupt ---
  async function interrupt() {
    try {
      await apiFetch(`/api/sessions/${sessionId}/events`, {
        method: 'POST',
        body: JSON.stringify({
          events: [{ type: 'user.interrupt' }]
        })
      });
    } catch {
      // Best-effort interrupt
    }
  }

  // --- Keyboard handling ---
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // --- Cleanup ---
  onDestroy(() => {
    closeStream();
  });
</script>

<div class="chat-container">
  <!-- Sidebar -->
  <SessionPicker {sessions} currentSessionId={sessionId} />

  <!-- Main chat area -->
  <div class="chat">
    <!-- Header -->
    <header class="chat-header">
      <div class="chat-header__title">
        <h2>{sessionTitle}</h2>
        <Badge {status} size="sm" />
      </div>
      <div class="chat-header__actions">
        {#if isRunning}
          <button class="chat-header__interrupt" onclick={interrupt}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
            Stop
          </button>
        {/if}
      </div>
    </header>

    <!-- Messages -->
    <div
      class="chat__messages"
      bind:this={scrollContainer}
      onscroll={checkScrollPosition}
    >
      {#if messages.length === 0}
        <div class="chat-empty">
          <p>Send a message to start the conversation.</p>
        </div>
      {/if}

      {#each messages as msg}
        <ChatMessage role={msg.role} content={msg.content} />
      {/each}

      {#if isRunning}
        {@const lastMsg = messages[messages.length - 1]}
        {#if !lastMsg || lastMsg.role !== 'assistant' || lastMsg.content.length === 0}
          <div class="chat__typing">
            <div class="chat__typing-dots">
              <span></span><span></span><span></span>
            </div>
            Agent is thinking...
          </div>
        {:else}
          <div class="chat__streaming">Streaming...</div>
        {/if}
      {/if}
    </div>

    <!-- Input bar -->
    <div class="chat__input-bar">
      <textarea
        class="chat__input"
        placeholder={isRunning ? 'Agent is responding...' : 'Type a message...'}
        bind:value={inputText}
        onkeydown={handleKeydown}
        disabled={isRunning}
        rows="1"
      ></textarea>
      <button
        class="chat__send"
        onclick={sendMessage}
        disabled={isRunning || !inputText.trim()}
        aria-label="Send message"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  </div>
</div>

<style>
  .chat-container {
    display: flex;
    height: 100%;
    overflow: hidden;
  }

  .chat {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: 100%;
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--border-default);
    background: var(--surface-1);
    flex-shrink: 0;
  }

  .chat-header__title {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-width: 0;
  }

  .chat-header__title h2 {
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chat-header__actions {
    flex-shrink: 0;
  }

  .chat-header__interrupt {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: #fff;
    background: var(--status-error, #dc2626);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: opacity var(--transition-fast);
  }

  .chat-header__interrupt:hover {
    opacity: 0.85;
  }

  .chat-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: var(--text-sm);
  }
</style>
