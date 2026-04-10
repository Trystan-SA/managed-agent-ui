<script lang="ts">
  let newPassword = $state('');
  let confirmPassword = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';

    if (newPassword !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    if (newPassword.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }

    loading = true;
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        error = d.error || 'Failed to reset password';
        return;
      }

      window.location.href = '/dashboard';
    } catch {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Reset Password — Managed Agents</title>
</svelte:head>

<div class="reset">
  <div class="reset__card">
    <div class="reset__header">
      <h1 class="reset__title">Set New Password</h1>
      <p class="reset__desc">You must choose a new password before continuing.</p>
    </div>

    <form class="reset__form" onsubmit={handleSubmit}>
      <div class="reset__field">
        <label class="reset__label" for="new-pw">New Password</label>
        <input
          id="new-pw"
          class="reset__input"
          type="password"
          placeholder="At least 8 characters"
          required
          minlength="8"
          bind:value={newPassword}
        />
      </div>

      <div class="reset__field">
        <label class="reset__label" for="confirm-pw">Confirm Password</label>
        <input
          id="confirm-pw"
          class="reset__input"
          type="password"
          placeholder="Re-enter password"
          required
          bind:value={confirmPassword}
        />
      </div>

      {#if error}
        <div class="reset__error">{error}</div>
      {/if}

      <button class="reset__submit" type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Update Password'}
      </button>
    </form>
  </div>
</div>

<style lang="scss">
  .reset {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
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

    &__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    &__desc { color: var(--text-muted); font-size: 0.9375rem; }

    &__form { display: flex; flex-direction: column; gap: 1rem; }

    &__field { display: flex; flex-direction: column; gap: 8px; }

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

    &__error {
      padding: 10px 14px;
      font-size: var(--text-sm);
      color: var(--accent-danger);
      background: var(--accent-danger-muted);
      border: 1px solid rgba(239, 68, 68, 0.15);
      border-radius: var(--radius-md);
    }

    &__submit {
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

      &:hover:not(:disabled) { background: var(--accent-primary-hover); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
  }
</style>
