<script lang="ts">
  import { onMount } from 'svelte';

  // Users state
  let userList = $state<Record<string, unknown>[]>([]);
  let loadingUsers = $state(true);

  // Invites state
  let inviteList = $state<Record<string, unknown>[]>([]);
  let loadingInvites = $state(true);

  // Invite form
  let inviteEmail = $state('');
  let inviteTempPassword = $state('');
  let useTemporaryPassword = $state(false);
  let inviting = $state(false);
  let inviteResult = $state<{ inviteUrl?: string; emailSent?: boolean } | null>(null);

  // SMTP state
  let smtpHost = $state('');
  let smtpPort = $state('587');
  let smtpUsername = $state('');
  let smtpPassword = $state('');
  let smtpFromEmail = $state('');
  let smtpTestEmail = $state('');
  let savingSmtp = $state(false);
  let testingSmtp = $state(false);

  let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);

  onMount(async () => {
    await Promise.all([loadUsers(), loadInvites(), loadSmtp()]);
  });

  async function loadUsers() {
    loadingUsers = true;
    try {
      const res = await fetch('/api/admin/users');
      userList = await res.json();
    } catch { /* no-op */ userList = []; }
    finally { loadingUsers = false; }
  }

  async function loadInvites() {
    loadingInvites = true;
    try {
      const res = await fetch('/api/admin/invites');
      inviteList = await res.json();
    } catch { /* no-op */ inviteList = []; }
    finally { loadingInvites = false; }
  }

  async function loadSmtp() {
    try {
      const res = await fetch('/api/admin/smtp');
      const data = await res.json();
      if (data) {
        smtpHost = data.host;
        smtpPort = String(data.port);
        smtpUsername = data.username;
        smtpFromEmail = data.fromEmail;
      }
    } catch { /* no-op */ }
  }

  function formatDate(d: string): string {
    try { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(d)); }
    catch { return d; }
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`Delete user "${email}"? Their API keys and data will be permanently removed. Anthropic resources will not be affected.`)) return;
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

  async function saveSmtp() {
    savingSmtp = true;
    message = null;
    try {
      const res = await fetch('/api/admin/smtp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost,
          port: smtpPort,
          username: smtpUsername,
          password: smtpPassword,
          fromEmail: smtpFromEmail
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      message = { type: 'success', text: 'SMTP settings saved.' };
      smtpPassword = '';
    } catch (e: unknown) {
      message = { type: 'error', text: e instanceof Error ? e.message : String(e) };
    } finally {
      savingSmtp = false;
    }
  }

  async function testSmtp() {
    if (!smtpTestEmail.trim()) return;
    testingSmtp = true;
    message = null;
    try {
      const res = await fetch('/api/admin/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: smtpTestEmail })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      message = { type: 'success', text: `Test email sent to ${smtpTestEmail}` };
    } catch (e: unknown) {
      message = { type: 'error', text: e instanceof Error ? e.message : String(e) };
    } finally {
      testingSmtp = false;
    }
  }
</script>

<svelte:head>
  <title>Admin — Managed Agents</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1 class="page-header__title">Administration</h1>
    <p class="page-header__subtitle">Manage users, invites, and email settings</p>
  </div>
  <a href="/settings" class="admin__back">Back to Settings</a>
</div>

{#if message}
  <div class="admin__message admin__message--{message.type}">
    {message.text}
  </div>
{/if}

<div class="admin">
  <!-- Users Section -->
  <section class="admin__section">
    <h2 class="admin__heading">Users</h2>

    {#if loadingUsers}
      <p class="admin__meta">Loading...</p>
    {:else}
      <div class="admin__table-wrap">
        <table class="admin__table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each userList as user (user.id)}
              <tr>
                <td>{user.email}</td>
                <td><span class="admin__badge admin__badge--{user.role}">{user.role}</span></td>
                <td class="admin__meta">{formatDate(user.createdAt)}</td>
                <td>
                  {#if user.role !== 'admin'}
                    <button class="btn btn--danger btn--sm" onclick={() => deleteUser(user.id, user.email)}>Delete</button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <!-- Invite Section -->
  <section class="admin__section">
    <h2 class="admin__heading">Invite User</h2>

    <form class="admin__form" onsubmit={(e) => { e.preventDefault(); sendInvite(); }}>
      <div class="form-group">
        <label class="form-label" for="invite-email">Email</label>
        <input class="form-input" id="invite-email" type="email" placeholder="user@example.com" required bind:value={inviteEmail} />
      </div>

      <div class="admin__checkbox">
        <label>
          <input type="checkbox" bind:checked={useTemporaryPassword} />
          Use temporary password (no email sent)
        </label>
      </div>

      {#if useTemporaryPassword}
        <div class="form-group">
          <label class="form-label" for="temp-pw">Temporary Password</label>
          <input class="form-input" id="temp-pw" type="text" placeholder="Set a temporary password" bind:value={inviteTempPassword} />
        </div>
      {/if}

      <button class="btn" type="submit" disabled={inviting || !inviteEmail.trim()}>
        {inviting ? 'Sending...' : 'Send Invite'}
      </button>
    </form>

    {#if inviteResult?.inviteUrl && !inviteResult.emailSent}
      <div class="admin__invite-url">
        <label class="form-label">Invite URL (share with user):</label>
        <code class="admin__url-code">{inviteResult.inviteUrl}</code>
      </div>
    {/if}

    <!-- Pending Invites -->
    {#if !loadingInvites && inviteList.length > 0}
      <h3 class="admin__subheading">Invites</h3>
      <div class="admin__table-wrap">
        <table class="admin__table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each inviteList as inv (inv.id)}
              <tr>
                <td>{inv.email}</td>
                <td>
                  <span class="admin__badge admin__badge--{inv.status}">{inv.status}</span>
                </td>
                <td class="admin__meta">{formatDate(inv.createdAt)}</td>
                <td>
                  {#if inv.status === 'pending'}
                    <button class="btn btn--danger btn--sm" onclick={() => revokeInvite(inv.id)}>Revoke</button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <!-- SMTP Section -->
  <section class="admin__section">
    <h2 class="admin__heading">SMTP Settings</h2>
    <p class="admin__meta">Configure email delivery for invites. If not set, you'll need to use temporary passwords.</p>

    <form class="admin__form" onsubmit={(e) => { e.preventDefault(); saveSmtp(); }}>
      <div class="admin__form-row">
        <div class="form-group" style="flex:2">
          <label class="form-label" for="smtp-host">Host</label>
          <input class="form-input" id="smtp-host" type="text" placeholder="smtp.gmail.com" bind:value={smtpHost} />
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label" for="smtp-port">Port</label>
          <input class="form-input" id="smtp-port" type="number" placeholder="587" bind:value={smtpPort} />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="smtp-user">Username</label>
        <input class="form-input" id="smtp-user" type="text" placeholder="user@gmail.com" bind:value={smtpUsername} />
      </div>

      <div class="form-group">
        <label class="form-label" for="smtp-pass">Password</label>
        <input class="form-input" id="smtp-pass" type="password" placeholder="App password or SMTP password" bind:value={smtpPassword} />
      </div>

      <div class="form-group">
        <label class="form-label" for="smtp-from">From Email</label>
        <input class="form-input" id="smtp-from" type="email" placeholder="noreply@yourdomain.com" bind:value={smtpFromEmail} />
      </div>

      <button class="btn" type="submit" disabled={savingSmtp}>
        {savingSmtp ? 'Saving...' : 'Save SMTP Settings'}
      </button>
    </form>

    <div class="admin__smtp-test">
      <h3 class="admin__subheading">Test Configuration</h3>
      <form class="admin__form admin__form--inline" onsubmit={(e) => { e.preventDefault(); testSmtp(); }}>
        <div class="form-group" style="flex:1">
          <input class="form-input" type="email" placeholder="test@example.com" bind:value={smtpTestEmail} />
        </div>
        <button class="btn btn--secondary" type="submit" disabled={testingSmtp || !smtpTestEmail.trim()}>
          {testingSmtp ? 'Sending...' : 'Send Test'}
        </button>
      </form>
    </div>
  </section>
</div>

<style lang="scss">
  .admin {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    max-width: 800px;

    &__back {
      font-size: var(--text-sm);
      color: var(--accent-primary);
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    &__section {
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
    }

    &__heading {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 1rem;
      color: var(--text-primary);
    }

    &__subheading {
      font-size: 0.9375rem;
      font-weight: 500;
      margin: 1.25rem 0 0.75rem;
      color: var(--text-secondary);
    }

    &__meta {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }

    &__message {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
      font-size: 0.875rem;
      max-width: 800px;

      &--success { background: var(--accent-success-muted); color: var(--accent-success); border: 1px solid rgba(34, 197, 94, 0.2); }
      &--error { background: var(--accent-danger-muted); color: var(--accent-danger); border: 1px solid rgba(239, 68, 68, 0.2); }
    }

    &__form {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      &--inline {
        flex-direction: row;
        align-items: flex-end;
      }
    }

    &__form-row {
      display: flex;
      gap: 1rem;
    }

    &__checkbox {
      label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: var(--text-sm);
        color: var(--text-secondary);
        cursor: pointer;
      }
    }

    &__invite-url {
      margin-top: 1rem;
      padding: 1rem;
      background: var(--surface-0);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
    }

    &__url-code {
      display: block;
      margin-top: 0.5rem;
      padding: 0.5rem;
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      color: var(--accent-primary);
      background: var(--surface-2);
      border-radius: var(--radius-sm);
      word-break: break-all;
      user-select: all;
    }

    &__table-wrap {
      overflow-x: auto;
    }

    &__table {
      width: 100%;
      border-collapse: collapse;

      th, td {
        padding: 0.625rem 0.75rem;
        text-align: left;
        font-size: var(--text-sm);
      }

      th {
        color: var(--text-muted);
        font-weight: var(--weight-medium);
        border-bottom: 1px solid var(--border-default);
      }

      td {
        color: var(--text-primary);
        border-bottom: 1px solid var(--border-subtle);
      }

      tr:last-child td { border-bottom: none; }
    }

    &__badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      border-radius: var(--radius-full);

      &--admin { background: var(--accent-primary-muted); color: var(--accent-primary); }
      &--member { background: var(--surface-2); color: var(--text-secondary); }
      &--pending { background: var(--accent-warning-muted); color: var(--accent-warning); }
      &--accepted { background: var(--accent-success-muted); color: var(--accent-success); }
      &--expired { background: var(--accent-danger-muted); color: var(--accent-danger); }
    }

    &__smtp-test {
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-subtle);
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
    color: var(--text-muted);
  }

  .form-input {
    background: var(--surface-0);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: 0.5rem 0.75rem;
    color: var(--text-primary);
    font-size: 0.875rem;

    &::placeholder { color: var(--text-muted); opacity: 0.6; }
    &:focus { outline: none; border-color: var(--accent-primary); box-shadow: 0 0 0 2px var(--accent-primary-muted); }
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    background: var(--accent-primary);
    color: #fff;
    transition: opacity 0.15s;
    text-decoration: none;

    &:hover:not(:disabled) { opacity: 0.9; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }

    &--secondary { background: var(--surface-2); color: var(--text-primary); border-color: var(--border-default); }
    &--danger { background: var(--accent-danger); color: #fff; }
    &--sm { padding: 0.25rem 0.625rem; font-size: 0.8125rem; }
  }
</style>
