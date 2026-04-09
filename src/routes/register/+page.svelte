<script lang="ts">
  let email = $state('');
  let password = $state('');
  let apiKey = $state('');
  let showApiKey = $state(false);
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, apiKey })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.error || `Registration failed (${res.status})`;
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
  <title>Create Account — Managed Agents</title>
</svelte:head>

<div class="auth-page">
  <div class="auth-card">
    <h1 class="auth-title">Create Account</h1>

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
          placeholder="Choose a password"
          autocomplete="new-password"
          required
          bind:value={password}
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="api-key">API Key</label>
        <div class="api-key-wrapper">
          <input
            id="api-key"
            class="form-input api-key-input"
            type={showApiKey ? 'text' : 'password'}
            placeholder="sk-ant-..."
            autocomplete="off"
            required
            bind:value={apiKey}
          />
          <button
            type="button"
            class="api-key-toggle"
            onclick={() => (showApiKey = !showApiKey)}
            aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
          >
            {#if showApiKey}
              <!-- eye-off icon -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            {:else}
              <!-- eye icon -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            {/if}
          </button>
        </div>
        <span class="form-hint">Your Anthropic API key. Get one at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></span>
      </div>

      {#if error}
        <div class="form-error auth-error">{error}</div>
      {/if}

      <button class="btn auth-submit" type="submit" disabled={loading}>
        {#if loading}
          Creating account...
        {:else}
          Create Account
        {/if}
      </button>
    </form>

    <p class="auth-footer">
      Already have an account? <a href="/login">Sign In</a>
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

  .api-key-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .api-key-input {
    padding-right: var(--space-11) !important;
  }

  .api-key-toggle {
    position: absolute;
    right: var(--space-4);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast);

    &:hover {
      color: var(--text-secondary);
    }
  }

  .form-hint {
    a {
      color: var(--accent-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
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
