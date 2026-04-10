<script lang="ts">
  import { theme } from '$lib/stores/theme';
  import { goto } from '$app/navigation';
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';

  const { data } = $props();

  // Navigation
  type Tab = 'api-keys' | 'appearance' | 'account' | 'users';
  let activeTab = $state<Tab>(data.userRole === 'admin' ? 'api-keys' : 'appearance');

  // API key form
  let keyValue = $state('');
  let showKey = $state(false);
  let savingKey = $state(false);

  let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- Admin: User Management ---
  let userList = $state<Record<string, unknown>[]>([]);
  let loadingUsers = $state(true);
  let inviteList = $state<Record<string, unknown>[]>([]);
  let loadingInvites = $state(true);
  let inviteEmail = $state('');
  let inviteTempPassword = $state('');
  let useTemporaryPassword = $state(false);
  let inviting = $state(false);
  let inviteResult = $state<{ inviteUrl?: string; emailSent?: boolean } | null>(null);
  let copiedUrl = $state(false);

  const isAdmin = $derived(data.userRole === 'admin');

  onMount(async () => {
    if (isAdmin) {
      await Promise.all([loadUsers(), loadInvites()]);
    }
  });

  async function loadUsers() {
    loadingUsers = true;
    try {
      const res = await fetch('/api/admin/users');
      userList = await res.json();
    } catch { userList = []; }
    finally { loadingUsers = false; }
  }

  async function loadInvites() {
    loadingInvites = true;
    try {
      const res = await fetch('/api/admin/invites');
      inviteList = await res.json();
    } catch { inviteList = []; }
    finally { loadingInvites = false; }
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`Delete user "${email}"? Their API keys and data will be permanently removed.`)) return;
    message = null;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      message = { type: 'success', text: `User ${email} deleted.` };
      await loadUsers();
    } catch (e: unknown) {
      message = { type: 'error', text: e instanceof Error ? e.message : String(e) };
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    inviting = true;
    message = null;
    inviteResult = null;
    copiedUrl = false;
    try {
      const body: Record<string, string> = { email: inviteEmail };
      if (useTemporaryPassword && inviteTempPassword) {
        body.temporaryPassword = inviteTempPassword;
      }

      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const result = await res.json();
      inviteResult = result;

      if (result.emailSent) {
        message = { type: 'success', text: `Invite email sent to ${inviteEmail}` };
      } else {
        message = { type: 'success', text: 'Invite created. Share the URL below with the user.' };
      }

      inviteEmail = '';
      inviteTempPassword = '';
      useTemporaryPassword = false;
      await loadInvites();
    } catch (e: unknown) {
      message = { type: 'error', text: e instanceof Error ? e.message : String(e) };
    } finally {
      inviting = false;
    }
  }

  async function revokeInvite(id: string) {
    try {
      await fetch(`/api/admin/invites?id=${id}`, { method: 'DELETE' });
      await loadInvites();
    } catch (e: unknown) {
      message = { type: 'error', text: e instanceof Error ? e.message : String(e) };
    }
  }

  async function copyInviteUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      copiedUrl = true;
      setTimeout(() => (copiedUrl = false), 2000);
    } catch { /* no-op */ }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  async function saveApiKey() {
    if (!keyValue.trim()) return;
    savingKey = true;
    message = null;
    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyValue })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to save API key');
      }
      message = { type: 'success', text: 'API key saved.' };
      keyValue = '';
      showKey = false;
      await invalidateAll();
    } catch (e: unknown) {
      message = { type: 'error', text: e instanceof Error ? e.message : String(e) };
    } finally {
      savingKey = false;
    }
  }

  async function removeApiKey() {
    if (!confirm('Remove your API key? You won\'t be able to use agents until you add a new one.')) return;
    message = null;
    try {
      const res = await fetch('/api/settings/api-key', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove API key');
      message = { type: 'success', text: 'API key removed.' };
      await invalidateAll();
    } catch (e: unknown) {
      message = { type: 'error', text: e instanceof Error ? e.message : String(e) };
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    goto('/login');
  }
</script>

<svelte:head>
  <title>Settings — Managed Agents</title>
</svelte:head>

<div class="sp">
  <!-- Sidebar nav -->
  <nav class="sp__nav">
    <div class="sp__nav-title">Settings</div>
    <ul class="sp__nav-list">
      <li>
        <button class="sp__nav-item" class:sp__nav-item--active={activeTab === 'appearance'} onclick={() => (activeTab = 'appearance')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.25"/>
            <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
          </svg>
          Appearance
        </button>
      </li>
      <li>
        <button class="sp__nav-item" class:sp__nav-item--active={activeTab === 'account'} onclick={() => (activeTab = 'account')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.25"/>
            <path d="M3 13.5c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
          </svg>
          Account
        </button>
      </li>
      {#if isAdmin}
        <li class="sp__nav-divider"></li>
        <li>
          <button class="sp__nav-item" class:sp__nav-item--active={activeTab === 'api-keys'} onclick={() => (activeTab = 'api-keys')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10.5 1.5a3.5 3.5 0 0 1 .885 6.889L11 8.5l-1 1-1 1-1.5.5-.5 1.5H5v1.5H3.5V13H2v-1.5l5.111-5.111A3.5 3.5 0 0 1 10.5 1.5z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="11" cy="5" r="1" fill="currentColor"/>
            </svg>
            API Key
            <span class="sp__nav-badge">Admin</span>
          </button>
        </li>
        <li>
          <button class="sp__nav-item" class:sp__nav-item--active={activeTab === 'users'} onclick={() => (activeTab = 'users')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6" cy="5" r="2.25" stroke="currentColor" stroke-width="1.25"/>
              <path d="M1.5 13.5c0-2.21 2.015-4 4.5-4s4.5 1.79 4.5 4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
              <circle cx="12" cy="5.5" r="1.75" stroke="currentColor" stroke-width="1.25"/>
              <path d="M12.5 9.5c1.38.46 2.5 1.68 2.5 3.25" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
            </svg>
            Users
            <span class="sp__nav-badge">Admin</span>
          </button>
        </li>
      {/if}
    </ul>
  </nav>

  <!-- Content panel -->
  <main class="sp__content">
    {#if message}
      <div class="sp__message sp__message--{message.type}" role="alert">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          {#if message.type === 'success'}
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.25"/>
            <path d="M5 8.5l2 2 4-4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
          {:else}
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.25"/>
            <path d="M8 5v3.5M8 10.5h.007" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
          {/if}
        </svg>
        {message.text}
      </div>
    {/if}

    <!-- ==================== API Key (Admin) ==================== -->
    {#if activeTab === 'api-keys' && isAdmin}
      <div class="panel">
        <div class="panel__header">
          <h2 class="panel__title">API Key</h2>
          <p class="panel__desc">Global Anthropic API key used by all users</p>
        </div>

        {#if data.apiKey}
          <div class="key-row">
            <div class="key-row__icon">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M10.5 1.5a3.5 3.5 0 0 1 .885 6.889L11 8.5l-1 1-1 1-1.5.5-.5 1.5H5v1.5H3.5V13H2v-1.5l5.111-5.111A3.5 3.5 0 0 1 10.5 1.5z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="key-row__info">
              <span class="key-row__name">Configured</span>
              <span class="key-row__meta">Added {formatDate(data.apiKey.createdAt)}</span>
            </div>
            <button class="btn-icon btn-icon--danger" title="Remove" onclick={removeApiKey}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 4.5h10M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M6.5 7v4M9.5 7v4M4.5 4.5l.5 8.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-8.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        {:else}
          <div class="empty-state">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" opacity="0.4">
              <path d="M10.5 1.5a3.5 3.5 0 0 1 .885 6.889L11 8.5l-1 1-1 1-1.5.5-.5 1.5H5v1.5H3.5V13H2v-1.5l5.111-5.111A3.5 3.5 0 0 1 10.5 1.5z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>No API key configured</span>
          </div>
        {/if}

        <div class="sub-section">
          <h3 class="sub-section__title">{data.apiKey ? 'Replace' : 'Add'} API Key</h3>
          <form class="form-stack" onsubmit={(e) => { e.preventDefault(); saveApiKey(); }}>
            <div class="field">
              <label class="field__label" for="key-value">API Key</label>
              <div class="field-row">
                <input
                  class="field-input"
                  id="key-value"
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-ant-..."
                  autocomplete="off"
                  required
                  bind:value={keyValue}
                />
                <button type="button" class="btn btn--secondary btn--sm" onclick={() => (showKey = !showKey)}>
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button class="btn btn--primary" type="submit" disabled={savingKey || !keyValue.trim()}>
              {savingKey ? 'Saving...' : data.apiKey ? 'Replace Key' : 'Save Key'}
            </button>
          </form>
        </div>
      </div>

    <!-- ==================== Appearance ==================== -->
    {:else if activeTab === 'appearance'}
      <div class="panel">
        <div class="panel__header">
          <h2 class="panel__title">Appearance</h2>
          <p class="panel__desc">Customize how the dashboard looks</p>
        </div>

        <div class="theme-switcher">
          <button
            class="theme-option"
            class:theme-option--active={$theme === 'light'}
            onclick={() => theme.set('light')}
          >
            <div class="theme-option__preview theme-option__preview--light">
              <div class="theme-preview-bar"></div>
              <div class="theme-preview-lines">
                <div class="theme-preview-line"></div>
                <div class="theme-preview-line theme-preview-line--short"></div>
              </div>
            </div>
            <span class="theme-option__label">Light</span>
          </button>
          <button
            class="theme-option"
            class:theme-option--active={$theme === 'dark'}
            onclick={() => theme.set('dark')}
          >
            <div class="theme-option__preview theme-option__preview--dark">
              <div class="theme-preview-bar"></div>
              <div class="theme-preview-lines">
                <div class="theme-preview-line"></div>
                <div class="theme-preview-line theme-preview-line--short"></div>
              </div>
            </div>
            <span class="theme-option__label">Dark</span>
          </button>
        </div>
      </div>

    <!-- ==================== Account ==================== -->
    {:else if activeTab === 'account'}
      <div class="panel">
        <div class="panel__header">
          <h2 class="panel__title">Account</h2>
          <p class="panel__desc">Your profile and session</p>
        </div>

        <div class="account-card">
          <div class="account-card__avatar">
            {data.userEmail?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div class="account-card__details">
            <span class="account-card__email">{data.userEmail ?? 'Unknown'}</span>
            <span class="account-card__role">
              <span class="role-badge" data-role={data.userRole}>{data.userRole}</span>
            </span>
          </div>
        </div>

        <div class="sub-section">
          <h3 class="sub-section__title">Session</h3>
          <p class="meta-text">Logging out will end your current session on this device.</p>
          <button class="btn btn--danger" onclick={logout}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M11 11l3-3-3-3M5.5 8H14" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Log Out
          </button>
        </div>
      </div>

    <!-- ==================== User Management ==================== -->
    {:else if activeTab === 'users' && isAdmin}
      <div class="panel">
        <div class="panel__header">
          <div>
            <h2 class="panel__title">User Management</h2>
            <p class="panel__desc">Manage team members and invitations</p>
          </div>
          <a href="/settings/admin" class="smtp-link">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M1 4l7 4.5L15 4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.25"/>
            </svg>
            SMTP Settings
          </a>
        </div>

        <!-- Users list -->
        <div class="um-section">
          <div class="um-section__label">
            <span class="um-count">{userList.length}</span>
            Registered Users
          </div>

          {#if loadingUsers}
            <div class="loading-row">
              <span class="spinner"></span> Loading users...
            </div>
          {:else}
            <div class="um-user-list">
              {#each userList as user (user.id)}
                <div class="um-user">
                  <div class="um-user__avatar">
                    {user.email?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div class="um-user__info">
                    <span class="um-user__email">{user.email}</span>
                    <span class="um-user__meta">Joined {formatDate(user.createdAt)}</span>
                  </div>
                  <span class="role-badge" data-role={user.role}>{user.role}</span>
                  {#if user.role !== 'admin'}
                    <button
                      class="btn-icon btn-icon--danger"
                      title="Delete user"
                      onclick={() => deleteUser(user.id, user.email)}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 4.5h10M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M6.5 7v4M9.5 7v4M4.5 4.5l.5 8.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-8.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Invite form -->
        <div class="um-section">
          <div class="um-section__label">Invite New User</div>
          <form class="form-stack" onsubmit={(e) => { e.preventDefault(); sendInvite(); }}>
            <div class="field">
              <label class="field__label" for="invite-email">Email address</label>
              <input
                class="field-input"
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                required
                bind:value={inviteEmail}
              />
            </div>

            <label class="toggle-row">
              <input type="checkbox" bind:checked={useTemporaryPassword} />
              <span class="toggle__track"><span class="toggle__thumb"></span></span>
              <span class="toggle__text">Set temporary password</span>
            </label>

            {#if useTemporaryPassword}
              <div class="field">
                <label class="field__label" for="temp-pw">Temporary Password</label>
                <input
                  class="field-input"
                  id="temp-pw"
                  type="text"
                  placeholder="They'll be asked to change it on login"
                  bind:value={inviteTempPassword}
                />
              </div>
            {/if}

            <button class="btn btn--primary" type="submit" disabled={inviting || !inviteEmail.trim()}>
              {#if inviting}
                <span class="spinner"></span> Sending...
              {:else}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                Send Invite
              {/if}
            </button>
          </form>

          {#if inviteResult?.inviteUrl && !inviteResult.emailSent}
            <div class="url-box">
              <div class="url-box__label">Share this invite link:</div>
              <div class="url-box__row">
                <code class="url-box__code">{inviteResult.inviteUrl}</code>
                <button
                  class="url-box__copy"
                  type="button"
                  onclick={() => copyInviteUrl(inviteResult?.inviteUrl ?? '')}
                >
                  {copiedUrl ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          {/if}
        </div>

        <!-- Pending invites -->
        {#if !loadingInvites && inviteList.length > 0}
          <div class="um-section">
            <div class="um-section__label">
              <span class="um-count">{inviteList.filter(i => i.status === 'pending').length}</span>
              Invitations
            </div>
            <div class="um-invite-list">
              {#each inviteList as inv (inv.id)}
                <div class="um-invite-row">
                  <div class="um-invite-row__info">
                    <span class="um-invite-row__email">{inv.email}</span>
                    <span class="um-invite-row__meta">{formatDate(inv.createdAt)}</span>
                  </div>
                  <span class="status-badge" data-status={inv.status}>{inv.status}</span>
                  {#if inv.status === 'pending'}
                    <button class="btn-text btn-text--danger" onclick={() => revokeInvite(inv.id)}>Revoke</button>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </main>
</div>

<style lang="scss">
  /* ======== Layout Shell ======== */
  .sp {
    display: flex;
    gap: var(--space-8);
    min-height: calc(100vh - 56px - var(--space-10) * 2);
  }

  /* ======== Sidebar Nav ======== */
  .sp__nav {
    position: sticky;
    top: calc(56px + var(--space-10));
    align-self: flex-start;
    width: 200px;
    flex-shrink: 0;
  }

  .sp__nav-title {
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
    color: var(--text-primary);
    padding: 0 var(--space-4);
    margin-bottom: var(--space-6);
  }

  .sp__nav-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .sp__nav-divider {
    height: 1px;
    background: var(--border-subtle);
    margin: var(--space-3) var(--space-4);
  }

  .sp__nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
    padding: var(--space-3) var(--space-4);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--text-secondary);
    background: none;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: color var(--transition-fast), background var(--transition-fast);
    text-align: left;

    &:hover {
      color: var(--text-primary);
      background: var(--surface-2);
    }

    &--active {
      color: var(--text-primary);
      background: var(--surface-2);
      font-weight: var(--weight-semibold);
    }
  }

  .sp__nav-badge {
    margin-left: auto;
    font-size: 10px;
    font-weight: var(--weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 1px 6px;
    border-radius: var(--radius-full);
    background: var(--accent-primary-muted);
    color: var(--accent-primary);
  }

  /* ======== Content Panel ======== */
  .sp__content {
    flex: 1;
    min-width: 0;
    max-width: 680px;
  }

  .sp__message {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-6);
    font-size: var(--text-sm);

    &--success { background: var(--accent-success-muted); color: var(--accent-success); border: 1px solid rgba(34, 197, 94, 0.2); }
    &--error { background: var(--accent-danger-muted); color: var(--accent-danger); border: 1px solid rgba(239, 68, 68, 0.2); }
  }

  /* ======== Panel ======== */
  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-7);

    &__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
    }

    &__title {
      font-size: var(--text-xl);
      font-weight: var(--weight-bold);
      color: var(--text-primary);
      line-height: var(--leading-tight);
    }

    &__desc {
      font-size: var(--text-sm);
      color: var(--text-muted);
      margin-top: var(--space-1);
    }
  }

  .sub-section {
    padding-top: var(--space-6);
    border-top: 1px solid var(--border-subtle);

    &__title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-secondary);
      margin-bottom: var(--space-4);
    }
  }

  /* ======== Shared atoms ======== */
  .meta-text {
    font-size: var(--text-sm);
    color: var(--text-muted);
    margin-bottom: var(--space-4);
  }

  .empty-state {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-6);
    color: var(--text-muted);
    font-size: var(--text-sm);
    background: var(--surface-2);
    border-radius: var(--radius-md);
  }

  .loading-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-sm);
    color: var(--text-muted);
    padding: var(--space-5) 0;
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

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ======== Key rows ======== */
  .key-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .key-row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    transition: border-color var(--transition-fast);

    &:hover { border-color: var(--border-strong); }

    &--shared { border-left: 3px solid var(--accent-info); }

    &__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      background: var(--surface-2);
      color: var(--text-muted);
      flex-shrink: 0;

      &--shared { background: var(--accent-info-muted); color: var(--accent-info); }
    }

    &__info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    &__name {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__label,
    &__meta {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    &__actions {
      display: flex;
      gap: var(--space-2);
      flex-shrink: 0;
    }
  }

  /* ======== Theme switcher ======== */
  .theme-switcher {
    display: flex;
    gap: var(--space-4);
  }

  .theme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    background: none;
    border: 2px solid var(--border-default);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    font-family: var(--font-sans);

    &:hover { border-color: var(--border-strong); }

    &--active {
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 3px var(--accent-primary-muted);
    }

    &__preview {
      width: 120px;
      height: 72px;
      border-radius: var(--radius-md);
      padding: var(--space-3);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);

      &--light {
        background: #f8f9fb;
        border: 1px solid #e4e5ec;
      }

      &--dark {
        background: #12121a;
        border: 1px solid #2a2a3c;
      }
    }

    &__label {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
    }
  }

  .theme-preview-bar {
    height: 6px;
    width: 60%;
    border-radius: 3px;

    .theme-option__preview--light & { background: #d8d9e4; }
    .theme-option__preview--dark & { background: #2a2a3c; }
  }

  .theme-preview-lines {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .theme-preview-line {
    height: 4px;
    border-radius: 2px;

    .theme-option__preview--light & { background: #e4e5ec; }
    .theme-option__preview--dark & { background: #1e1e2e; }

    &--short { width: 40%; }
  }

  /* ======== Account card ======== */
  .account-card {
    display: flex;
    align-items: center;
    gap: var(--space-5);
    padding: var(--space-6);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);

    &__avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-full);
      background: var(--accent-primary-muted);
      color: var(--accent-primary);
      font-size: var(--text-lg);
      font-weight: var(--weight-bold);
      flex-shrink: 0;
    }

    &__details {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    &__email {
      font-size: var(--text-base);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
    }
  }

  .role-badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: var(--weight-semibold);
    border-radius: var(--radius-full);
    text-transform: uppercase;
    letter-spacing: 0.03em;

    &[data-role='admin'] { background: var(--accent-primary-muted); color: var(--accent-primary); }
    &[data-role='member'] { background: var(--surface-3); color: var(--text-secondary); }
  }

  /* ======== User Management ======== */
  .smtp-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
    text-decoration: none;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast), background var(--transition-fast);
    flex-shrink: 0;

    &:hover { color: var(--accent-primary); background: var(--accent-primary-muted); }
  }

  .um-section {
    padding-top: var(--space-6);
    border-top: 1px solid var(--border-subtle);

    &__label {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: var(--space-4);
    }
  }

  .um-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: var(--radius-full);
    background: var(--accent-primary-muted);
    color: var(--accent-primary);
    font-size: 11px;
    font-weight: var(--weight-bold);
    font-variant-numeric: tabular-nums;
  }

  .um-user-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .um-user {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    transition: border-color var(--transition-fast);

    &:hover { border-color: var(--border-strong); }

    &__avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-full);
      background: var(--accent-primary-muted);
      color: var(--accent-primary);
      font-size: var(--text-xs);
      font-weight: var(--weight-bold);
      flex-shrink: 0;
    }

    &__info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    &__email {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__meta {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
  }

  .um-invite-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .um-invite-row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-5);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);

    &__info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    &__email {
      font-size: var(--text-sm);
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__meta {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
  }

  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: var(--weight-semibold);
    border-radius: var(--radius-full);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    flex-shrink: 0;

    &[data-status='pending'] { background: var(--accent-warning-muted); color: var(--accent-warning); }
    &[data-status='accepted'] { background: var(--accent-success-muted); color: var(--accent-success); }
    &[data-status='expired'] { background: var(--accent-danger-muted); color: var(--accent-danger); }
  }

  /* ======== Toggle ======== */
  .toggle-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    cursor: pointer;

    input { position: absolute; opacity: 0; width: 0; height: 0; }
  }

  .toggle__track {
    position: relative;
    width: 32px;
    height: 18px;
    background: var(--border-strong);
    border-radius: var(--radius-full);
    transition: background var(--transition-fast);
    flex-shrink: 0;
  }

  .toggle-row input:checked + .toggle__track {
    background: var(--accent-primary);
  }

  .toggle__thumb {
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

  .toggle-row input:checked + .toggle__track .toggle__thumb {
    transform: translateX(14px);
  }

  .toggle__text {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  /* ======== Invite URL box ======== */
  .url-box {
    margin-top: var(--space-4);
    padding: var(--space-4);
    background: var(--accent-success-muted);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: var(--radius-md);

    &__label {
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--accent-success);
      margin-bottom: var(--space-3);
    }

    &__row {
      display: flex;
      gap: var(--space-3);
      align-items: center;
    }

    &__code {
      flex: 1;
      display: block;
      padding: var(--space-2) var(--space-3);
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      color: var(--text-primary);
      background: var(--surface-1);
      border-radius: var(--radius-sm);
      word-break: break-all;
      user-select: all;
    }

    &__copy {
      flex-shrink: 0;
      padding: var(--space-2) var(--space-3);
      font-family: var(--font-sans);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--accent-primary);
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background var(--transition-fast);

      &:hover { background: var(--surface-2); }
    }
  }

  /* ======== Form atoms ======== */
  .form-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);

    &__label {
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--text-muted);
    }
  }

  .field-input {
    width: 100%;
    background: var(--surface-0);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-4) var(--space-5);
    color: var(--text-primary);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    outline: none;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

    &::placeholder { color: var(--text-muted); opacity: 0.6; }
    &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px var(--accent-primary-muted); }
  }

  .field-row {
    display: flex;
    gap: var(--space-3);

    .field-input { flex: 1; }
  }

  /* ======== Buttons ======== */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    cursor: pointer;
    border: 1px solid transparent;
    transition: background var(--transition-fast), opacity var(--transition-fast), box-shadow var(--transition-fast);
    text-decoration: none;

    &:disabled { opacity: 0.45; cursor: not-allowed; }

    &--primary {
      background: var(--accent-primary);
      color: #fff;
      &:hover:not(:disabled) { background: var(--accent-primary-hover); box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25); }
    }

    &--secondary {
      background: var(--surface-2);
      color: var(--text-primary);
      border-color: var(--border-default);
      &:hover:not(:disabled) { background: var(--surface-3); border-color: var(--border-strong); }
    }

    &--danger {
      background: var(--accent-danger);
      color: #fff;
      &:hover:not(:disabled) { background: var(--accent-danger-hover); }
    }

    &--sm { padding: var(--space-2) var(--space-4); font-size: var(--text-xs); }
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
    flex-shrink: 0;

    &:hover { background: var(--surface-3); color: var(--text-primary); }
    &--danger:hover { background: var(--accent-danger-muted); color: var(--accent-danger); }
  }

  .btn-text {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--accent-primary);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    transition: background var(--transition-fast);

    &:hover { background: var(--accent-primary-muted); }
    &--danger { color: var(--accent-danger); &:hover { background: var(--accent-danger-muted); } }
  }

  /* ======== Responsive ======== */
  @media (max-width: 768px) {
    .sp {
      flex-direction: column;
      gap: 0;
    }

    .sp__nav {
      position: static;
      width: 100%;
      border-bottom: 1px solid var(--border-default);
      padding-bottom: var(--space-4);
      margin-bottom: var(--space-6);
    }

    .sp__nav-title {
      font-size: var(--text-xl);
      margin-bottom: var(--space-4);
    }

    .sp__nav-list {
      flex-direction: row;
      overflow-x: auto;
      gap: var(--space-1);
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }

    .sp__nav-divider {
      width: 1px;
      height: auto;
      margin: 0 var(--space-2);
      align-self: stretch;
    }

    .sp__nav-item {
      white-space: nowrap;
      padding: var(--space-3) var(--space-4);
    }

    .theme-switcher {
      flex-direction: row;
    }

    .theme-option__preview {
      width: 100px;
      height: 60px;
    }
  }
</style>
