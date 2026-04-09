<script lang="ts">
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.error || `Login failed (${res.status})`;
        return;
      }

      window.location.href = '/dashboard';
    } catch (err) {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Sign In — Managed Agents</title>
</svelte:head>

<div class="auth-page">
  <div class="auth-card">
    <h1 class="auth-title">Sign In</h1>

    <form onsubmit={handleSubmit}>
      <div class="form-group">
        <label class="form-label" for="email">Email</label>
        <input
          id="email"
          class="form-input"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          required
          bind:value={email}
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="password">Password</label>
        <input
          id="password"
          class="form-input"
          type="password"
          placeholder="Enter your password"
          autocomplete="current-password"
          required
          bind:value={password}
        />
      </div>

      {#if error}
        <div class="form-error auth-error">{error}</div>
      {/if}

      <button class="btn auth-submit" type="submit" disabled={loading}>
        {#if loading}
          Signing in...
        {:else}
          Sign In
        {/if}
      </button>
    </form>

    <p class="auth-footer">
      Don't have an account? <a href="/register">Register</a>
    </p>
  </div>
</div>

<style lang="scss">
  @use '../../styles/mixins' as *;

  .auth-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 56px);
    padding: var(--space-6);
  }

  .auth-card {
    @include card(var(--space-9));
    width: 100%;
    max-width: 420px;
  }

  .auth-title {
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
    color: var(--text-primary);
    text-align: center;
    margin-bottom: var(--space-9);
  }

  .auth-error {
    margin-top: var(--space-6);
    padding: var(--space-4) var(--space-5);
    background: var(--accent-danger-muted);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  .auth-submit {
    width: 100%;
    margin-top: var(--space-8);
    padding: var(--space-5) var(--space-6);
    font-size: var(--text-base);
  }

  .auth-footer {
    text-align: center;
    margin-top: var(--space-8);
    font-size: var(--text-sm);
    color: var(--text-secondary);

    a {
      color: var(--accent-primary);
      font-weight: var(--weight-medium);
      text-decoration: none;

      &:hover {
        color: var(--accent-primary-hover);
        text-decoration: underline;
      }
    }
  }
</style>
