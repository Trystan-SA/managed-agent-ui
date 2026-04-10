<script lang="ts">
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';

  let name = $state('');
  let description = $state('');
  let networkingType = $state<'unrestricted' | 'limited'>('unrestricted');
  let allowedHosts = $state('');
  let allowMcpServers = $state(false);
  let allowPackageManagers = $state(false);

  // Package managers
  let pipPackages = $state('');
  let npmPackages = $state('');
  let aptPackages = $state('');
  let cargoPackages = $state('');
  let goPackages = $state('');
  let gemPackages = $state('');

  let submitting = $state(false);
  let error = $state('');

  const packageManagers = [
    { key: 'pip', label: 'pip', placeholder: 'numpy, pandas, requests', get: () => pipPackages, set: (v: string) => (pipPackages = v) },
    { key: 'npm', label: 'npm', placeholder: 'lodash, axios, zod', get: () => npmPackages, set: (v: string) => (npmPackages = v) },
    { key: 'apt', label: 'apt', placeholder: 'curl, jq, git', get: () => aptPackages, set: (v: string) => (aptPackages = v) },
    { key: 'cargo', label: 'cargo', placeholder: 'serde, tokio, clap', get: () => cargoPackages, set: (v: string) => (cargoPackages = v) },
    { key: 'go', label: 'go', placeholder: 'github.com/gorilla/mux', get: () => goPackages, set: (v: string) => (goPackages = v) },
    { key: 'gem', label: 'gem', placeholder: 'rails, nokogiri', get: () => gemPackages, set: (v: string) => (gemPackages = v) }
  ];

  // Only show expanded package fields that have content
  let expandedPkgs = $state<Set<string>>(new Set(['pip', 'npm', 'apt']));

  function togglePkg(key: string) {
    const next = new Set(expandedPkgs);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    expandedPkgs = next;
  }

  function parseList(value: string): string[] {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }

  function parseLines(value: string): string[] {
    return value.split('\n').map((s) => s.trim()).filter(Boolean);
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    submitting = true;
    error = '';

    const networking: Record<string, unknown> =
      networkingType === 'unrestricted'
        ? { type: 'unrestricted' }
        : {
            type: 'limited',
            allowed_hosts: parseLines(allowedHosts),
            allow_mcp_servers: allowMcpServers,
            allow_package_managers: allowPackageManagers
          };

    const packages: Record<string, string[]> = {};
    const addPkg = (key: string, val: string) => {
      const parsed = parseList(val);
      if (parsed.length) packages[key] = parsed;
    };
    addPkg('pip', pipPackages);
    addPkg('npm', npmPackages);
    addPkg('apt', aptPackages);
    addPkg('cargo', cargoPackages);
    addPkg('go', goPackages);
    addPkg('gem', gemPackages);

    try {
      const result = await apiFetch<{ id: string }>('/api/environments', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          config: {
            type: 'cloud',
            networking,
            ...(Object.keys(packages).length > 0 && { packages: { ...packages, type: 'packages' } })
          }
        })
      });
      await goto(`/environments/${result.id}`);
    } catch (e: any) {
      error = e.message || 'Failed to create environment';
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>New Environment | Managed Agents</title>
</svelte:head>

<div class="create-env">
  <div class="create-env__header">
    <a href="/environments" class="back-link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Environments
    </a>
    <h1 class="create-env__title">New Environment</h1>
    <p class="create-env__subtitle">Configure a sandboxed cloud runtime for your agents</p>
  </div>

  {#if error}
    <div class="alert" role="alert">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 5v3.5M8 10.5h.007" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      {error}
    </div>
  {/if}

  <form class="env-form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>

    <!-- Section 1: Identity -->
    <section class="form-section">
      <div class="form-section__label">
        <span class="form-section__number">1</span>
        Identity
      </div>
      <div class="form-section__card">
        <div class="field">
          <label class="field__label" for="env-name">
            Name <span class="field__req">*</span>
          </label>
          <input
            id="env-name"
            class="field__input"
            type="text"
            bind:value={name}
            required
            placeholder="e.g. production-sandbox, dev-environment"
            autocomplete="off"
          />
        </div>
        <div class="field">
          <label class="field__label" for="env-desc">Description</label>
          <input
            id="env-desc"
            class="field__input"
            type="text"
            bind:value={description}
            placeholder="What is this environment used for?"
          />
          <span class="field__hint">Optional. Helps identify the environment's purpose.</span>
        </div>
      </div>
    </section>

    <!-- Section 2: Networking -->
    <section class="form-section">
      <div class="form-section__label">
        <span class="form-section__number">2</span>
        Networking
      </div>
      <div class="form-section__card">
        <div class="net-options">
          <button
            type="button"
            class="net-card"
            class:net-card--selected={networkingType === 'unrestricted'}
            onclick={() => (networkingType = 'unrestricted')}
          >
            <div class="net-card__icon">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.25"/>
                <path d="M2 8h12M8 1.5c-2 2-2 11 0 13M8 1.5c2 2 2 11 0 13" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="net-card__title">Unrestricted</span>
            <span class="net-card__desc">Full outbound network access</span>
          </button>
          <button
            type="button"
            class="net-card"
            class:net-card--selected={networkingType === 'limited'}
            onclick={() => (networkingType = 'limited')}
          >
            <div class="net-card__icon">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="5" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.25"/>
                <path d="M5 5V4a3 3 0 0 1 6 0v1" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
                <circle cx="8" cy="9.5" r="1" fill="currentColor"/>
              </svg>
            </div>
            <span class="net-card__title">Limited</span>
            <span class="net-card__desc">Restrict to allowed hosts only</span>
          </button>
        </div>

        {#if networkingType === 'limited'}
          <div class="limited-config">
            <div class="field">
              <label class="field__label" for="allowed-hosts">Allowed Hosts</label>
              <textarea
                id="allowed-hosts"
                class="field__textarea field__textarea--sm"
                bind:value={allowedHosts}
                placeholder={"api.example.com\ncdn.example.com\ndb.internal.io"}
                rows="4"
              ></textarea>
              <span class="field__hint">One hostname per line</span>
            </div>

            <div class="toggle-group">
              <label class="toggle">
                <input type="checkbox" bind:checked={allowMcpServers} />
                <span class="toggle__track"><span class="toggle__thumb"></span></span>
                <div class="toggle__text">
                  <span class="toggle__label">Allow MCP Servers</span>
                  <span class="toggle__hint">Permit outbound access to MCP server endpoints</span>
                </div>
              </label>
              <label class="toggle">
                <input type="checkbox" bind:checked={allowPackageManagers} />
                <span class="toggle__track"><span class="toggle__thumb"></span></span>
                <div class="toggle__text">
                  <span class="toggle__label">Allow Package Managers</span>
                  <span class="toggle__hint">Permit access to PyPI, npm, etc.</span>
                </div>
              </label>
            </div>
          </div>
        {/if}
      </div>
    </section>

    <!-- Section 3: Packages -->
    <section class="form-section">
      <div class="form-section__label">
        <span class="form-section__number">3</span>
        Packages
      </div>
      <div class="form-section__card">
        <span class="field__hint" style="margin-top: -4px;">
          Pre-install packages into the environment. Comma-separated names.
        </span>

        <div class="pkg-list">
          {#each packageManagers as pm}
            {#if expandedPkgs.has(pm.key)}
              <div class="pkg-row">
                <label class="pkg-row__label" for="pkg-{pm.key}">
                  <code>{pm.label}</code>
                </label>
                <input
                  id="pkg-{pm.key}"
                  class="field__input pkg-row__input"
                  type="text"
                  value={pm.get()}
                  oninput={(e) => pm.set((e.target as HTMLInputElement).value)}
                  placeholder={pm.placeholder}
                />
              </div>
            {/if}
          {/each}
        </div>

        <!-- Toggle for less common package managers -->
        {#if [...expandedPkgs].length < packageManagers.length}
          <div class="pkg-more">
            {#each packageManagers.filter(p => !expandedPkgs.has(p.key)) as pm}
              <button type="button" class="pkg-more__btn" onclick={() => togglePkg(pm.key)}>
                + {pm.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </section>

    <!-- Actions -->
    <div class="form-footer">
      <a href="/environments" class="btn--secondary">Cancel</a>
      <button type="submit" class="btn-create" disabled={submitting || !name.trim()}>
        {#if submitting}
          <span class="spinner"></span>
          Creating...
        {:else}
          Create Environment
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        {/if}
      </button>
    </div>
  </form>
</div>

<style lang="scss">
  .create-env {
    max-width: 680px;
    padding-bottom: var(--space-12);

    &__header { margin-bottom: var(--space-9); }
    &__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      color: var(--text-primary);
      line-height: var(--leading-tight);
      margin-top: var(--space-4);
    }
    &__subtitle {
      font-size: var(--text-sm);
      color: var(--text-muted);
      margin-top: var(--space-2);
    }
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: color var(--transition-fast);
    &:hover { color: var(--accent-primary); }
  }

  .alert {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-5) var(--space-6);
    background: var(--accent-danger-muted);
    border: 1px solid var(--accent-danger);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-8);
    font-size: var(--text-sm);
    color: var(--accent-danger);
  }

  /* ---- Form sections ---- */
  .env-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .form-section {
    &__label {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: var(--space-4);
    }

    &__number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: var(--radius-full);
      background: var(--accent-primary-muted);
      color: var(--accent-primary);
      font-size: var(--text-xs);
      font-weight: var(--weight-bold);
      font-variant-numeric: tabular-nums;
    }

    &__card {
      background: var(--surface-1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      padding: var(--space-7);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }
  }

  /* ---- Fields ---- */
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);

    &__label {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-secondary);
    }

    &__req { color: var(--accent-danger); }

    &__input,
    &__textarea {
      width: 100%;
      padding: var(--space-4) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--surface-0);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      outline: none;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

      &::placeholder { color: var(--text-muted); }
      &:hover { border-color: var(--border-strong); }
      &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px var(--accent-primary-muted); }
    }

    &__textarea {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      resize: vertical;
      line-height: var(--leading-relaxed);

      &--sm { min-height: 80px; }
    }

    &__hint {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
  }

  /* ---- Networking cards ---- */
  .net-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .net-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-5);
    background: var(--surface-0);
    border: 1.5px solid var(--border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-family: var(--font-sans);
    text-align: left;
    transition: border-color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);

    &:hover { border-color: var(--border-strong); }

    &--selected {
      border-color: var(--accent-primary);
      background: var(--accent-primary-muted);
      box-shadow: 0 0 0 3px var(--accent-primary-muted);
      &:hover { border-color: var(--accent-primary); }
    }

    &__icon { color: var(--text-muted); }
    &--selected &__icon { color: var(--accent-primary); }

    &__title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
    }

    &__desc {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
  }

  .limited-config {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    padding-top: var(--space-4);
    border-top: 1px solid var(--border-subtle);
  }

  .toggle-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .toggle {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    cursor: pointer;

    input { position: absolute; opacity: 0; width: 0; height: 0; }

    &__track {
      position: relative;
      width: 36px;
      height: 20px;
      background: var(--border-strong);
      border-radius: var(--radius-full);
      transition: background var(--transition-fast);
      flex-shrink: 0;
      margin-top: 2px;
    }

    input:checked + &__track { background: var(--accent-primary); }

    &__thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-sm);
      transition: transform var(--transition-fast);
    }

    input:checked + .toggle__track .toggle__thumb { transform: translateX(16px); }

    &__text { display: flex; flex-direction: column; gap: 1px; }
    &__label { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--text-primary); }
    &__hint { font-size: var(--text-xs); color: var(--text-muted); }
  }

  /* ---- Packages ---- */
  .pkg-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .pkg-row {
    display: flex;
    align-items: center;
    gap: var(--space-4);

    &__label {
      width: 52px;
      flex-shrink: 0;
      text-align: right;

      code {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        font-weight: var(--weight-semibold);
        color: var(--text-muted);
        background: var(--surface-2);
        padding: 2px 6px;
        border-radius: var(--radius-sm);
      }
    }

    &__input { flex: 1; }
  }

  .pkg-more {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);

    &__btn {
      font-family: var(--font-sans);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--accent-primary);
      background: none;
      border: 1px dashed var(--border-default);
      border-radius: var(--radius-full);
      padding: var(--space-2) var(--space-4);
      cursor: pointer;
      transition: background var(--transition-fast), border-color var(--transition-fast);

      &:hover {
        background: var(--accent-primary-muted);
        border-color: var(--accent-primary);
      }
    }
  }

  /* ---- Footer ---- */
  .form-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-4);
    padding-top: var(--space-6);
    border-top: 1px solid var(--border-subtle);
  }

  .btn--secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4) var(--space-6);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--text-primary);
    background: var(--surface-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--transition-fast), border-color var(--transition-fast);
    text-decoration: none;
    &:hover { background: var(--surface-3); border-color: var(--border-strong); }
  }

  .btn-create {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-7);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: #fff;
    background: var(--accent-primary);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);

    &:hover:not(:disabled) { background: var(--accent-primary-hover); box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3); }
    &:active:not(:disabled) { background: var(--accent-primary-active); transform: translateY(1px); }
    &:disabled { opacity: 0.45; cursor: not-allowed; }
  }

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: var(--radius-full);
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 640px) {
    .net-options { grid-template-columns: 1fr; }
    .pkg-row { flex-direction: column; align-items: stretch; gap: var(--space-2); }
    .pkg-row__label { width: auto; text-align: left; }
  }
</style>
