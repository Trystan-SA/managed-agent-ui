<script lang="ts">
  import { theme } from '$lib/stores/theme';
  import { goto } from '$app/navigation';

  let { data } = $props();

  let apiKeyValue = $state('');
  let apiKeyLabel = $state('');
  let showKey = $state(false);
  let saving = $state(false);
  let removing = $state(false);
  let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);

  function formatDate(iso: string): string {
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  async function updateApiKey() {
    if (!apiKeyValue.trim()) return;
    saving = true;
    message = null;
    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyValue, label: apiKeyLabel || undefined })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to update API key');
      }
      message = { type: 'success', text: 'API key updated successfully.' };
      apiKeyValue = '';
      apiKeyLabel = '';
    } catch (e: any) {
      message = { type: 'error', text: e.message };
    } finally {
      saving = false;
    }
  }

  async function removeApiKey() {
    if (!confirm('Are you sure you want to remove your API key? This cannot be undone.')) return;
    removing = true;
    message = null;
    try {
      const res = await fetch('/api/settings/api-key', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove API key');
      message = { type: 'success', text: 'API key removed.' };
    } catch (e: any) {
      message = { type: 'error', text: e.message };
    } finally {
      removing = false;
    }
  }

  function toggleTheme() {
    theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    goto('/login');
  }
</script>

<svelte:head>
  <title>Settings — Managed Agents</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1 class="page-header__title">Settings</h1>
    <p class="page-header__subtitle">Manage your API key, preferences, and account</p>
  </div>
</div>

<div class="settings">
  <!-- API Key Section -->
  <section class="settings__section">
    <h2 class="settings__heading">API Key</h2>

    {#if data.hasApiKey}
      <div class="settings__info">
        <span class="settings__info-label">
          {data.apiKeyLabel ?? 'Unnamed key'}
        </span>
        {#if data.apiKeyCreatedAt}
          <span class="settings__info-meta">
            Added on {formatDate(data.apiKeyCreatedAt)}
          </span>
        {/if}
      </div>
    {:else}
      <p class="settings__empty">No API key configured</p>
    {/if}

    {#if message}
      <div class="settings__message settings__message--{message.type}">
        {message.text}
      </div>
    {/if}

    <form class="settings__form" onsubmit={(e) => { e.preventDefault(); updateApiKey(); }}>
      <div class="form-group">
        <label class="form-label" for="api-key">New API Key</label>
        <div class="settings__key-input">
          <input
            class="form-input"
            id="api-key"
            type={showKey ? 'text' : 'password'}
            placeholder="sk-ant-..."
            bind:value={apiKeyValue}
            autocomplete="off"
          />
          <button
            type="button"
            class="btn btn--secondary settings__toggle-vis"
            onclick={() => (showKey = !showKey)}
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="api-label">Label (optional)</label>
        <input
          class="form-input"
          id="api-label"
          type="text"
          placeholder="e.g. Production key"
          bind:value={apiKeyLabel}
        />
      </div>

      <button class="btn" type="submit" disabled={saving || !apiKeyValue.trim()}>
        {saving ? 'Saving...' : 'Update API Key'}
      </button>
    </form>

    {#if data.hasApiKey}
      <div class="settings__danger-zone">
        <button class="btn btn--danger" onclick={removeApiKey} disabled={removing}>
          {removing ? 'Removing...' : 'Remove API Key'}
        </button>
      </div>
    {/if}
  </section>

  <!-- Theme Section -->
  <section class="settings__section">
    <h2 class="settings__heading">Theme</h2>
    <div class="settings__theme-toggle">
      <span class="settings__theme-label">Current: <strong>{$theme}</strong></span>
      <button class="btn btn--secondary" onclick={toggleTheme}>
        Switch to {$theme === 'dark' ? 'Light' : 'Dark'}
      </button>
    </div>
  </section>

  <!-- Account Section -->
  <section class="settings__section">
    <h2 class="settings__heading">Account</h2>
    {#if data.userId}
      <p class="settings__info-meta">User ID: {data.userId}</p>
    {/if}
    <button class="btn btn--danger" onclick={logout}>Log Out</button>
  </section>
</div>

<style lang="scss">
  .settings {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    max-width: 640px;

    &__section {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 1.5rem;
    }

    &__heading {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 1rem;
      color: var(--color-text);
    }

    &__info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 1rem;
    }

    &__info-label {
      font-weight: 500;
      color: var(--color-text);
    }

    &__info-meta {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    &__empty {
      color: var(--color-text-muted);
      margin-bottom: 1rem;
    }

    &__message {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.875rem;

      &--success {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
        border: 1px solid rgba(34, 197, 94, 0.2);
      }

      &--error {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.2);
      }
    }

    &__form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    &__key-input {
      display: flex;
      gap: 0.5rem;

      .form-input {
        flex: 1;
      }
    }

    &__toggle-vis {
      flex-shrink: 0;
      min-width: 60px;
    }

    &__danger-zone {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
    }

    &__theme-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    &__theme-label {
      color: var(--color-text);
      text-transform: capitalize;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-muted);
  }

  .form-input {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    color: var(--color-text);
    font-size: 0.875rem;

    &::placeholder {
      color: var(--color-text-muted);
      opacity: 0.6;
    }

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb, 99, 102, 241), 0.15);
    }
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    background: var(--color-primary);
    color: #fff;
    transition: opacity 0.15s;

    &:hover:not(:disabled) {
      opacity: 0.9;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--secondary {
      background: var(--color-surface);
      color: var(--color-text);
      border-color: var(--color-border);
    }

    &--danger {
      background: #ef4444;
      color: #fff;
    }
  }
</style>
