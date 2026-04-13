/**
 * Shared conversion from Anthropic Managed Agents session events into UI messages.
 * Used by both the chat page's initial history load (via `events.list`) and the
 * live SSE stream handler so a single source of truth drives message rendering.
 *
 * Ref: https://platform.claude.com/docs/en/api/beta/sessions
 */

export interface ContentBlock {
  type: string;
  [key: string]: unknown;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: ContentBlock[];
}

/**
 * Apply a single session event to the messages array. Mutates `messages`.
 * Returns true if the event was a content-bearing event and may have changed
 * rendered output (so the caller can trigger an autoscroll).
 */
export function applyEventToMessages(messages: ChatMessage[], event: ContentBlock): boolean {
  const type = event.type;

  if (type === 'user.message') {
    messages.push({ role: 'user', content: (event.content as ContentBlock[]) ?? [] });
    return true;
  }

  const isAgentContent =
    type === 'agent.message' ||
    type === 'agent.thinking' ||
    type === 'agent.tool_use' ||
    type === 'agent.mcp_tool_use' ||
    type === 'agent.custom_tool_use' ||
    type === 'agent.tool_result' ||
    type === 'agent.mcp_tool_result';

  if (!isAgentContent) return false;

  // Find or create the current assistant message to append to.
  const last = messages[messages.length - 1];
  let current: ChatMessage;
  if (last && last.role === 'assistant') {
    current = last;
  } else {
    current = { role: 'assistant', content: [] };
    messages.push(current);
  }

  switch (type) {
    case 'agent.message': {
      for (const block of (event.content as ContentBlock[]) ?? []) {
        if (block.type === 'text') {
          const lastBlock = current.content[current.content.length - 1];
          if (lastBlock && lastBlock.type === 'text') {
            lastBlock.text = String(lastBlock.text) + String(block.text);
          } else {
            current.content.push({ type: 'text', text: block.text });
          }
        }
      }
      return true;
    }
    case 'agent.thinking': {
      current.content.push({
        type: 'thinking',
        thinking: (event.thinking ?? event.content ?? event.text ?? '') as string
      });
      return true;
    }
    case 'agent.tool_use':
    case 'agent.mcp_tool_use':
    case 'agent.custom_tool_use': {
      current.content.push({
        type: 'tool_use',
        id: (event.id ?? event.tool_use_id) as string,
        name: (event.name ?? event.tool_name ?? 'tool') as string,
        input: (event.input ?? {}) as Record<string, unknown>,
        status: 'running',
        result: undefined
      });
      return true;
    }
    case 'agent.tool_result':
    case 'agent.mcp_tool_result': {
      const toolId = (event.tool_use_id ?? event.mcp_tool_use_id ?? event.id) as string;
      // Search most-recent-first so late results still match earlier turns.
      for (let i = messages.length - 1; i >= 0; i--) {
        const blk = messages[i].content.find((b) => b.type === 'tool_use' && b.id === toolId);
        if (blk) {
          blk.result = event.content ?? event.result ?? event.output;
          blk.status = 'done';
          return true;
        }
      }
      return false;
    }
  }

  return false;
}

/**
 * Replay a chronological list of session events into a fresh messages array.
 */
export function eventsToMessages(events: ContentBlock[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const ev of events) {
    applyEventToMessages(messages, ev);
  }
  return messages;
}