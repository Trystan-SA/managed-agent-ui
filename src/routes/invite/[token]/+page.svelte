<script lang="ts">
  import { goto } from '$app/navigation';

  let { data } = $props();

  let password = $state('');
  let temporaryPassword = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      const body: Record<string, string> = { token: data.token };

      if (data.hasTemporaryPassword) {
        body.temporaryPassword = temporaryPassword;
      } else {
        body.password = password;
      }

      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        error = d.error || 'Failed to accept invite';
        return;
      }

      const result = await res.json();
      if (result.mustResetPassword) {
        window.location.href = '/settings/reset-password';
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Accept Invite — Managed Agents</title>
</svelte:head>

<div class="invite">
  <div class="invite__card">
    <div class="invite__header">
      <span class="invite__badge">Invitation</span>
      <h1 class="invite__title">Join Managed Agents</h1>
      <p class="invite__desc">You've been invited as <strong>{data.email}</strong></p>
    </div>

    <form class="invite__form" onsubmit={handleSubmit}>
      {#if data.hasTemporaryPassword}
        <div class="invite__field">
          <label class="invite__label" for="temp-password">Temporary Password</label>
          <input
            id="temp-password"
            class="invite__input"
            type="password"
            placeholder="Enter the temporary password from your admin"
            required
            bind:value={temporaryPassword}
          />
          <span class="invite__hint">You'll be asked to set a new password after logging in.</span>
        </div>
      {:else}
        <div class="invite__field">
          <label class="invite__label" for="new-password">Choose Your Password</label>
          <input
            id="new-password"
            class="invite__input"
            type="password"
            placeholder="Create a strong password"
            required
            minlength="8"
            bind:value={password}
          />
        </div>
      {/if}

      {#if error}
        <div class="invite__error">{error}</div>
      {/if}

      <button class="invite__submit" type="submit" disabled={loading}>
        {#if loading}
          <span class="invite__spinner"></span>
          Joining...
        {:else}
          Accept Invite
        {/if}
      </button>
    </form>
  </div>
</div>

<style lang="scss">
  .invite {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--surface-0);
    padding: 2rem;

    &__card {
      width: 100%;
      max-width: 420px;
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      padding: 2rem;
      box-shadow: var(--shadow-md);
    }

    &__header { margin-bottom: 1.5rem; }

    &__badge {
      display: inline-block;
      padding: 4px 12px;
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: var(--weight-medium);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--accent-primary);
      background: var(--accent-primary-muted);
      border: 1px solid rgba(79, 70, 229, 0.15);
      border-radius: 6px;
      margin-bottom: 16px;
    }

    &__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    &__desc {
      color: var(--text-muted);
      font-size: 0.9375rem;
    }

    &__form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    &__field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    &__label {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-secondary);
    }

    &__input {
      width: 100%;
      padding: 12px 16px;
      font-family: var(--font-sans);
      font-size: 0.9375rem;
      color: var(--text-primary);
      background: var(--surface-0);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      outline: none;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

      &::placeholder { color: var(--text-muted); opacity: 0.6; }
      &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px var(--accent-primary-muted); }
    }

    &__hint {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    &__error {
      padding: 10px 14px;
      font-size: var(--text-sm);
      color: var(--accent-danger);
      background: var(--accent-danger-muted);
      border: 1px solid rgba(239, 68, 68, 0.15);
      border-radius: var(--radius-md);
    }

    &__submit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 13px 24px;
      margin-top: 4px;
      font-family: var(--font-sans);
      font-size: 0.9375rem;
      font-weight: var(--weight-semibold);
      color: white;
      background: var(--accent-primary);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover:not(:disabled) { background: var(--accent-primary-hover); transform: translateY(-1px); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    &__spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
