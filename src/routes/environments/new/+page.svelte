<script lang="ts">
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';

  let name = $state('');
  let networkingType = $state<'unrestricted' | 'limited'>('unrestricted');
  let allowedHosts = $state('');
  let allowMcpServers = $state(false);
  let allowPackageManagers = $state(false);
  let pipPackages = $state('');
  let npmPackages = $state('');
  let aptPackages = $state('');

  let submitting = $state(false);
  let error = $state('');

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
    const pip = parseList(pipPackages);
    const npm = parseList(npmPackages);
    const apt = parseList(aptPackages);
    if (pip.length) packages.pip = pip;
    if (npm.length) packages.npm = npm;
    if (apt.length) packages.apt = apt;

    try {
      const result = await apiFetch<{ id: string }>('/api/environments', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          config: {
            type: 'cloud',
            networking,
            ...(Object.keys(packages).length > 0 && { packages })
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

<div class="page-header">
  <div>
    <h1 class="page-header__title">New Environment</h1>
    <p class="page-header__subtitle">Configure a sandboxed runtime environment</p>
  </div>
</div>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
  {#if error}
    <div class="form-error" style="margin-bottom: var(--space-6);">{error}</div>
  {/if}

  <div class="form-group">
    <label class="form-label" for="env-name">
      Name <span class="form-label__required">*</span>
    </label>
    <input
      id="env-name"
      class="form-input"
      type="text"
      bind:value={name}
      placeholder="e.g. production-sandbox"
      required
    />
  </div>

  <div class="form-group">
    <label class="form-label">Networking Mode</label>
    <div class="radio-group">
      <label class="radio-option">
        <input type="radio" bind:group={networkingType} value="unrestricted" />
        <span>Unrestricted</span>
        <span class="form-hint">Full network access</span>
      </label>
      <label class="radio-option">
        <input type="radio" bind:group={networkingType} value="limited" />
        <span>Limited</span>
        <span class="form-hint">Restrict to allowed hosts only</span>
      </label>
    </div>
  </div>

  {#if networkingType === 'limited'}
    <div class="form-group">
      <label class="form-label" for="allowed-hosts">Allowed Hosts</label>
      <span class="form-hint">One host per line</span>
      <textarea
        id="allowed-hosts"
        class="form-textarea"
        bind:value={allowedHosts}
        placeholder={"api.example.com\ncdn.example.com"}
        rows="4"
      ></textarea>
    </div>

    <div class="form-group">
      <label class="toggle-row">
        <input type="checkbox" bind:checked={allowMcpServers} />
        <span class="form-label">Allow MCP Servers</span>
      </label>
    </div>

    <div class="form-group">
      <label class="toggle-row">
        <input type="checkbox" bind:checked={allowPackageManagers} />
        <span class="form-label">Allow Package Managers</span>
      </label>
    </div>
  {/if}

  <div class="form-group">
    <label class="form-label">Packages</label>
    <span class="form-hint">Comma-separated package names to pre-install</span>
  </div>

  <div class="form-group">
    <label class="form-label" for="pip-pkgs">pip</label>
    <input
      id="pip-pkgs"
      class="form-input"
      type="text"
      bind:value={pipPackages}
      placeholder="numpy, pandas, requests"
    />
  </div>

  <div class="form-group">
    <label class="form-label" for="npm-pkgs">npm</label>
    <input
      id="npm-pkgs"
      class="form-input"
      type="text"
      bind:value={npmPackages}
      placeholder="lodash, axios"
    />
  </div>

  <div class="form-group">
    <label class="form-label" for="apt-pkgs">apt</label>
    <input
      id="apt-pkgs"
      class="form-input"
      type="text"
      bind:value={aptPackages}
      placeholder="curl, jq, git"
    />
  </div>

  <div class="form-actions">
    <a href="/environments" class="btn btn--secondary">Cancel</a>
    <button type="submit" class="btn" disabled={submitting || !name.trim()}>
      {submitting ? 'Creating...' : 'Create Environment'}
    </button>
  </div>
</form>

<style>
  form {
    max-width: 640px;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    cursor: pointer;
    font-size: var(--text-sm);
    color: var(--text-primary);
  }

  .radio-option .form-hint {
    margin-left: var(--space-2);
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    cursor: pointer;
  }

  .toggle-row .form-label {
    margin: 0;
  }
</style>
