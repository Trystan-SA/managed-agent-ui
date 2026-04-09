<script lang="ts">
  import { onMount } from 'svelte';

  let setupPassword = $state('');
  let setupVerified = $state(false);
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);
  let mounted = $state(false);
  let activeField = $state<'setup' | 'email' | 'password' | null>(null);

  onMount(() => {
    requestAnimationFrame(() => (mounted = true));
  });

  let currentStep = $derived(
    !setupVerified ? 1 : !email ? 2 : 3
  );

  async function handleVerifySetup(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      const res = await fetch('/api/auth/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupPassword })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.error || `Verification failed (${res.status})`;
        return;
      }

      setupVerified = true;
      error = '';
    } catch (err) {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, setupPassword })
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
  <title>Initial Setup — Managed Agents</title>
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
        <div class="reg__step" class:reg__step--active={currentStep >= 1} class:reg__step--current={activeField === 'setup'}>
          <div class="reg__step-num">
            {#if setupVerified}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            {:else}
              1
            {/if}
          </div>
          <div class="reg__step-info">
            <span class="reg__step-title">Authorization</span>
            <span class="reg__step-desc">Setup password</span>
          </div>
        </div>

        <div class="reg__step-line" class:reg__step-line--done={setupVerified}></div>

        <div class="reg__step" class:reg__step--active={currentStep >= 2} class:reg__step--current={activeField === 'email'}>
          <div class="reg__step-num">
            {#if email}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            {:else}
              2
            {/if}
          </div>
          <div class="reg__step-info">
            <span class="reg__step-title">Identity</span>
            <span class="reg__step-desc">Your email address</span>
          </div>
        </div>

        <div class="reg__step-line" class:reg__step-line--done={!!email}></div>

        <div class="reg__step" class:reg__step--active={currentStep >= 3} class:reg__step--current={activeField === 'password'}>
          <div class="reg__step-num">
            {#if password}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            {:else}
              3
            {/if}
          </div>
          <div class="reg__step-info">
            <span class="reg__step-title">Security</span>
            <span class="reg__step-desc">Choose a password</span>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Right form panel -->
  <div class="reg__form-panel">
    <div class="reg__form-wrapper">
      <div class="reg__form-header">
        <span class="reg__form-badge">Initial Setup</span>
        <h1 class="reg__form-title">Create admin account</h1>
        <p class="reg__form-desc">Set up your control panel in seconds</p>
      </div>

      {#if !setupVerified}
        <!-- Step 1: Setup password gate -->
        <form class="reg__form" onsubmit={handleVerifySetup}>
          <div class="reg__field">
            <label class="reg__label" for="reg-setup">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Setup Password
            </label>
            <input
              id="reg-setup"
              class="reg__input"
              type="password"
              placeholder="From your SETUP_PASSWORD env var"
              autocomplete="off"
              required
              bind:value={setupPassword}
              onfocus={() => (activeField = 'setup')}
              onblur={() => (activeField = null)}
            />
            <span class="reg__hint">
              The password set in the SETUP_PASSWORD environment variable
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
              Verifying...
            {:else}
              Verify
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            {/if}
          </button>
        </form>
      {:else}
        <!-- Step 2: Account creation (only after setup password verified) -->
        <form class="reg__form" onsubmit={handleSubmit}>
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
      {/if}

      <div class="reg__footer">
        <span>One-time setup — this page won't be accessible after account creation</span>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  /* ============================================
     REGISTER — Onboarding Setup Flow
     Split panel with step tracker + form
     Uses design system tokens from _tokens.scss
     ============================================ */

  .reg {
    display: flex;
    min-height: 100vh;
    background: var(--surface-0);
    font-family: var(--font-sans);
    color: var(--text-primary);
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
      linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px);
    background-size: 64px 64px;
    animation: gridDrift 20s linear infinite;
  }

  .reg__grid-fade {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 80% 60% at 30% 50%, transparent 0%, var(--surface-0) 70%);
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
        var(--border-default) 30%,
        var(--accent-primary-muted) 50%,
        var(--border-default) 70%,
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
    border: 1.5px solid var(--accent-primary);
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
    color: var(--text-primary);
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
    border-radius: var(--radius-lg);
    transition: all 0.3s ease;
    opacity: 0.4;

    &--active {
      opacity: 1;
    }

    &--current {
      background: var(--accent-primary-muted);
      box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.12);
    }
  }

  .reg__step-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--accent-primary);
    background: var(--surface-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    flex-shrink: 0;
    transition: all 0.3s ease;

    .reg__step--active & {
      border-color: var(--accent-primary);
      background: var(--accent-primary-muted);
    }

    svg {
      color: var(--accent-success);
    }

    .reg__step--active:has(svg) & {
      border-color: var(--accent-success);
      background: var(--accent-success-muted);
    }
  }

  .reg__step-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .reg__step-title {
    font-size: var(--text-base);
    font-weight: var(--weight-medium);
    color: var(--text-primary);
  }

  .reg__step-desc {
    font-size: var(--text-xs);
    color: var(--text-muted);
  }

  .reg__step-line {
    width: 1px;
    height: 16px;
    margin-left: 31px;
    background: var(--border-default);
    transition: background 0.4s ease;

    &--done {
      background: var(--accent-success);
    }
  }

  /* --- Security info card --- */

  .reg__info-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    width: 100%;
  }

  .reg__info-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--accent-primary-muted);
    border: 1px solid rgba(99, 102, 241, 0.1);
    border-radius: var(--radius-md);
    color: var(--accent-primary);
    flex-shrink: 0;
  }

  .reg__info-text {
    font-size: var(--text-xs);
    line-height: var(--leading-relaxed);
    color: var(--text-muted);
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
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: var(--weight-medium);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent-success);
    background: var(--accent-success-muted);
    border: 1px solid rgba(34, 197, 94, 0.15);
    border-radius: 6px;
    margin-bottom: 20px;
  }

  .reg__form-title {
    font-size: var(--text-2xl);
    font-weight: var(--weight-semibold);
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .reg__form-desc {
    font-size: 0.9375rem;
    color: var(--text-muted);
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
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--text-secondary);
    letter-spacing: 0.01em;

    svg { opacity: 0.5; }
  }

  .reg__input {
    width: 100%;
    padding: 12px 16px;
    font-family: var(--font-sans);
    font-size: 0.9375rem;
    color: var(--text-primary);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    outline: none;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);

    &::placeholder {
      color: var(--text-muted);
      opacity: 0.6;
    }

    &:hover {
      border-color: var(--border-strong);
      background: var(--surface-2);
    }

    &:focus {
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 3px var(--accent-primary-muted);
      background: var(--surface-1);
    }

    &--key {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
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
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--text-muted);
    transition: color var(--transition-fast), background var(--transition-fast);

    &:hover {
      color: var(--text-secondary);
      background: var(--surface-2);
    }
  }

  .reg__hint {
    font-size: var(--text-xs);
    color: var(--text-muted);

    a {
      color: var(--accent-primary);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      transition: color var(--transition-fast), gap var(--transition-fast);

      &:hover {
        color: var(--accent-primary-hover);
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
    font-size: var(--text-sm);
    color: var(--accent-danger);
    background: var(--accent-danger-muted);
    border: 1px solid rgba(239, 68, 68, 0.15);
    border-radius: var(--radius-md);
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
    font-family: var(--font-sans);
    font-size: 0.9375rem;
    font-weight: var(--weight-semibold);
    color: white;
    background: var(--accent-primary);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover:not(:disabled) {
      background: var(--accent-primary-hover);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    &:active:not(:disabled) {
      background: var(--accent-primary-active);
      transform: translateY(0);
      box-shadow: var(--shadow-sm);
    }

    &:disabled {
      opacity: 0.5;
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
    border-top: 1px solid var(--border-default);
    font-size: var(--text-sm);
    color: var(--text-muted);
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
          var(--border-default) 30%,
          var(--accent-primary-muted) 50%,
          var(--border-default) 70%,
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
      font-size: var(--text-2xl);
    }
  }
</style>
