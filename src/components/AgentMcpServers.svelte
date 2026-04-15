<script lang="ts">
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';

  export interface McpServerRow {
    name: string;
    url: string;
    enabled: boolean;
  }

  const {
    servers,
    onchange
  }: {
    servers: McpServerRow[];
    onchange: (next: McpServerRow[]) => void;
  } = $props();

  // Duplicate name detection — names must be unique within an agent's mcp_servers.
  const duplicateNames = $derived(() => {
    const counts = new SvelteMap<string, number>();
    for (const s of servers) {
      const k = s.name.trim();
      if (!k) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const dups = new SvelteSet<string>();
    for (const [k, n] of counts) if (n > 1) dups.add(k);
    return dups;
  });

  function addServer() {
    onchange([...servers, { name: '', url: '', enabled: true }]);
  }

  function updateServer(index: number, patch: Partial<McpServerRow>) {
    const next = servers.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onchange(next);
  }

  function removeServer(index: number) {
    onchange(servers.filter((_, i) => i !== index));
  }
</script>

<div class="mcp-servers">
  {#if servers.length === 0}
    <p class="mcp-servers__empty">No MCP servers connected. Add one to let this agent call external tools over MCP.</p>
  {:else}
    <div class="mcp-servers__list">
      {#each servers as server, index (index)}
        {@const isDuplicate = server.name.trim() !== '' && duplicateNames().has(server.name.trim())}
        <div class="mcp-row" class:mcp-row--disabled={!server.enabled}>
          <label class="mcp-row__toggle" title={server.enabled ? 'Disable this server' : 'Enable this server'}>
            <input
              type="checkbox"
              checked={server.enabled}
              onchange={(e) => updateServer(index, { enabled: (e.currentTarget as HTMLInputElement).checked })}
            />
            <span class="mcp-row__toggle-track"><span class="mcp-row__toggle-thumb"></span></span>
          </label>

          <div class="mcp-row__fields">
            <div class="mcp-row__field">
              <label class="mcp-row__label" for="mcp-name-{index}">Name</label>
              <input
                id="mcp-name-{index}"
                class="mcp-row__input"
                class:mcp-row__input--error={isDuplicate}
                type="text"
                placeholder="e.g. linear"
                value={server.name}
                oninput={(e) => updateServer(index, { name: (e.currentTarget as HTMLInputElement).value })}
              />
              {#if isDuplicate}
                <span class="mcp-row__error">Duplicate name</span>
              {/if}
            </div>

            <div class="mcp-row__field mcp-row__field--url">
              <label class="mcp-row__label" for="mcp-url-{index}">URL</label>
              <input
                id="mcp-url-{index}"
                class="mcp-row__input"
                type="url"
                placeholder="https://example.com/mcp"
                value={server.url}
                oninput={(e) => updateServer(index, { url: (e.currentTarget as HTMLInputElement).value })}
              />
            </div>
          </div>

          <button
            type="button"
            class="mcp-row__remove"
            aria-label="Remove server"
            title="Remove"
            onclick={() => removeServer(index)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 4.5h10M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M6.5 7v4M9.5 7v4M4.5 4.5l.5 8.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-8.5" />
            </svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <button type="button" class="mcp-servers__add" onclick={addServer}>
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
    Add MCP server
  </button>
</div>

<style lang="scss">
  .mcp-servers {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);

    &__empty {
      font-size: var(--text-sm);
      color: var(--text-muted);
      padding: var(--space-5);
      background: var(--surface-1);
      border: 1px dashed var(--border-default);
      border-radius: var(--radius-md);
      margin: 0;
    }

    &__list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    &__add {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--accent-primary);
      background: var(--accent-primary-muted);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background var(--transition-fast);

      &:hover { background: var(--surface-2); }
    }
  }

  .mcp-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    transition: border-color var(--transition-fast), opacity var(--transition-fast);

    &:hover { border-color: var(--border-strong); }
    &--disabled { opacity: 0.55; }

    &__toggle {
      display: inline-flex;
      align-items: center;
      position: relative;
      margin-top: 22px; // align with inputs below their labels
      cursor: pointer;
      flex-shrink: 0;

      input { position: absolute; opacity: 0; width: 0; height: 0; }
    }

    &__toggle-track {
      position: relative;
      width: 32px;
      height: 18px;
      background: var(--border-strong);
      border-radius: var(--radius-full);
      transition: background var(--transition-fast);
    }

    &__toggle-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      background: #fff;
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-sm);
      transition: transform var(--transition-fast);
    }

    &__toggle input:checked + .mcp-row__toggle-track {
      background: var(--accent-primary);
    }

    &__toggle input:checked + .mcp-row__toggle-track .mcp-row__toggle-thumb {
      transform: translateX(14px);
    }

    &__fields {
      flex: 1;
      display: grid;
      grid-template-columns: minmax(120px, 1fr) minmax(200px, 2fr);
      gap: var(--space-3);
      min-width: 0;
    }

    &__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      min-width: 0;

      &--url { min-width: 0; }
    }

    &__label {
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--text-muted);
    }

    &__input {
      width: 100%;
      min-width: 0;
      padding: var(--space-3) var(--space-4);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--surface-0);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      outline: none;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

      &::placeholder { color: var(--text-muted); opacity: 0.6; }
      &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px var(--accent-primary-muted); }
      &--error { border-color: var(--accent-danger); }
    }

    &__error {
      font-size: var(--text-xs);
      color: var(--accent-danger);
    }

    &__remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      margin-top: 18px;
      border-radius: var(--radius-sm);
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: background var(--transition-fast), color var(--transition-fast);
      flex-shrink: 0;

      &:hover { background: var(--accent-danger-muted); color: var(--accent-danger); }
    }
  }

  @media (max-width: 640px) {
    .mcp-row__fields {
      grid-template-columns: 1fr;
    }
  }
</style>
