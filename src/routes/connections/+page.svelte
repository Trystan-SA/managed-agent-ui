<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import type { McpServiceDefinition } from '$lib/mcp-registry';

  const { data } = $props();

  interface ServiceStatus {
    service: McpServiceDefinition;
    connected: boolean;
    credentialId: string | null;
    connectedAt: string | null;
  }

  interface CustomConnection {
    credentialId: string;
    displayName: string;
    mcpServerUrl: string;
    authType: string;
    connectedAt: string;
  }

  let services = $state<ServiceStatus[]>([]);
  let custom = $state<CustomConnection[]>([]);
  let loading = $state(true);
  let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal state — reused for both registry connects/reconnects and the custom flow.
  let modalService = $state<ServiceStatus | null>(null);
  let modalToken = $state('');
  let modalSubmitting = $state(false);

  // Custom-MCP modal state (separate because the form has more fields)
  let customModalOpen = $state(false);
  let customDisplayName = $state('');
  let customMcpUrl = $state('');
  let customToken = $state('');
  let customSubmitting = $state(false);

  async function load() {
    loading = true;
    try {
      const res = await apiFetch<{ services: ServiceStatus[]; custom: CustomConnection[] }>(
        '/api/connections'
      );
      services = res.services;
      custom = res.custom ?? [];
    } catch (e: unknown) {
      message = { type: 'error', text: e instanceof Error ? e.message : String(e) };
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    if (data.apiKeyConfigured) void load();
    else loading = false;

    // Surface OAuth callback results (the callback redirects here with a
    // ?status=connected|error&message=… or &service=…)
    const status = $page.url.searchParams.get('status');
    if (status === 'connected') {
      const svcId = $page.url.searchParams.get('service') ?? 'service';
      message = { type: 'success', text: `${svcId} connected via OAuth.` };
      void goto('/connections', { replaceState: true, keepFocus: true });
    } else if (status === 'error') {
      const msg = $page.url.searchParams.get('message') ?? 'OAuth flow failed';
      message = { type: 'error', text: msg };
      void goto('/connections', { replaceState: true, keepFocus: true });
    }
  });

  function openConnectModal(svc: ServiceStatus) {
    modalService = svc;
    modalToken = '';
  }

  function closeModal() {
    modalService = null;
    modalToken = '';
    modalSubmitting = false;
  }

  async function submitConnect() {
    if (!modalService || !modalToken.trim()) return;
    modalSubmitting = true;
    message = null;
    try {
      // Reconnect = PATCH (rotate token) when an existing credential exists.
      // Connect = POST when not connected.
      if (modalService.connected && modalService.credentialId) {
        await apiFetch('/api/connections', {
          method: 'PATCH',
          body: JSON.stringify({
            credentialId: modalService.credentialId,
            token: modalToken.trim()
          })
        });
        message = { type: 'success', text: `${modalService.service.displayName} token rotated.` };
      } else {
        await apiFetch('/api/connections', {
          method: 'POST',
          body: JSON.stringify({
            serviceId: modalService.service.id,
            token: modalToken.trim()
          })
        });
        message = { type: 'success', text: `${modalService.service.displayName} connected.` };
      }
      closeModal();
      await load();
    } catch (e: unknown) {
      message = { type: 'error', text: e instanceof Error ? e.message : String(e) };
    } finally {
      modalSubmitting = false;
    }
  }

  async function disconnect(svc: ServiceStatus) {
    if (!svc.credentialId) return;
    if (!confirm(`Disconnect ${svc.service.displayName}? Agents using it will lose access until you reconnect.`)) return;
    await deleteCredential(svc.credentialId, svc.service.displayName);
  }

  async function disconnectCustom(c: CustomConnection) {
    if (!confirm(`Disconnect ${c.displayName}? Agents using it will lose access until you reconnect.`)) return;
    await deleteCredential(c.credentialId, c.displayName);
  }

  async function deleteCredential(credentialId: string, label: string) {
    message = null;
    try {
      await apiFetch(`/api/connections?credentialId=${encodeURIComponent(credentialId)}`, {
        method: 'DELETE'
      });
      message = { type: 'success', text: `${label} disconnected.` };
      await load();
    } catch (e: unknown) {
      message = { type: 'error', text: e instanceof Error ? e.message : String(e) };
    }
  }

  function openCustomModal() {
    customModalOpen = true;
    customDisplayName = '';
    customMcpUrl = '';
    customToken = '';
  }

  function closeCustomModal() {
    customModalOpen = false;
    customDisplayName = '';
    customMcpUrl = '';
    customToken = '';
    customSubmitting = false;
  }

  async function submitCustom() {
    if (!customMcpUrl.trim() || !customToken.trim()) return;
    customSubmitting = true;
    message = null;
    try {
      await apiFetch('/api/connections', {
        method: 'POST',
        body: JSON.stringify({
          mcpServerUrl: customMcpUrl.trim(),
          displayName: customDisplayName.trim() || undefined,
          token: customToken.trim()
        })
      });
      message = { type: 'success', text: `${customDisplayName.trim() || customMcpUrl.trim()} connected.` };
      closeCustomModal();
      await load();
    } catch (e: unknown) {
      message = { type: 'error', text: e instanceof Error ? e.message : String(e) };
    } finally {
      customSubmitting = false;
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(iso));
  }
</script>

<svelte:head>
  <title>Connections — Managed Agents</title>
</svelte:head>

<div class="conn">
  <header class="conn__header">
    <h1 class="conn__title">Connections</h1>
    <p class="conn__desc">
      Connect external services so agents can act on your behalf. Personal API tokens are preferred — they don't expire.
    </p>
  </header>

  {#if message}
    <div class="conn__message conn__message--{message.type}" role="alert">{message.text}</div>
  {/if}

  {#if !data.apiKeyConfigured}
    <div class="conn__gate">
      <p>Connections require a configured Anthropic API key. Ask an admin to add one in Settings.</p>
    </div>
  {:else if loading}
    <div class="conn__loading"><span class="spinner"></span> Loading your connections...</div>
  {:else}
    <div class="conn__grid">
      {#each services as svc (svc.service.id)}
        <article class="card" class:card--connected={svc.connected}>
          <div class="card__head">
            <div class="card__head-text">
              <h3 class="card__name">{svc.service.displayName}</h3>
              <span class="card__category">{svc.service.category}</span>
            </div>
            {#if svc.connected}
              <span class="card__status card__status--ok">Connected</span>
            {:else}
              <span class="card__status card__status--off">Not connected</span>
            {/if}
          </div>

          <p class="card__url">{svc.service.mcpServerUrl}</p>

          {#if svc.connected && svc.connectedAt}
            <p class="card__meta">Connected on {formatDate(svc.connectedAt)}</p>
          {/if}

          <div class="card__actions">
            {#if svc.service.authType === 'oauth'}
              {#if svc.connected}
                <a class="btn btn--secondary" href="/api/connections/oauth/{svc.service.id}/start">
                  Reconnect
                </a>
                <button class="btn btn--danger-ghost" onclick={() => disconnect(svc)}>Disconnect</button>
              {:else}
                <a class="btn btn--primary" href="/api/connections/oauth/{svc.service.id}/start">
                  Sign in with {svc.service.displayName}
                </a>
              {/if}
            {:else}
              {#if svc.connected}
                <button class="btn btn--secondary" onclick={() => openConnectModal(svc)}>Reconnect</button>
                <button class="btn btn--danger-ghost" onclick={() => disconnect(svc)}>Disconnect</button>
              {:else}
                <button class="btn btn--primary" onclick={() => openConnectModal(svc)}>Connect</button>
              {/if}
            {/if}
          </div>
        </article>
      {/each}
    </div>

    <!-- ===== Custom MCP servers ===== -->
    <section class="conn__section">
      <div class="conn__section-head">
        <div>
          <h2 class="conn__section-title">Custom MCP servers</h2>
          <p class="conn__section-desc">
            Connect any MCP server by URL. Use this for self-hosted servers or services not in the curated list above.
          </p>
        </div>
        <button class="btn btn--primary" onclick={openCustomModal}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add custom MCP
        </button>
      </div>

      {#if custom.length === 0}
        <div class="conn__empty">
          <p>No custom MCP servers connected.</p>
        </div>
      {:else}
        <div class="conn__grid">
          {#each custom as c (c.credentialId)}
            <article class="card card--connected">
              <div class="card__head">
                <div class="card__head-text">
                  <h3 class="card__name">{c.displayName}</h3>
                  <span class="card__category">Custom</span>
                </div>
                <span class="card__status card__status--ok">Connected</span>
              </div>
              <p class="card__url">{c.mcpServerUrl}</p>
              <p class="card__meta">Connected on {formatDate(c.connectedAt)}</p>
              <div class="card__actions">
                <button class="btn btn--danger-ghost" onclick={() => disconnectCustom(c)}>Disconnect</button>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

{#if modalService}
  <div
    class="modal-backdrop"
    role="presentation"
    onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    onkeydown={(e) => { if (e.key === 'Escape') closeModal(); }}
  >
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal__head">
        <h2 id="modal-title" class="modal__title">
          {modalService.connected ? 'Reconnect' : 'Connect'} {modalService.service.displayName}
        </h2>
        <button class="modal__close" onclick={closeModal} aria-label="Close">&times;</button>
      </header>

      <ol class="modal__steps">
        {#each modalService.service.instructions as step (step)}
          <li>{step}</li>
        {/each}
      </ol>

      <a class="modal__link" href={modalService.service.tokenUrl} target="_blank" rel="noopener noreferrer">
        Open {modalService.service.displayName} token page
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2M10 2h4v4M14 2L7 9" />
        </svg>
      </a>

      <form
        class="modal__form"
        onsubmit={(e) => { e.preventDefault(); submitConnect(); }}
      >
        <label class="modal__label" for="modal-token">Token</label>
        <input
          id="modal-token"
          class="modal__input"
          type="password"
          placeholder={modalService.service.tokenPlaceholder ?? 'Paste token here'}
          autocomplete="off"
          required
          bind:value={modalToken}
        />
        {#if modalService.service.lifetimeNote}
          <p class="modal__note">{modalService.service.lifetimeNote}</p>
        {/if}
        <div class="modal__actions">
          <button type="button" class="btn btn--secondary" onclick={closeModal}>Cancel</button>
          <button class="btn btn--primary" type="submit" disabled={modalSubmitting || !modalToken.trim()}>
            {modalSubmitting ? 'Saving...' : (modalService.connected ? 'Rotate token' : 'Connect')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if customModalOpen}
  <div
    class="modal-backdrop"
    role="presentation"
    onclick={(e) => { if (e.target === e.currentTarget) closeCustomModal(); }}
    onkeydown={(e) => { if (e.key === 'Escape') closeCustomModal(); }}
  >
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="custom-modal-title">
      <header class="modal__head">
        <h2 id="custom-modal-title" class="modal__title">Add custom MCP server</h2>
        <button class="modal__close" onclick={closeCustomModal} aria-label="Close">&times;</button>
      </header>

      <p class="modal__note">
        Connect any MCP server by URL — useful for self-hosted servers or services not in the curated list.
        The token is sent over a static bearer authentication header.
      </p>

      <form
        class="modal__form"
        onsubmit={(e) => { e.preventDefault(); submitCustom(); }}
      >
        <label class="modal__label" for="custom-name">Display name <span class="modal__optional">optional</span></label>
        <input
          id="custom-name"
          class="modal__input"
          type="text"
          placeholder="e.g. Internal docs server"
          bind:value={customDisplayName}
        />

        <label class="modal__label" for="custom-url">MCP server URL</label>
        <input
          id="custom-url"
          class="modal__input"
          type="url"
          placeholder="https://mcp.example.com/sse"
          required
          bind:value={customMcpUrl}
        />

        <label class="modal__label" for="custom-token">Bearer token</label>
        <input
          id="custom-token"
          class="modal__input"
          type="password"
          placeholder="Token never displayed again"
          autocomplete="off"
          required
          bind:value={customToken}
        />

        <div class="modal__actions">
          <button type="button" class="btn btn--secondary" onclick={closeCustomModal}>Cancel</button>
          <button class="btn btn--primary" type="submit" disabled={customSubmitting || !customMcpUrl.trim() || !customToken.trim()}>
            {customSubmitting ? 'Saving...' : 'Connect'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style lang="scss">
  .conn {
    max-width: 880px;
    padding: var(--space-8) var(--space-6);
    margin: 0 auto;

    &__header { margin-bottom: var(--space-7); }

    &__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      color: var(--text-primary);
      margin: 0 0 var(--space-3);
    }

    &__desc {
      font-size: var(--text-sm);
      color: var(--text-muted);
      margin: 0;
    }

    &__message {
      padding: var(--space-4) var(--space-5);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-5);
      font-size: var(--text-sm);

      &--success { background: var(--accent-success-muted); color: var(--accent-success); }
      &--error { background: var(--accent-danger-muted); color: var(--accent-danger); }
    }

    &__gate {
      padding: var(--space-6);
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      color: var(--text-muted);
      font-size: var(--text-sm);
    }

    &__loading {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      color: var(--text-muted);
      font-size: var(--text-sm);
    }

    &__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--space-4);
    }

    &__section {
      margin-top: var(--space-9);
      padding-top: var(--space-7);
      border-top: 1px solid var(--border-subtle);
    }

    &__section-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-5);
    }

    &__section-title {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      margin: 0 0 var(--space-2);
    }

    &__section-desc {
      font-size: var(--text-sm);
      color: var(--text-muted);
      margin: 0;
      max-width: 540px;
    }

    &__empty {
      padding: var(--space-6);
      background: var(--surface-1);
      border: 1px dashed var(--border-default);
      border-radius: var(--radius-md);
      text-align: center;
      color: var(--text-muted);
      font-size: var(--text-sm);

      p { margin: 0; }
    }
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-5);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

    &:hover { border-color: var(--border-strong); }
    &--connected { border-color: var(--accent-success); }

    &__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
    }

    &__head-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    &__name {
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      margin: 0;
    }

    &__category {
      font-size: var(--text-xs);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    &__status {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.04em;

      &--ok { background: var(--accent-success-muted); color: var(--accent-success); }
      &--off { background: var(--surface-3); color: var(--text-muted); }
    }

    &__url {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      color: var(--text-muted);
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__meta {
      font-size: var(--text-xs);
      color: var(--text-muted);
      margin: 0;
    }

    &__actions {
      display: flex;
      gap: var(--space-2);
      margin-top: var(--space-2);
    }
  }

  /* === Buttons (scoped subset, matches the rest of the app) === */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-3) var(--space-5);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    cursor: pointer;
    transition: background var(--transition-fast), opacity var(--transition-fast);

    &:disabled { opacity: 0.45; cursor: not-allowed; }

    &--primary {
      background: var(--accent-primary);
      color: #fff;
      &:hover:not(:disabled) { background: var(--accent-primary-hover); }
    }

    &--secondary {
      background: var(--surface-2);
      color: var(--text-primary);
      border-color: var(--border-default);
      &:hover:not(:disabled) { background: var(--surface-3); }
    }

    &--danger-ghost {
      background: transparent;
      color: var(--accent-danger);
      &:hover:not(:disabled) { background: var(--accent-danger-muted); }
    }
  }

  /* === Modal === */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: var(--space-5);
  }

  .modal {
    width: 100%;
    max-width: 480px;
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: var(--space-7);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);

    &__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    &__title {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      margin: 0;
    }

    &__close {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      &:hover { background: var(--surface-2); color: var(--text-primary); }
    }

    &__steps {
      margin: 0;
      padding-left: var(--space-6);
      font-size: var(--text-sm);
      color: var(--text-secondary);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    &__link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      align-self: flex-start;
      font-size: var(--text-sm);
      color: var(--accent-primary);
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    &__form {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    &__label {
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--text-muted);
    }

    &__input {
      padding: var(--space-3) var(--space-4);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--surface-0);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      outline: none;

      &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px var(--accent-primary-muted); }
    }

    &__note {
      font-size: var(--text-sm);
      color: var(--text-muted);
      margin: 0;
    }

    &__optional {
      font-weight: var(--weight-normal);
      color: var(--text-muted);
      margin-left: var(--space-2);
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
    }
  }

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid var(--border-default);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
