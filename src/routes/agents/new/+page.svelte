<script lang="ts">
  import { goto } from '$app/navigation';

  let name = $state('');
  let model = $state('claude-sonnet-4-6');
  let systemPrompt = $state('');
  let agentToolsetEnabled = $state(true);
  let toolStates = $state({
    bash: true,
    read: true,
    write: true,
    edit: true,
    glob: true,
    grep: true,
    web_fetch: true,
    web_search: true
  });
  let error = $state('');
  let submitting = $state(false);

  const models = [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' }
  ];

  const toolLabels: Record<string, string> = {
    bash: 'Bash',
    read: 'Read',
    write: 'Write',
    edit: 'Edit',
    glob: 'Glob',
    grep: 'Grep',
    web_fetch: 'Web Fetch',
    web_search: 'Web Search'
  };

  function buildTools(): any[] {
    if (!agentToolsetEnabled) return [];

    const disabledTools = Object.entries(toolStates)
      .filter(([_, enabled]) => !enabled)
      .map(([name]) => name);

    const tool: any = { type: 'agent' };
    if (disabledTools.length > 0) {
      tool.disabled_tools = disabledTools;
    }
    return [tool];
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    submitting = true;

    try {
      const body = {
        name,
        model,
        instructions: systemPrompt || undefined,
        tools: buildTools()
      };

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || `Failed to create agent (${res.status})`);
      }

      const agent = await res.json();
      await goto(`/agents/${agent.id}`);
    } catch (err: any) {
      error = err.message;
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>New Agent | Managed Agents</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1 class="page-header__title">Create Agent</h1>
    <p class="page-header__subtitle">Configure a new managed agent</p>
  </div>
</div>

{#if error}
  <div class="form-error alert">{error}</div>
{/if}

<form class="agent-form" onsubmit={handleSubmit}>
  <div class="form-group">
    <label class="form-label" for="name">
      Name <span class="form-label__required">*</span>
    </label>
    <input
      id="name"
      class="form-input"
      type="text"
      bind:value={name}
      required
      placeholder="My Agent"
    />
  </div>

  <div class="form-group">
    <label class="form-label" for="model">Model</label>
    <select id="model" class="form-select" bind:value={model}>
      {#each models as m}
        <option value={m.value}>{m.label}</option>
      {/each}
    </select>
  </div>

  <div class="form-group">
    <label class="form-label" for="system-prompt">System Prompt</label>
    <textarea
      id="system-prompt"
      class="form-textarea system-prompt"
      bind:value={systemPrompt}
      placeholder="You are a helpful assistant..."
      rows="10"
    ></textarea>
  </div>

  <div class="form-group">
    <label class="form-label">Tools</label>
    <div class="tools-section">
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={agentToolsetEnabled} />
        <span>Agent Toolset</span>
      </label>

      {#if agentToolsetEnabled}
        <div class="tool-list">
          {#each Object.entries(toolLabels) as [key, label]}
            <label class="checkbox-label checkbox-label--nested">
              <input type="checkbox" bind:checked={toolStates[key]} />
              <span>{label}</span>
            </label>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="form-actions">
    <a href="/agents" class="btn--secondary">Cancel</a>
    <button type="submit" class="btn" disabled={submitting || !name.trim()}>
      {submitting ? 'Creating...' : 'Create Agent'}
    </button>
  </div>
</form>

<style lang="scss">
  .agent-form {
    max-width: 720px;
  }

  .alert {
    padding: var(--space-4) var(--space-6);
    background: var(--accent-danger-muted);
    border: 1px solid var(--accent-danger);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-6);
    font-size: var(--text-sm);
  }

  .system-prompt {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    min-height: 200px;
  }

  .tools-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-5);
    background: var(--surface-2);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
  }

  .tool-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: var(--space-3);
    padding-left: var(--space-6);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-sm);
    color: var(--text-primary);
    cursor: pointer;

    input[type='checkbox'] {
      accent-color: var(--accent-primary);
      width: 16px;
      height: 16px;
    }

    &--nested {
      color: var(--text-secondary);
      font-size: var(--text-xs);
    }
  }
</style>
