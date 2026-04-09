<script lang="ts">
  import { onMount } from 'svelte';

  let email = $state('');
  let password = $state('');
  let apiKey = $state('');
  let showApiKey = $state(false);
  let error = $state('');
  let loading = $state(false);
  let mounted = $state(false);
  let activeField = $state<'email' | 'password' | 'apikey' | null>(null);

  onMount(() => {
    requestAnimationFrame(() => (mounted = true));
  });

  let currentStep = $derived(
    !email ? 1 : !password ? 2 : 3
  );

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
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
</svelte:head>

<div class="reg" class:reg--visible={mounted}>
  <!-- Background grid -->
  <div class="reg__grid" aria-hidden="true">
    <div class="reg__grid-fade"></div>
  </div>

  <!-- Left brand panel — setup steps -->
  <div class="reg__brand">
    <div class="reg__brand-content">
      <div class="reg__logo">
        <div class="reg__logo-mark" aria-hidden="true">
          <div class="reg__logo-hex"></div>
          <div class="reg__logo-hex reg__logo-hex--2"></div>
          <div class="reg__logo-hex reg__logo-hex--3"></div>
        </div>
        <span class="reg__logo-text">Managed Agents</span>
      </div>

      <div class="reg__steps">
        <div class="reg__step" class:reg__step--active={currentStep >= 1} class:reg__step--current={activeField === 'email'}>
          <div class="reg__step-num">
            {#if email}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            {:else}
              1
            {/if}
          </div>
          <div class="reg__step-info">
            <span class="reg__step-title">Identity</span>
            <span class="reg__step-desc">Your email address</span>
          </div>
        </div>

        <div class="reg__step-line" class:reg__step-line--done={!!email}></div>

        <div class="reg__step" class:reg__step--active={currentStep >= 2} class:reg__step--current={activeField === 'password'}>
          <div class="reg__step-num">
            {#if password}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            {:else}
              2
            {/if}
          </div>
          <div class="reg__step-info">
            <span class="reg__step-title">Security</span>
            <span class="reg__step-desc">Choose a password</span>
          </div>
        </div>

        <div class="reg__step-line" class:reg__step-line--done={!!password}></div>

        <div class="reg__step" class:reg__step--active={currentStep >= 3} class:reg__step--current={activeField === 'apikey'}>
          <div class="reg__step-num">
            {#if apiKey}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            {:else}
              3
            {/if}
          </div>
          <div class="reg__step-info">
            <span class="reg__step-title">Connection</span>
            <span class="reg__step-desc">Anthropic API key</span>
          </div>
        </div>
      </div>

      <div class="reg__info-card">
        <div class="reg__info-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <p class="reg__info-text">
          Your API key is encrypted with AES-256-GCM and never leaves the server. All requests are proxied securely.
        </p>
      </div>
    </div>
  </div>

  <!-- Right form panel -->
  <div class="reg__form-panel">
    <div class="reg__form-wrapper">
      <div class="reg__form-header">
        <span class="reg__form-badge">New Account</span>
        <h1 class="reg__form-title">Get started</h1>
        <p class="reg__form-desc">Set up your control panel in seconds</p>
      </div>

      <form class="reg__form" onsubmit={handleSubmit}>
        <!-- Email -->
        <div class="reg__field">
          <label class="reg__label" for="reg-email">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            Email
          </label>
          <input
            id="reg-email"
            class="reg__input"
            type="email"
            placeholder="operator@company.com"
            autocomplete="email"
            required
            bind:value={email}
            onfocus={() => (activeField = 'email')}
            onblur={() => (activeField = null)}
          />
        </div>

        <!-- Password -->
        <div class="reg__field">
          <label class="reg__label" for="reg-password">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Password
          </label>
          <input
            id="reg-password"
            class="reg__input"
            type="password"
            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            autocomplete="new-password"
            required
            bind:value={password}
            onfocus={() => (activeField = 'password')}
            onblur={() => (activeField = null)}
          />
        </div>

        <!-- API Key -->
        <div class="reg__field">
          <label class="reg__label" for="reg-apikey">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            API Key
          </label>
          <div class="reg__input-group">
            <input
              id="reg-apikey"
              class="reg__input reg__input--key"
              type={showApiKey ? 'text' : 'password'}
              placeholder="sk-ant-api03-..."
              autocomplete="off"
              spellcheck="false"
              required
              bind:value={apiKey}
              onfocus={() => (activeField = 'apikey')}
              onblur={() => (activeField = null)}
            />
            <button
              type="button"
              class="reg__toggle"
              onclick={() => (showApiKey = !showApiKey)}
              aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              {#if showApiKey}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              {/if}
            </button>
          </div>
          <span class="reg__hint">
            Get yours at
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">
              console.anthropic.com
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </a>
          </span>
        </div>

        {#if error}
          <div class="reg__error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        {/if}

        <button class="reg__submit" type="submit" disabled={loading}>
          {#if loading}
            <span class="reg__spinner"></span>
            Creating account...
          {:else}
            Create Account
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          {/if}
        </button>
      </form>

      <div class="reg__footer">
        <span>Already have an account?</span>
        <a href="/login" class="reg__footer-link">
          Sign in
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </a>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  /* ============================================
     REGISTER — Onboarding Setup Flow
     Split panel with step tracker + form
     ============================================ */

  .reg {
    --r-bg: #06060b;
    --r-surface: #0d0d15;
    --r-surface-2: #13131f;
    --r-border: #1a1a2e;
    --r-border-hover: #2a2a44;
    --r-text: #e8e8f0;
    --r-text-dim: #8888a4;
    --r-text-muted: #5a5a74;
    --r-accent: #6366f1;
    --r-accent-glow: rgba(99, 102, 241, 0.25);
    --r-accent-soft: rgba(99, 102, 241, 0.08);
    --r-success: #22c55e;
    --r-success-soft: rgba(34, 197, 94, 0.12);
    --r-danger: #ef4444;
    --r-font: 'Geist', -apple-system, sans-serif;
    --r-mono: 'Geist Mono', 'SF Mono', monospace;

    display: flex;
    min-height: 100vh;
    background: var(--r-bg);
    font-family: var(--r-font);
    color: var(--r-text);
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.6s ease;

    &--visible {
      opacity: 1;
    }
  }

  /* --- Background grid --- */

  .reg__grid {
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
    background-size: 64px 64px;
    animation: gridDrift 20s linear infinite;
  }

  .reg__grid-fade {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 80% 60% at 30% 50%, transparent 0%, var(--r-bg) 70%);
  }

  @keyframes gridDrift {
    from { transform: translate(0, 0); }
    to { transform: translate(64px, 64px); }
  }

  /* --- Left brand panel --- */

  .reg__brand {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: 64px;
    overflow: hidden;

    &::after {
      content: '';
      position: absolute;
      right: 0;
      top: 10%;
      bottom: 10%;
      width: 1px;
      background: linear-gradient(
        to bottom,
        transparent,
        var(--r-border) 30%,
        var(--r-accent-glow) 50%,
        var(--r-border) 70%,
        transparent
      );
    }
  }

  .reg__brand-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 48px;
    max-width: 320px;
    opacity: 0;
    animation: brandIn 0.8s ease 0.2s forwards;
  }

  @keyframes brandIn {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* --- Logo --- */

  .reg__logo {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .reg__logo-mark {
    position: relative;
    width: 36px;
    height: 36px;
  }

  .reg__logo-hex {
    position: absolute;
    inset: 0;
    border: 1.5px solid var(--r-accent);
    border-radius: 8px;
    transform: rotate(0deg);
    opacity: 0.7;

    &--2 {
      border-color: rgba(99, 102, 241, 0.35);
      transform: rotate(20deg);
      animation: hexSpin 12s linear infinite;
    }

    &--3 {
      border-color: rgba(99, 102, 241, 0.15);
      transform: rotate(40deg);
      animation: hexSpin 12s linear infinite reverse;
    }
  }

  @keyframes hexSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .reg__logo-text {
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--r-text);
  }

  /* --- Step tracker --- */

  .reg__steps {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
  }

  .reg__step {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 16px;
    border-radius: 12px;
    transition: all 0.3s ease;
    opacity: 0.4;

    &--active {
      opacity: 1;
    }

    &--current {
      background: var(--r-accent-soft);
      box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.12);
    }
  }

  .reg__step-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    font-family: var(--r-mono);
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--r-accent);
    background: var(--r-surface-2);
    border: 1px solid var(--r-border);
    border-radius: 8px;
    flex-shrink: 0;
    transition: all 0.3s ease;

    .reg__step--active & {
      border-color: var(--r-accent);
      background: rgba(99, 102, 241, 0.12);
    }

    // checkmark state
    svg {
      color: var(--r-success);
    }

    .reg__step--active:has(svg) & {
      border-color: var(--r-success);
      background: var(--r-success-soft);
    }
  }

  .reg__step-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .reg__step-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--r-text);
  }

  .reg__step-desc {
    font-size: 0.75rem;
    color: var(--r-text-muted);
  }

  .reg__step-line {
    width: 1px;
    height: 16px;
    margin-left: 31px;
    background: var(--r-border);
    transition: background 0.4s ease;

    &--done {
      background: var(--r-success);
      box-shadow: 0 0 6px var(--r-success-soft);
    }
  }

  /* --- Security info card --- */

  .reg__info-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: var(--r-surface);
    border: 1px solid var(--r-border);
    border-radius: 12px;
    width: 100%;
  }

  .reg__info-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--r-accent-soft);
    border: 1px solid rgba(99, 102, 241, 0.1);
    border-radius: 8px;
    color: var(--r-accent);
    flex-shrink: 0;
  }

  .reg__info-text {
    font-size: 0.75rem;
    line-height: 1.6;
    color: var(--r-text-muted);
  }

  /* --- Right form panel --- */

  .reg__form-panel {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: 64px;
    max-width: 560px;
  }

  .reg__form-wrapper {
    width: 100%;
    max-width: 400px;
    opacity: 0;
    animation: formIn 0.6s ease 0.4s forwards;
  }

  @keyframes formIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .reg__form-header {
    margin-bottom: 32px;
  }

  .reg__form-badge {
    display: inline-block;
    padding: 4px 12px;
    font-family: var(--r-mono);
    font-size: 0.6875rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--r-success);
    background: var(--r-success-soft);
    border: 1px solid rgba(34, 197, 94, 0.15);
    border-radius: 6px;
    margin-bottom: 20px;
  }

  .reg__form-title {
    font-size: 1.75rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--r-text);
    margin-bottom: 8px;
  }

  .reg__form-desc {
    font-size: 0.9375rem;
    color: var(--r-text-muted);
  }

  /* --- Form --- */

  .reg__form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .reg__field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .reg__label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--r-text-dim);
    letter-spacing: 0.01em;

    svg { opacity: 0.5; }
  }

  .reg__input {
    width: 100%;
    padding: 12px 16px;
    font-family: var(--r-font);
    font-size: 0.9375rem;
    color: var(--r-text);
    background: var(--r-surface);
    border: 1px solid var(--r-border);
    border-radius: 10px;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

    &::placeholder {
      color: var(--r-text-muted);
      opacity: 0.6;
    }

    &:hover {
      border-color: var(--r-border-hover);
      background: var(--r-surface-2);
    }

    &:focus {
      border-color: var(--r-accent);
      box-shadow: 0 0 0 3px var(--r-accent-glow), 0 0 20px rgba(99, 102, 241, 0.08);
      background: var(--r-surface-2);
    }

    &--key {
      font-family: var(--r-mono);
      font-size: 0.8125rem;
      letter-spacing: 0.01em;
      padding-right: 48px;
    }
  }

  .reg__input-group {
    position: relative;
  }

  .reg__toggle {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    color: var(--r-text-muted);
    transition: color 0.15s ease, background 0.15s ease;

    &:hover {
      color: var(--r-text-dim);
      background: rgba(255, 255, 255, 0.04);
    }
  }

  .reg__hint {
    font-size: 0.75rem;
    color: var(--r-text-muted);

    a {
      color: var(--r-accent);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      transition: color 0.15s ease, gap 0.15s ease;

      &:hover {
        color: #818cf8;
        gap: 4px;
      }
    }
  }

  /* --- Error --- */

  .reg__error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    font-size: 0.8125rem;
    color: var(--r-danger);
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.15);
    border-radius: 10px;
    animation: errorShake 0.4s ease;

    svg { flex-shrink: 0; }
  }

  @keyframes errorShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }

  /* --- Submit --- */

  .reg__submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 13px 24px;
    margin-top: 4px;
    font-family: var(--r-font);
    font-size: 0.9375rem;
    font-weight: 600;
    color: white;
    background: var(--r-accent);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(255,255,255,0.1), transparent);
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 20px var(--r-accent-glow), 0 0 40px rgba(99, 102, 241, 0.15);

      &::before { opacity: 1; }
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 10px var(--r-accent-glow);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .reg__spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* --- Footer --- */

  .reg__footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 28px;
    padding-top: 24px;
    border-top: 1px solid var(--r-border);
    font-size: 0.8125rem;
    color: var(--r-text-muted);
  }

  .reg__footer-link {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--r-accent);
    font-weight: 500;
    text-decoration: none;
    transition: gap 0.2s ease, color 0.2s ease;

    &:hover {
      color: #818cf8;
      gap: 5px;
    }
  }

  /* --- Responsive --- */

  @media (max-width: 900px) {
    .reg {
      flex-direction: column;
    }

    .reg__brand {
      flex: none;
      padding: 40px 32px 24px;

      &::after {
        top: auto;
        right: 10%;
        left: 10%;
        bottom: 0;
        width: auto;
        height: 1px;
        background: linear-gradient(
          to right,
          transparent,
          var(--r-border) 30%,
          var(--r-accent-glow) 50%,
          var(--r-border) 70%,
          transparent
        );
      }
    }

    .reg__brand-content {
      max-width: none;
      align-items: center;
      gap: 28px;
    }

    .reg__steps {
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 0;
    }

    .reg__step {
      flex-direction: column;
      text-align: center;
      padding: 10px 12px;
    }

    .reg__step-line {
      width: 32px;
      height: 1px;
      margin-left: 0;
    }

    .reg__info-card {
      display: none;
    }

    .reg__form-panel {
      max-width: none;
      padding: 32px;
    }
  }

  @media (max-width: 480px) {
    .reg__brand {
      padding: 28px 20px 20px;
    }

    .reg__step-desc {
      display: none;
    }

    .reg__form-panel {
      padding: 24px 20px 40px;
    }

    .reg__form-title {
      font-size: 1.5rem;
    }
  }
</style>
