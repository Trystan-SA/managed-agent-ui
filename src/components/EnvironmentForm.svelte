<script lang="ts" module>
  export type MetadataEntry = { key: string; value: string };

  export type EnvironmentFormValues = {
    name: string;
    description: string;
    networkingType: 'unrestricted' | 'limited';
    allowedHosts: string;
    allowMcpServers: boolean;
    allowPackageManagers: boolean;
    pipPackages: string;
    npmPackages: string;
    aptPackages: string;
    cargoPackages: string;
    goPackages: string;
    gemPackages: string;
    metadata: MetadataEntry[];
  };

  export type EnvironmentPayload = {
    name: string;
    description?: string;
    config: {
      type: 'cloud';
      networking: Record<string, unknown>;
      packages?: Record<string, unknown>;
    };
    metadata?: Record<string, string>;
  };

  // Anthropic metadata limits (apply across Managed Agents resources).
  export const METADATA_MAX_PAIRS = 16;
  export const METADATA_MAX_KEY_LENGTH = 64;
  export const METADATA_MAX_VALUE_LENGTH = 512;

  export function buildPayload(v: EnvironmentFormValues): EnvironmentPayload {
    const parseList = (value: string) =>
      value.split(',').map((s) => s.trim()).filter(Boolean);
    const parseLines = (value: string) =>
      value.split('\n').map((s) => s.trim()).filter(Boolean);

    const networking: Record<string, unknown> =
      v.networkingType === 'unrestricted'
        ? { type: 'unrestricted' }
        : {
            type: 'limited',
            allowed_hosts: parseLines(v.allowedHosts),
            allow_mcp_servers: v.allowMcpServers,
            allow_package_managers: v.allowPackageManagers
          };

    const packages: Record<string, string[]> = {};
    const addPkg = (key: string, val: string) => {
      const parsed = parseList(val);
      if (parsed.length) packages[key] = parsed;
    };
    addPkg('pip', v.pipPackages);
    addPkg('npm', v.npmPackages);
    addPkg('apt', v.aptPackages);
    addPkg('cargo', v.cargoPackages);
    addPkg('go', v.goPackages);
    addPkg('gem', v.gemPackages);

    const metadata: Record<string, string> = {};
    for (const entry of v.metadata) {
      const k = entry.key.trim();
      if (k) metadata[k] = entry.value;
    }

    return {
      name: v.name.trim(),
      description: v.description.trim() || undefined,
      config: {
        type: 'cloud',
        networking,
        ...(Object.keys(packages).length > 0 && {
          packages: { ...packages, type: 'packages' }
        })
      },
      ...(Object.keys(metadata).length > 0 && { metadata })
    };
  }

  export function valuesFromEnvironment(env: Record<string, unknown>): Partial<EnvironmentFormValues> {
    const config = env.config as Record<string, unknown> | undefined;
    const net = config?.networking as Record<string, unknown> | undefined;
    const pkgs = config?.packages as Record<string, string[]> | undefined;

    const values: Partial<EnvironmentFormValues> = {
      name: (env.name as string) ?? '',
      description: (env.description as string) ?? ''
    };

    if (net?.type === 'limited') {
      values.networkingType = 'limited';
      values.allowedHosts = ((net.allowed_hosts ?? []) as string[]).join('\n');
      values.allowMcpServers = (net.allow_mcp_servers as boolean) ?? false;
      values.allowPackageManagers = (net.allow_package_managers as boolean) ?? false;
    }

    if (pkgs) {
      values.pipPackages = (pkgs.pip ?? []).join(', ');
      values.npmPackages = (pkgs.npm ?? []).join(', ');
      values.aptPackages = (pkgs.apt ?? []).join(', ');
      values.cargoPackages = (pkgs.cargo ?? []).join(', ');
      values.goPackages = (pkgs.go ?? []).join(', ');
      values.gemPackages = (pkgs.gem ?? []).join(', ');
    }

    const md = env.metadata as Record<string, string> | undefined;
    if (md && Object.keys(md).length > 0) {
      values.metadata = Object.entries(md).map(([key, value]) => ({ key, value }));
    }

    return values;
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import HelpBadge from '$components/HelpBadge.svelte';

  type Props = {
    initial?: Partial<EnvironmentFormValues>;
    submitting: boolean;
    error: string;
    submitLabel: string;
    submittingLabel: string;
    submitIcon?: 'arrow' | 'check';
    cancelHref: string;
    onsubmit: (payload: EnvironmentPayload) => void | Promise<void>;
  };

  const {
    initial = {},
    submitting,
    error,
    submitLabel,
    submittingLabel,
    submitIcon = 'arrow',
    cancelHref,
    onsubmit
  }: Props = $props();

  // `initial` seeds the form; edits are local state afterwards. untrack() silences
  // the `state_referenced_locally` warning for one-shot prop captures.
  const seed = untrack(() => initial);
  let name = $state(seed.name ?? '');
  let description = $state(seed.description ?? '');
  let networkingType = $state<'unrestricted' | 'limited'>(
    seed.networkingType ?? 'unrestricted'
  );
  let allowedHosts = $state(seed.allowedHosts ?? '');
  let allowMcpServers = $state(seed.allowMcpServers ?? false);
  let allowPackageManagers = $state(seed.allowPackageManagers ?? false);

  let pipPackages = $state(seed.pipPackages ?? '');
  let npmPackages = $state(seed.npmPackages ?? '');
  let aptPackages = $state(seed.aptPackages ?? '');
  let cargoPackages = $state(seed.cargoPackages ?? '');
  let goPackages = $state(seed.goPackages ?? '');
  let gemPackages = $state(seed.gemPackages ?? '');

  const metadata = $state<MetadataEntry[]>(
    seed.metadata ? seed.metadata.map((e) => ({ ...e })) : []
  );

  function addMetadataRow() {
    if (metadata.length >= METADATA_MAX_PAIRS) return;
    metadata.push({ key: '', value: '' });
  }
  function removeMetadataRow(index: number) {
    metadata.splice(index, 1);
  }

  const packageManagers = [
    { key: 'pip', label: 'pip', placeholder: 'numpy, pandas, requests', get: () => pipPackages, set: (v: string) => (pipPackages = v) },
    { key: 'npm', label: 'npm', placeholder: 'lodash, axios, zod', get: () => npmPackages, set: (v: string) => (npmPackages = v) },
    { key: 'apt', label: 'apt', placeholder: 'curl, jq, git', get: () => aptPackages, set: (v: string) => (aptPackages = v) },
    { key: 'cargo', label: 'cargo', placeholder: 'serde, tokio, clap', get: () => cargoPackages, set: (v: string) => (cargoPackages = v) },
    { key: 'go', label: 'go', placeholder: 'github.com/gorilla/mux', get: () => goPackages, set: (v: string) => (goPackages = v) },
    { key: 'gem', label: 'gem', placeholder: 'rails, nokogiri', get: () => gemPackages, set: (v: string) => (gemPackages = v) }
  ];

  // Only expand package rows that have initial content; everything else starts as a chip.
  const expandedPkgs = new SvelteSet<string>();
  for (const pm of packageManagers) {
    const initialVal = seed[`${pm.key}Packages` as keyof EnvironmentFormValues];
    if (typeof initialVal === 'string' && initialVal.trim()) expandedPkgs.add(pm.key);
  }

  function togglePkg(key: string) {
    if (expandedPkgs.has(key)) {
      expandedPkgs.delete(key);
      // Clear the value on collapse so it isn't silently submitted.
      packageManagers.find((p) => p.key === key)?.set('');
    } else {
      expandedPkgs.add(key);
    }
  }

  function handleSubmit() {
    if (!name.trim()) return;
    const payload = buildPayload({
      name,
      description,
      networkingType,
      allowedHosts,
      allowMcpServers,
      allowPackageManagers,
      pipPackages,
      npmPackages,
      aptPackages,
      cargoPackages,
      goPackages,
      gemPackages,
      metadata
    });
    onsubmit(payload);
  }
</script>

{#if error}
  <div class="alert" role="alert">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
      <path d="M8 5v3.5M8 10.5h.007" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
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
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.25" />
              <path d="M2 8h12M8 1.5c-2 2-2 11 0 13M8 1.5c2 2 2 11 0 13" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
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
              <rect x="2" y="5" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.25" />
              <path d="M5 5V4a3 3 0 0 1 6 0v1" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
              <circle cx="8" cy="9.5" r="1" fill="currentColor" />
            </svg>
          </div>
          <span class="net-card__title">Limited</span>
          <span class="net-card__desc">Restrict to allowed hosts only</span>
        </button>
      </div>

      {#if networkingType === 'limited'}
        <div class="limited-config">
          <div class="field">
            <div class="field__label-row">
              <label class="field__label" for="allowed-hosts">Allowed Hosts</label>
              <HelpBadge
                text="Domains the agent container is allowed to reach over the network. With Limited networking, all outbound traffic is blocked except these hosts. Use exact domain names (e.g. api.example.com) — one per line. If you rely on MCP servers, include their domains here or tool calls will silently fail."
              />
            </div>
            <textarea
              id="allowed-hosts"
              class="field__textarea field__textarea--sm"
              bind:value={allowedHosts}
              placeholder="api.example.com&#10;cdn.example.com&#10;db.internal.io"
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
        {#each packageManagers as pm (pm.key)}
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
              <button
                type="button"
                class="pkg-row__remove"
                onclick={() => togglePkg(pm.key)}
                aria-label="Remove {pm.label} packages"
                title="Remove {pm.label}"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </button>
            </div>
          {/if}
        {/each}
      </div>

      {#if [...expandedPkgs].length < packageManagers.length}
        <div class="pkg-more">
          {#each packageManagers.filter((p) => !expandedPkgs.has(p.key)) as pm (pm.key)}
            <button type="button" class="pkg-more__btn" onclick={() => togglePkg(pm.key)}>
              + {pm.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </section>

  <!-- Section 4: Metadata -->
  <section class="form-section">
    <div class="form-section__label">
      <span class="form-section__number">4</span>
      Metadata
      <HelpBadge
        text="Custom key/value tags attached to the environment. Useful for labeling environments with team, project, or cost-center identifiers. Up to 16 pairs; keys ≤ 64 chars, values ≤ 512 chars."
      />
    </div>
    <div class="form-section__card">
      {#if metadata.length === 0}
        <span class="field__hint" style="margin-top: -4px;">
          No metadata. Add custom key/value tags to organize and filter environments.
        </span>
      {:else}
        <div class="meta-list">
          {#each metadata as entry, index (index)}
            <div class="meta-row">
              <input
                class="field__input meta-row__key"
                type="text"
                bind:value={entry.key}
                placeholder="key"
                maxlength={METADATA_MAX_KEY_LENGTH}
                aria-label="Metadata key {index + 1}"
              />
              <input
                class="field__input meta-row__value"
                type="text"
                bind:value={entry.value}
                placeholder="value"
                maxlength={METADATA_MAX_VALUE_LENGTH}
                aria-label="Metadata value {index + 1}"
              />
              <button
                type="button"
                class="pkg-row__remove"
                onclick={() => removeMetadataRow(index)}
                aria-label="Remove metadata entry {index + 1}"
                title="Remove"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </button>
            </div>
          {/each}
        </div>
      {/if}

      <div class="meta-footer">
        <button
          type="button"
          class="pkg-more__btn"
          onclick={addMetadataRow}
          disabled={metadata.length >= METADATA_MAX_PAIRS}
        >
          + Add metadata
        </button>
        <span class="field__hint">{metadata.length} / {METADATA_MAX_PAIRS}</span>
      </div>
    </div>
  </section>

  <!-- Actions -->
  <div class="form-footer">
    <a href={cancelHref} class="btn--secondary">Cancel</a>
    <button type="submit" class="btn-submit" disabled={submitting || !name.trim()}>
      {#if submitting}
        <span class="spinner"></span>
        {submittingLabel}
      {:else}
        {submitLabel}
        {#if submitIcon === 'check'}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        {:else}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        {/if}
      {/if}
    </button>
  </div>
</form>

<style lang="scss">
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

    &__label-row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
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

    &__remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      border-radius: var(--radius-full);
      background: none;
      border: 1px solid transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition:
        background var(--transition-fast),
        border-color var(--transition-fast),
        color var(--transition-fast);

      &:hover {
        background: var(--accent-danger-muted);
        border-color: var(--accent-danger);
        color: var(--accent-danger);
      }
    }
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

  /* "+ Add metadata" reuses .pkg-more__btn; this is the standalone disabled state. */
  .pkg-more__btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    &:hover { background: none; border-color: var(--border-default); }
  }

  /* ---- Metadata ---- */
  .meta-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .meta-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);

    &__key { flex: 0 0 35%; font-family: var(--font-mono); }
    &__value { flex: 1; }
  }

  .meta-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
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

  .btn-submit {
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