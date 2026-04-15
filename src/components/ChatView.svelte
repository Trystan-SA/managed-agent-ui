<script lang="ts" module>
  /**
   * The single chat surface shared by /dashboard and /chat/[id].
   *
   * Owns:
   *  - message state + the event-to-message conversion (via $lib/utils/chatEvents)
   *  - SSE lifecycle for live sessions
   *  - Auto-scroll
   *  - The composer / working panel UI
   *  - The user.interrupt (cancel) call to the Claude API
   *
   * The parent supplies:
   *  - the current sessionId (null = new-chat flow — parent must also pass `createSession`)
   *  - optional preloaded messages / status (skips the initial events fetch on mount)
   *  - a factory to create a session on first send (new-chat flow)
   *  - callbacks so the parent can react to status changes and session creation
   *
   * Parent controls the outer layout (padding, width cap) via the
   * `--chat-view-padding` CSS custom property.
   */
  export interface ChatSession {
    id: string;
    [k: string]: unknown;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onDestroy } from 'svelte';
  import ChatMessage from './ChatMessage.svelte';
  import { apiFetch } from '$lib/utils/api';
  import {
    applyEventToMessages,
    type ChatMessage as ChatMessageData,
    type ContentBlock
  } from '$lib/utils/chatEvents';

  interface Props {
    sessionId: string | null;
    preloadedMessages?: ChatMessageData[];
    preloadedStatus?: string;
    createSession?: () => Promise<ChatSession | null>;
    onSessionCreated?: (session: ChatSession) => void;
    onStatusChange?: (status: string) => void;
    composerPlaceholder?: string;
    canSend?: boolean;
    emptyState?: Snippet;
  }

  const {
    sessionId,
    preloadedMessages,
    preloadedStatus,
    createSession,
    onSessionCreated,
    onStatusChange,
    composerPlaceholder = 'Type a message…',
    canSend = true,
    emptyState
  }: Props = $props();

  // --- Internal state ---
  let currentSessionId = $state<string | null>(sessionId);
  let status = $state<string>(preloadedStatus ?? 'idle');
  const messages = $state<ChatMessageData[]>([...(preloadedMessages ?? [])]);
  let inputText = $state('');
  let evtSource: EventSource | null = null;
  let scrollContainer: HTMLDivElement | undefined = $state(undefined);
  let shouldAutoScroll = $state(true);

  // Track which session we've loaded history for, to avoid re-fetching when
  // the parent re-passes the same sessionId.
  let loadedFor = $state<string | null>(preloadedMessages ? sessionId : null);

  const isRunning = $derived(status === 'running');

  // --- Sync with parent when sessionId changes ---
  $effect(() => {
    const sid = sessionId;
    if (sid === currentSessionId && (sid === null || loadedFor === sid)) return;
    closeStream();
    messages.length = 0;
    currentSessionId = sid;
    status = 'idle';
    if (sid) void loadHistory(sid);
  });

  // --- Notify parent of status changes ---
  $effect(() => {
    const s = status;
    onStatusChange?.(s);
  });

  async function loadHistory(sid: string) {
    try {
      const { events } = await apiFetch<{ events: ContentBlock[] }>(
        `/api/sessions/${sid}/events`
      );
      if (currentSessionId !== sid) return;
      for (const ev of events) applyEventToMessages(messages, ev);
      loadedFor = sid;
      shouldAutoScroll = true;
      scrollToBottom();
    } catch (err) {
      if (currentSessionId !== sid) return;
      messages.push({
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: `Failed to load history: ${err instanceof Error ? err.message : 'Unknown error'}`
          }
        ]
      });
    }
  }

  // --- Scroll ---
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

  $effect(() => {
    void messages.length;
    if (messages.length > 0) void messages[messages.length - 1].content.length;
    scrollToBottom();
  });

  // --- SSE ---
  function openStream(sid: string) {
    closeStream();
    const src = new EventSource(`/api/sessions/${sid}/stream`);
    evtSource = src;
    src.onmessage = (event) => {
      try {
        handleStreamEvent(JSON.parse(event.data));
      } catch {
        /* no-op */
      }
    };
    src.onerror = () => {
      if (src.readyState === EventSource.CLOSED) {
        closeStream();
        if (status === 'running') status = 'idle';
      }
    };
  }

  function closeStream() {
    if (evtSource) {
      evtSource.close();
      evtSource = null;
    }
  }

  function handleStreamEvent(eventData: ContentBlock) {
    // Skip the echo of our own optimistic user.message push.
    if (eventData.type === 'user.message') return;
    if (eventData.type === 'session.status_idle') {
      status = 'idle';
      closeStream();
      return;
    }
    if (eventData.type === 'session.status_running') {
      status = 'running';
      return;
    }
    if (applyEventToMessages(messages, eventData)) scrollToBottom();
  }

  // --- Actions ---
  async function sendMessage() {
    const text = inputText.trim();
    if (!text || isRunning || !canSend) return;

    // New-chat flow: create a session on first send.
    let sid = currentSessionId;
    if (!sid) {
      if (!createSession) return;
      try {
        const session = await createSession();
        if (!session) return;
        sid = session.id;
        currentSessionId = sid;
        loadedFor = sid; // brand-new session, nothing to load
        onSessionCreated?.(session);
      } catch (err) {
        messages.push({
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: `Error creating session: ${err instanceof Error ? err.message : 'Unknown error'}`
            }
          ]
        });
        return;
      }
    }

    messages.push({ role: 'user', content: [{ type: 'text', text }] });
    inputText = '';
    status = 'running';
    shouldAutoScroll = true;
    scrollToBottom();

    try {
      await apiFetch(`/api/sessions/${sid}/events`, {
        method: 'POST',
        body: JSON.stringify({
          events: [{ type: 'user.message', content: [{ type: 'text', text }] }]
        })
      });
      openStream(sid);
    } catch (err) {
      status = 'idle';
      messages.push({
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: `Error: ${err instanceof Error ? err.message : 'Failed to send message'}`
          }
        ]
      });
    }
  }

  async function interrupt() {
    if (!currentSessionId) return;
    try {
      await apiFetch(`/api/sessions/${currentSessionId}/events`, {
        method: 'POST',
        body: JSON.stringify({ events: [{ type: 'user.interrupt' }] })
      });
    } catch {
      /* no-op */
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  onDestroy(() => {
    closeStream();
  });
</script>

<div class="chat-view" bind:this={scrollContainer} onscroll={checkScrollPosition}>
  {#if messages.length === 0 && emptyState}
    {@render emptyState()}
  {/if}

  {#each messages as msg, index (index)}
    <ChatMessage role={msg.role} content={msg.content} />
  {/each}

  {#if isRunning}
    {@const lastMsg = messages[messages.length - 1]}
    {@const isThinking = !lastMsg || lastMsg.role !== 'assistant' || lastMsg.content.length === 0}
    <div class="working" role="status" aria-live="polite">
      <div class="working__progress">
        {#if isThinking}
          <div class="chat__typing">
            <div class="chat__typing-dots"><span></span><span></span><span></span></div>
            Agent is thinking…
          </div>
        {:else}
          <div class="chat__streaming">Streaming response…</div>
        {/if}
      </div>
      <button class="working__cancel" type="button" onclick={interrupt}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" rx="2" />
        </svg>
        Cancel
      </button>
    </div>
  {:else}
    <div class="composer" class:composer--disabled={!canSend}>
      <textarea
        class="composer__textarea"
        placeholder={composerPlaceholder}
        bind:value={inputText}
        onkeydown={handleKeydown}
        rows="1"
      ></textarea>
      <button
        class="composer__send"
        type="button"
        onclick={sendMessage}
        disabled={!inputText.trim() || !canSend}
        aria-label="Send message"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  {/if}
</div>

<style lang="scss">
  .chat-view {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-7);
    // Parent supplies the column padding (centered at 820px on the dashboard,
    // a simple uniform pad inside /chat/[id]'s section-card).
    padding: var(--chat-view-padding, var(--space-6));
    scrollbar-width: thin;
    scrollbar-color: var(--border-strong) transparent;
  }

  /* ——— Inline composer (idle) ——— */
  .composer {
    display: flex;
    align-items: flex-end;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

    &:focus-within {
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 3px var(--accent-primary-muted);
    }

    &--disabled { opacity: 0.6; }

    &__textarea {
      flex: 1;
      min-height: 40px;
      max-height: 200px;
      resize: none;
      padding: var(--space-3) var(--space-4);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      line-height: var(--leading-normal);
      color: var(--text-primary);
      background: transparent;
      border: none;
      outline: none;

      &::placeholder { color: var(--text-muted); }
    }

    &__send {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      padding: 0;
      background: var(--accent-primary);
      color: #fff;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background var(--transition-fast), transform var(--transition-fast);

      &:hover:not(:disabled) { background: var(--accent-primary-hover); }
      &:active:not(:disabled) { transform: translateY(1px); }
      &:disabled { opacity: 0.35; cursor: not-allowed; pointer-events: none; }
    }
  }

  /* ——— Working panel (running) ——— */
  .working {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    padding: var(--space-4) var(--space-5);
    background: var(--accent-primary-muted);
    border: 1px solid var(--accent-primary);
    border-radius: var(--radius-lg);

    &__progress {
      flex: 1;
      min-width: 0;
      color: var(--text-primary);
    }

    &__cancel {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--accent-danger);
      background: transparent;
      border: 1px solid var(--accent-danger);
      border-radius: var(--radius-md);
      cursor: pointer;
      flex-shrink: 0;
      transition: color var(--transition-fast), background var(--transition-fast);

      &:hover {
        color: #fff;
        background: var(--accent-danger);
      }

      &:focus-visible {
        outline: 2px solid var(--accent-danger);
        outline-offset: 2px;
      }
    }
  }
</style>
