<script lang="ts">
  import { onMount } from 'svelte';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);
  let mounted = $state(false);

  onMount(() => {
    requestAnimationFrame(() => (mounted = true));
  });

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
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
</svelte:head>

<div class="login" class:login--visible={mounted}>
  <!-- Animated background grid -->
  <div class="login__grid" aria-hidden="true">
    <div class="login__grid-fade"></div>
  </div>

  <!-- Left brand panel -->
  <div class="login__brand">
    <div class="login__brand-content">
      <div class="login__orb" aria-hidden="true">
        <div class="login__orb-ring login__orb-ring--1"></div>
        <div class="login__orb-ring login__orb-ring--2"></div>
        <div class="login__orb-ring login__orb-ring--3"></div>
        <div class="login__orb-core"></div>
      </div>
      <h2 class="login__brand-title">Managed<br />Agents</h2>
      <p class="login__brand-sub">Orchestrate autonomous Claude agents.<br />Monitor. Control. Deploy.</p>
      <div class="login__brand-stats" aria-hidden="true">
        <div class="login__stat">
          <span class="login__stat-value">SSE</span>
          <span class="login__stat-label">Streaming</span>
        </div>
        <div class="login__stat-divider"></div>
        <div class="login__stat">
          <span class="login__stat-value">E2E</span>
          <span class="login__stat-label">Encrypted</span>
        </div>
        <div class="login__stat-divider"></div>
        <div class="login__stat">
          <span class="login__stat-value">API</span>
          <span class="login__stat-label">Proxied</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Right form panel -->
  <div class="login__form-panel">
    <div class="login__form-wrapper">
      <div class="login__form-header">
        <span class="login__form-badge">Authentication</span>
        <h1 class="login__form-title">Welcome back</h1>
        <p class="login__form-desc">Sign in to your control panel</p>
      </div>

      <form class="login__form" onsubmit={handleSubmit}>
        <div class="login__field">
          <label class="login__label" for="email">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            Email
          </label>
          <input
            id="email"
            class="login__input"
            type="email"
            placeholder="operator@company.com"
            autocomplete="email"
            required
            bind:value={email}
          />
        </div>

        <div class="login__field">
          <label class="login__label" for="password">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Password
          </label>
          <input
            id="password"
            class="login__input"
            type="password"
            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            autocomplete="current-password"
            required
            bind:value={password}
          />
        </div>

        {#if error}
          <div class="login__error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        {/if}

        <button class="login__submit" type="submit" disabled={loading}>
          {#if loading}
            <span class="login__spinner"></span>
            Authenticating...
          {:else}
            Sign In
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          {/if}
        </button>
      </form>

      <div class="login__footer">
        <span>No account yet?</span>
        <a href="/register" class="login__footer-link">
          Create one
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
     LOGIN — Atmospheric Command Center
     Split layout with animated brand panel
     ============================================ */

  .login {
    --login-bg: #06060b;
    --login-surface: #0d0d15;
    --login-surface-2: #13131f;
    --login-border: #1a1a2e;
    --login-border-hover: #2a2a44;
    --login-text: #e8e8f0;
    --login-text-dim: #8888a4;
    --login-text-muted: #5a5a74;
    --login-accent: #6366f1;
    --login-accent-glow: rgba(99, 102, 241, 0.25);
    --login-accent-soft: rgba(99, 102, 241, 0.08);
    --login-danger: #ef4444;
    --login-font: 'Geist', -apple-system, sans-serif;
    --login-mono: 'Geist Mono', 'SF Mono', monospace;

    display: flex;
    min-height: 100vh;
    background: var(--login-bg);
    font-family: var(--login-font);
    color: var(--login-text);
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.6s ease;

    &--visible {
      opacity: 1;
    }
  }

  /* --- Animated background grid --- */

  .login__grid {
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
    background-size: 64px 64px;
    animation: gridDrift 20s linear infinite;
  }

  .login__grid-fade {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 80% 60% at 30% 50%, transparent 0%, var(--login-bg) 70%);
  }

  @keyframes gridDrift {
    from { transform: translate(0, 0); }
    to { transform: translate(64px, 64px); }
  }

  /* --- Left brand panel --- */

  .login__brand {
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
        var(--login-border) 30%,
        var(--login-accent-glow) 50%,
        var(--login-border) 70%,
        transparent
      );
    }
  }

  .login__brand-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 40px;
    opacity: 0;
    animation: brandReveal 0.8s ease 0.3s forwards;
  }

  @keyframes brandReveal {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* --- Orb animation --- */

  .login__orb {
    position: relative;
    width: 140px;
    height: 140px;
  }

  .login__orb-core {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 12px;
    height: 12px;
    background: var(--login-accent);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 30px var(--login-accent-glow), 0 0 60px var(--login-accent-glow);
  }

  .login__orb-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    border: 1px solid;
    border-radius: 50%;
    transform: translate(-50%, -50%);

    &--1 {
      width: 60px;
      height: 60px;
      border-color: rgba(99, 102, 241, 0.3);
      animation: orbPulse 4s ease-in-out infinite;
    }

    &--2 {
      width: 100px;
      height: 100px;
      border-color: rgba(99, 102, 241, 0.15);
      animation: orbPulse 4s ease-in-out 1s infinite;
    }

    &--3 {
      width: 140px;
      height: 140px;
      border-color: rgba(99, 102, 241, 0.07);
      animation: orbPulse 4s ease-in-out 2s infinite;
    }
  }

  @keyframes orbPulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.6; }
  }

  .login__brand-title {
    font-size: 3rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.1;
    text-align: center;
    background: linear-gradient(to bottom, var(--login-text) 0%, var(--login-text-dim) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .login__brand-sub {
    font-size: 0.9375rem;
    color: var(--login-text-muted);
    text-align: center;
    line-height: 1.6;
    letter-spacing: 0.01em;
  }

  .login__brand-stats {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 16px 28px;
    background: var(--login-accent-soft);
    border: 1px solid rgba(99, 102, 241, 0.1);
    border-radius: 12px;
  }

  .login__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .login__stat-value {
    font-family: var(--login-mono);
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--login-accent);
    letter-spacing: 0.05em;
  }

  .login__stat-label {
    font-size: 0.6875rem;
    color: var(--login-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .login__stat-divider {
    width: 1px;
    height: 28px;
    background: var(--login-border);
  }

  /* --- Right form panel --- */

  .login__form-panel {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: 64px;
    max-width: 560px;
  }

  .login__form-wrapper {
    width: 100%;
    max-width: 380px;
    opacity: 0;
    animation: formReveal 0.6s ease 0.5s forwards;
  }

  @keyframes formReveal {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .login__form-header {
    margin-bottom: 36px;
  }

  .login__form-badge {
    display: inline-block;
    padding: 4px 12px;
    font-family: var(--login-mono);
    font-size: 0.6875rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--login-accent);
    background: var(--login-accent-soft);
    border: 1px solid rgba(99, 102, 241, 0.12);
    border-radius: 6px;
    margin-bottom: 20px;
  }

  .login__form-title {
    font-size: 1.75rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--login-text);
    margin-bottom: 8px;
  }

  .login__form-desc {
    font-size: 0.9375rem;
    color: var(--login-text-muted);
  }

  /* --- Form fields --- */

  .login__form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .login__field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .login__label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--login-text-dim);
    letter-spacing: 0.01em;

    svg {
      opacity: 0.5;
    }
  }

  .login__input {
    width: 100%;
    padding: 12px 16px;
    font-family: var(--login-font);
    font-size: 0.9375rem;
    color: var(--login-text);
    background: var(--login-surface);
    border: 1px solid var(--login-border);
    border-radius: 10px;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

    &::placeholder {
      color: var(--login-text-muted);
      opacity: 0.6;
    }

    &:hover {
      border-color: var(--login-border-hover);
      background: var(--login-surface-2);
    }

    &:focus {
      border-color: var(--login-accent);
      box-shadow: 0 0 0 3px var(--login-accent-glow), 0 0 20px rgba(99, 102, 241, 0.08);
      background: var(--login-surface-2);
    }
  }

  /* --- Error --- */

  .login__error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    font-size: 0.8125rem;
    color: var(--login-danger);
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.15);
    border-radius: 10px;
    animation: errorShake 0.4s ease;

    svg {
      flex-shrink: 0;
    }
  }

  @keyframes errorShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }

  /* --- Submit button --- */

  .login__submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 13px 24px;
    margin-top: 4px;
    font-family: var(--login-font);
    font-size: 0.9375rem;
    font-weight: 600;
    color: white;
    background: var(--login-accent);
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
      box-shadow: 0 4px 20px var(--login-accent-glow), 0 0 40px rgba(99, 102, 241, 0.15);

      &::before {
        opacity: 1;
      }
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 10px var(--login-accent-glow);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .login__spinner {
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

  .login__footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--login-border);
    font-size: 0.8125rem;
    color: var(--login-text-muted);
  }

  .login__footer-link {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--login-accent);
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
    .login {
      flex-direction: column;
    }

    .login__brand {
      flex: none;
      padding: 48px 32px 32px;

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
          var(--login-border) 30%,
          var(--login-accent-glow) 50%,
          var(--login-border) 70%,
          transparent
        );
      }
    }

    .login__brand-title {
      font-size: 2rem;
    }

    .login__orb {
      width: 80px;
      height: 80px;
    }

    .login__orb-ring--1 { width: 36px; height: 36px; }
    .login__orb-ring--2 { width: 56px; height: 56px; }
    .login__orb-ring--3 { width: 80px; height: 80px; }

    .login__form-panel {
      max-width: none;
      padding: 32px;
    }
  }

  @media (max-width: 480px) {
    .login__brand {
      padding: 32px 20px 24px;
    }

    .login__brand-stats {
      display: none;
    }

    .login__form-panel {
      padding: 24px 20px 40px;
    }

    .login__form-title {
      font-size: 1.5rem;
    }
  }
</style>
