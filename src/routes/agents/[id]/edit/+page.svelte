<script lang="ts">
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import ScheduleCard from '$components/ScheduleCard.svelte';
  import AgentMcpServers, { type McpServerRow } from '$components/AgentMcpServers.svelte';
  import { showToast } from '$lib/stores/toast';

  const { data } = $props();
  // Server-loaded data is a one-shot seed for the edit form; untrack() silences
  // the `state_referenced_locally` warning.
  const agent = untrack(() => data.agent as Record<string, unknown>);
  const environments = untrack(() => (data.environments ?? []) as Array<{ id: string; name?: string }>);

  let name = $state((agent.name as string) ?? '');
  let model = $state(typeof agent.model === 'string' ? agent.model : (agent.model as Record<string, unknown>)?.id as string ?? 'claude-sonnet-4-6');
  let systemPrompt = $state((agent.system ?? agent.description ?? '') as string);
  let currentVersion = $state((agent.version as number) ?? 1);
  let agentToolsetEnabled = $state(false);
  const toolStates = $state({
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

  interface ScheduleFormData {
    id?: string;
    environmentId: string;
    promptTemplate: string;
    schedulePreset: string;
    hour: number;
    minute: number;
    dayOfWeek: number;
    dayOfMonth: number;
    timezone: string;
    sessionMode: string;
    enabled: boolean;
  }

  function parseCron(cron: string): { hour: number; minute: number; dayOfWeek: number; dayOfMonth: number } {
    const parts = cron.split(' ');
    return {
      minute: parts[0].includes('*') ? 0 : parseInt(parts[0]),
      hour: parts[1].includes('*') ? 0 : parseInt(parts[1]),
      dayOfMonth: parts[2] === '*' ? 1 : parseInt(parts[2]),
      dayOfWeek: parts[4] === '*' || parts[4].includes('-') ? 1 : parseInt(parts[4])
    };
  }

  type ExistingSchedule = {
    id: string;
    environmentId: string | null;
    promptTemplate: string;
    schedulePreset: string;
    cronExpression: string;
    timezone: string;
    sessionMode: string;
    enabled: boolean;
  };
  const existingSchedules = untrack(() => (data.schedules ?? []) as ExistingSchedule[]);

  const schedules = $state<ScheduleFormData[]>(
    existingSchedules.map(s => {
      const parsed = parseCron(s.cronExpression);
      return {
        id: s.id,
        environmentId: s.environmentId ?? '',
        promptTemplate: s.promptTemplate,
        schedulePreset: s.schedulePreset,
        hour: parsed.hour,
        minute: parsed.minute,
        dayOfWeek: parsed.dayOfWeek,
        dayOfMonth: parsed.dayOfMonth,
        timezone: s.timezone,
        sessionMode: s.sessionMode,
        enabled: s.enabled
      };
    })
  );

  // Track original IDs to detect deletions
  const originalScheduleIds = new Set(existingSchedules.map(s => s.id));

  function addSchedule() {
    schedules.push({
      environmentId: environments[0]?.id ?? '',
      promptTemplate: '',
      schedulePreset: 'daily',
      hour: 9,
      minute: 0,
      dayOfWeek: 1,
      dayOfMonth: 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sessionMode: 'new_session',
      enabled: true
    });
  }

  function updateSchedule(index: number, updated: ScheduleFormData) {
    schedules[index] = updated;
  }

  function removeSchedule(index: number) {
    schedules.splice(index, 1);
  }

  // Parse tools from loaded agent
  const agentTools = agent.tools as Record<string, unknown>[] | undefined;
  if (agentTools?.length) {
    for (const tool of agentTools) {
      if (tool.type === 'agent_toolset_20260401' || tool.type === 'agent') {
        agentToolsetEnabled = true;
        const configs = (tool as Record<string, unknown>).configs as Record<string, unknown>[] ?? [];
        const allTools: (keyof typeof toolStates)[] = ['bash', 'read', 'write', 'edit', 'glob', 'grep', 'web_fetch', 'web_search'];
        for (const t of allTools) {
          const cfg = configs.find((c: Record<string, unknown>) => c.name === t);
          toolStates[t] = cfg ? cfg.enabled !== false : true;
        }
      }
    }
  }

  // Hydrate MCP servers — a server is "enabled" iff it has a matching mcp_toolset entry in tools.
  function hydrateMcpServers(source: Record<string, unknown>): McpServerRow[] {
    const srcTools = (source.tools as Record<string, unknown>[] | undefined) ?? [];
    const enabled = new Set(
      srcTools
        .filter((t) => t.type === 'mcp_toolset')
        .map((t) => (t as Record<string, unknown>).mcp_server_name as string)
    );
    return ((source.mcp_servers as Record<string, unknown>[] | undefined) ?? []).map((s) => ({
      name: (s.name as string) ?? '',
      url: (s.url as string) ?? '',
      enabled: enabled.has((s.name as string) ?? '')
    }));
  }

  let mcpServers = $state<McpServerRow[]>(hydrateMcpServers(agent));

  // Versions — loaded into the right panel so a previous version can be restored.
  const versions = untrack(() => (data.versions ?? []) as Array<Record<string, unknown>>);

  function loadVersion(ver: Record<string, unknown>) {
    name = (ver.name as string) ?? '';
    model = typeof ver.model === 'string'
      ? ver.model
      : ((ver.model as Record<string, unknown>)?.id as string) ?? 'claude-sonnet-4-6';
    systemPrompt = (ver.system ?? ver.description ?? '') as string;

    // Reset toolset to defaults, then apply the version's tool config.
    agentToolsetEnabled = false;
    const allToolKeys: (keyof typeof toolStates)[] = ['bash', 'read', 'write', 'edit', 'glob', 'grep', 'web_fetch', 'web_search'];
    for (const key of allToolKeys) toolStates[key] = true;

    const verTools = (ver.tools as Record<string, unknown>[] | undefined) ?? [];
    for (const tool of verTools) {
      if (tool.type === 'agent_toolset_20260401' || tool.type === 'agent') {
        agentToolsetEnabled = true;
        const configs = ((tool as Record<string, unknown>).configs as Record<string, unknown>[]) ?? [];
        for (const t of allToolKeys) {
          const cfg = configs.find((c: Record<string, unknown>) => c.name === t);
          toolStates[t] = cfg ? cfg.enabled !== false : true;
        }
      }
    }

    mcpServers = hydrateMcpServers(ver);
    showToast(`Loaded version ${ver.version}`, { type: 'info' });
  }

  const models = [
    { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6', desc: 'Fast & capable', tier: 'balanced' },
    { value: 'claude-opus-4-6', label: 'Opus 4.6', desc: 'Most intelligent', tier: 'premium' },
    { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', desc: 'Instant & light', tier: 'fast' }
  ];

  const toolDefs: { key: string; label: string; icon: string; tip: string }[] = [
    { key: 'bash', label: 'Bash', icon: '$', tip: 'Execute shell commands in a sandboxed environment' },
    { key: 'read', label: 'Read', icon: '\u25A3', tip: 'Read file contents from the filesystem' },
    { key: 'write', label: 'Write', icon: '\u270E', tip: 'Create new files or overwrite existing ones' },
    { key: 'edit', label: 'Edit', icon: '\u2016', tip: 'Make targeted edits to existing files' },
    { key: 'glob', label: 'Glob', icon: '*', tip: 'Find files by name patterns (e.g. *.ts)' },
    { key: 'grep', label: 'Grep', icon: '/', tip: 'Search file contents with regex patterns' },
    { key: 'web_fetch', label: 'Fetch', icon: '\u2193', tip: 'Fetch content from URLs and APIs' },
    { key: 'web_search', label: 'Search', icon: '\u2315', tip: 'Search the web for information' }
  ];

  const allToolsEnabled = $derived(Object.values(toolStates).every(Boolean));

  function toggleAllTools() {
    const newVal = !allToolsEnabled;
    for (const key of Object.keys(toolStates)) {
      toolStates[key as keyof typeof toolStates] = newVal;
    }
  }

  function buildTools(): Record<string, unknown>[] {
    const tools: Record<string, unknown>[] = [];

    if (agentToolsetEnabled) {
      const configs = Object.entries(toolStates)
        .filter(([_, enabled]) => !enabled)
        .map(([name]) => ({ name, enabled: false }));
      const tool: Record<string, unknown> = { type: 'agent_toolset_20260401' };
      if (configs.length > 0) tool.configs = configs;
      tools.push(tool);
    }

    for (const srv of mcpServers) {
      const trimmed = srv.name.trim();
      if (srv.enabled && trimmed) {
        tools.push({ type: 'mcp_toolset', mcp_server_name: trimmed });
      }
    }

    return tools;
  }

  function buildMcpServersPayload() {
    return mcpServers
      .filter((s) => s.name.trim() !== '' && s.url.trim() !== '')
      .map((s) => ({ name: s.name.trim(), type: 'url' as const, url: s.url.trim() }));
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    submitting = true;

    try {
      const body: Record<string, unknown> = {
        version: currentVersion,
        name,
        model,
        system: systemPrompt || undefined,
        // Clear any system-prompt text previously mis-written into `description`
        // by an earlier version of this form. Our UI never exposes a separate
        // description field, so nulling here is a safe one-time migration.
        description: null,
        tools: buildTools(),
        // Always send mcp_servers (possibly empty) so removals propagate to Anthropic.
        mcp_servers: buildMcpServersPayload()
      };

      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || `Failed to update agent (${res.status})`);
      }

      const updated = await res.json();
      currentVersion = updated.version ?? currentVersion + 1;

      // Sync schedules: delete removed, update existing, create new
      const currentIds = new Set(schedules.filter(s => s.id).map(s => s.id as string));
      const deletedIds = [...originalScheduleIds].filter(id => !currentIds.has(id));
      const scheduleErrors: string[] = [];

      // Delete removed schedules
      for (const id of deletedIds) {
        const res = await fetch(`/api/scheduled-tasks/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          scheduleErrors.push(`Failed to delete schedule ${id}`);
        }
      }

      // Update existing and create new
      for (const sched of schedules) {
        const payload = {
          agentId: agent.id as string,
          environmentId: sched.environmentId,
          promptTemplate: sched.promptTemplate,
          schedulePreset: sched.schedulePreset,
          hour: sched.hour,
          minute: sched.minute,
          dayOfWeek: sched.dayOfWeek,
          dayOfMonth: sched.dayOfMonth,
          timezone: sched.timezone,
          sessionMode: sched.sessionMode,
          enabled: sched.enabled
        };

        if (sched.id) {
          const res = await fetch(`/api/scheduled-tasks/${sched.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            scheduleErrors.push(`Failed to update schedule ${sched.id}`);
          }
        } else {
          const res = await fetch('/api/scheduled-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            scheduleErrors.push('Failed to create a new schedule');
          }
        }
      }

      if (scheduleErrors.length > 0) {
        // Partial failure: stay on the page so the user can see what failed
        // and decide whether to retry. No redirect in this case.
        error = `Agent saved, but some schedule changes failed: ${scheduleErrors.join('; ')}`;
        return;
      }

      showToast(`Agent updated to version ${currentVersion}`, { type: 'success' });
      await goto(`/agents/${agent.id}`);
    } catch (err: unknown) {
      error = (err as Error).message;
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Edit {agent.name} | Managed Agents</title>
</svelte:head>

<div class="edit-page">
  <div class="edit-agent">
    <div class="edit-agent__header">
      <a href="/agents/{agent.id}" class="back-link">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Back to agent
      </a>
      <h1 class="edit-agent__title">Edit Agent</h1>
      <p class="edit-agent__subtitle">
        Created {formatDate(agent.created_at as string)}
      </p>
    </div>

  {#if error}
    <div class="alert alert--error" role="alert">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 5v3.5M8 10.5h.007" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      {error}
    </div>
  {/if}

  <form class="agent-form" onsubmit={handleSubmit}>
    <!-- Section 1: Identity -->
    <section class="form-section">
      <div class="form-section__label">
        <span class="form-section__number">1</span>
        Identity
      </div>
      <div class="form-section__card">
        <div class="field">
          <label class="field__label" for="name">
            Agent Name <span class="field__req">*</span>
          </label>
          <input
            id="name"
            class="field__input"
            type="text"
            bind:value={name}
            required
            placeholder="e.g. Code Reviewer, Data Analyst..."
            autocomplete="off"
          />
        </div>
      </div>
    </section>

    <!-- Section 2: Model -->
    <section class="form-section">
      <div class="form-section__label">
        <span class="form-section__number">2</span>
        Model
      </div>
      <div class="form-section__card">
        <div class="model-grid">
          {#each models as m (m.value)}
            <button
              type="button"
              class="model-card"
              class:model-card--selected={model === m.value}
              onclick={() => (model = m.value)}
            >
              <div class="model-card__tier" data-tier={m.tier}>{m.tier}</div>
              <div class="model-card__name">{m.label}</div>
              <div class="model-card__desc">{m.desc}</div>
              <div class="model-card__check">
                {#if model === m.value}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </div>
    </section>

    <!-- Section 3: System Prompt -->
    <section class="form-section">
      <div class="form-section__label">
        <span class="form-section__number">3</span>
        Instructions
      </div>
      <div class="form-section__card">
        <div class="field">
          <label class="field__label" for="system-prompt">System Prompt</label>
          <div class="prompt-wrap">
            <textarea
              id="system-prompt"
              class="field__textarea"
              bind:value={systemPrompt}
              placeholder="Define the agent's behavior, personality, and constraints..."
              rows="8"
            ></textarea>
            <div class="prompt-meta">
              <span class="prompt-meta__count">{systemPrompt.length.toLocaleString()} chars</span>
            </div>
          </div>
          <span class="field__hint">Guides the agent's behavior across all sessions.</span>
        </div>
      </div>
    </section>

    <!-- Section 4: Tools -->
    <section class="form-section">
      <div class="form-section__label">
        <span class="form-section__number">4</span>
        Capabilities
      </div>
      <div class="form-section__card">
        <div class="tools-header">
          <label class="toggle">
            <input type="checkbox" bind:checked={agentToolsetEnabled} />
            <span class="toggle__track">
              <span class="toggle__thumb"></span>
            </span>
            <span class="toggle__label">Agent Toolset</span>
          </label>
          {#if agentToolsetEnabled}
            <button
              type="button"
              class="tools-header__toggle-all"
              onclick={toggleAllTools}
            >
              {allToolsEnabled ? 'Disable all' : 'Enable all'}
            </button>
          {/if}
        </div>

        {#if agentToolsetEnabled}
          <div class="tool-chips">
            {#each toolDefs as tool (tool.key)}
              <button
                type="button"
                class="chip"
                class:chip--active={toolStates[tool.key as keyof typeof toolStates]}
                onclick={() =>
                  (toolStates[tool.key as keyof typeof toolStates] =
                    !toolStates[tool.key as keyof typeof toolStates])}
              >
                <span class="chip__icon">{tool.icon}</span>
                <span class="chip__label">{tool.label}</span>
                <span class="chip__tooltip">{tool.tip}</span>
              </button>
            {/each}
          </div>
        {:else}
          <p class="tools-disabled-note">
            No tools will be available. The agent can only respond with text.
          </p>
        {/if}
      </div>
    </section>

      <!-- Section 5: MCP servers -->
      <section class="form-section">
        <div class="form-section__label">
          <span class="form-section__number">5</span>
          MCP Servers
        </div>
        <div class="form-section__card">
          <AgentMcpServers
            servers={mcpServers}
            onchange={(next) => (mcpServers = next)}
          />
        </div>
      </section>

      <!-- Section 6: Schedules -->
      <section class="form-section">
        <div class="form-section__label">
          <span class="form-section__number">6</span>
          Schedules
          <button
            type="button"
            class="schedules-add-btn"
            onclick={addSchedule}
          >
            + Add Schedule
          </button>
        </div>
        {#if schedules.length === 0}
          <p class="schedules-empty">No schedules configured. Add a schedule to run this agent automatically.</p>
        {:else}
          <div class="schedules-list">
            {#each schedules as sched, i (sched.id ?? `new-${i}`)}
              <ScheduleCard
                schedule={sched}
                index={i}
                {environments}
                onchange={(updated: ScheduleFormData) => updateSchedule(i, updated)}
                onremove={() => removeSchedule(i)}
              />
            {/each}
          </div>
        {/if}
      </section>

      <!-- Actions -->
      <div class="form-footer">
        <a href="/agents/{agent.id}" class="btn--secondary">Cancel</a>
        <button type="submit" class="btn-save" disabled={submitting || !name.trim()}>
          {#if submitting}
            <span class="spinner"></span>
            Saving...
          {:else}
            Save Changes
          {/if}
        </button>
      </div>
    </form>
  </div>

  {#if versions.length > 1}
    <aside class="versions-col">
      <div class="versions-col__sticky">
        <div class="versions-panel__header">
          <span class="versions-panel__title">Version History</span>
        </div>
        <p class="versions-panel__desc">
          Click a version to load its settings into the form. Saving will still create a new version.
        </p>
        <div class="versions-panel__list">
          {#each versions as ver (ver.version)}
            {@const verNum = ver.version as number}
            {@const verDesc = (ver.system ?? ver.description ?? '') as string}
            {@const verDate = (ver.updated_at ?? ver.created_at) as string}
            <button
              type="button"
              class="ver-item"
              class:ver-item--current={verNum === currentVersion}
              onclick={() => loadVersion(ver)}
            >
              <div class="ver-item__row">
                <span class="ver-item__label">v{verNum}</span>
                {#if verNum === currentVersion}
                  <span class="ver-item__badge">Current</span>
                {/if}
                <span class="ver-item__date">{formatDate(verDate)}</span>
              </div>
              {#if verDesc}
                <p class="ver-item__preview">{verDesc.length > 90 ? verDesc.slice(0, 90) + '…' : verDesc}</p>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </aside>
  {/if}
</div>

<style lang="scss">
  .edit-page {
    display: flex;
    gap: var(--space-9);
    align-items: flex-start;
  }

  .edit-agent {
    flex: 1;
    min-width: 0;
    max-width: 680px;
    padding-bottom: var(--space-12);

    &__header {
      margin-bottom: var(--space-9);
    }

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

  /* ======== Versions panel (right column) ======== */
  .versions-col {
    width: 320px;
    flex-shrink: 0;
    padding-top: 106px;
  }

  .versions-col__sticky {
    position: sticky;
    top: calc(56px + var(--space-10));
  }

  .versions-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .versions-panel__title {
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .versions-panel__desc {
    font-size: var(--text-xs);
    color: var(--text-muted);
    line-height: var(--leading-normal);
    margin-bottom: var(--space-4);
  }

  .versions-panel__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-height: calc(100vh - 260px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border-strong) transparent;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: var(--radius-full); }
  }

  .ver-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-4) var(--space-5);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-family: var(--font-sans);
    text-align: left;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast);

    &:hover {
      border-color: var(--border-strong);
      background: var(--surface-2);
    }

    &--current {
      border-color: var(--accent-primary);
      background: var(--accent-primary-muted);

      &:hover {
        border-color: var(--accent-primary);
        background: var(--accent-primary-muted);
      }

      .ver-item__label {
        color: var(--accent-primary);
      }
    }

    &__row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    &__label {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }

    &__badge {
      font-size: 10px;
      font-weight: var(--weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent-primary);
      background: var(--accent-primary-muted);
      padding: 1px var(--space-2);
      border-radius: var(--radius-full);
    }

    &__date {
      margin-left: auto;
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    &__preview {
      font-size: var(--text-xs);
      color: var(--text-muted);
      font-family: var(--font-mono);
      line-height: var(--leading-normal);
      margin-top: var(--space-1);
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }

  @media (max-width: 960px) {
    .edit-page {
      flex-direction: column;
      gap: var(--space-6);
    }

    .versions-col {
      width: 100%;
      padding-top: 0;
    }

    .versions-col__sticky {
      position: static;
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

    &:hover {
      color: var(--accent-primary);
    }
  }

  .alert {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-6);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-6);
    font-size: var(--text-sm);

    &--error {
      background: var(--accent-danger-muted);
      border: 1px solid var(--accent-danger);
      color: var(--accent-danger);
    }
  }

  /* ---- Form sections ---- */
  .agent-form {
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

    &__req {
      color: var(--accent-danger);
    }

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
      transition:
        border-color var(--transition-fast),
        box-shadow var(--transition-fast);

      &::placeholder { color: var(--text-muted); }
      &:hover { border-color: var(--border-strong); }
      &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px var(--accent-primary-muted); }
    }

    &__textarea {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      min-height: 160px;
      resize: vertical;
      line-height: var(--leading-relaxed);
    }

    &__hint {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
  }

  /* ---- Prompt wrap ---- */
  .prompt-wrap {
    position: relative;
  }

  .prompt-meta {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--space-2);

    &__count {
      font-size: var(--text-xs);
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }
  }

  /* ---- Model cards ---- */
  .model-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
  }

  .model-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-5);
    background: var(--surface-0);
    border: 1.5px solid var(--border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast),
      box-shadow var(--transition-fast);
    text-align: left;
    font-family: var(--font-sans);

    &:hover { border-color: var(--border-strong); background: var(--surface-1); }

    &--selected {
      border-color: var(--accent-primary);
      background: var(--accent-primary-muted);
      box-shadow: 0 0 0 3px var(--accent-primary-muted);
      &:hover { border-color: var(--accent-primary); background: var(--accent-primary-muted); }
    }

    &__tier {
      font-size: 10px;
      font-weight: var(--weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 1px var(--space-3);
      border-radius: var(--radius-sm);
      line-height: 1.6;

      &[data-tier='balanced'] { color: var(--accent-primary); background: var(--accent-primary-muted); }
      &[data-tier='premium'] { color: var(--accent-warning); background: var(--accent-warning-muted); }
      &[data-tier='fast'] { color: var(--accent-success); background: var(--accent-success-muted); }
    }

    &__name { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--text-primary); }
    &__desc { font-size: var(--text-xs); color: var(--text-muted); }

    &__check {
      position: absolute;
      top: var(--space-4);
      right: var(--space-4);
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-primary);
    }
  }

  /* ---- Tools ---- */
  .tools-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    &__toggle-all {
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--accent-primary);
      background: none;
      border: none;
      cursor: pointer;
      font-family: var(--font-sans);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-sm);
      transition: background var(--transition-fast);
      &:hover { background: var(--accent-primary-muted); }
    }
  }

  .toggle {
    display: flex;
    align-items: center;
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

    &__label { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--text-primary); }
  }

  .tool-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
    background: var(--surface-0);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition:
      background var(--transition-fast),
      color var(--transition-fast),
      border-color var(--transition-fast);
    user-select: none;

    &:hover { border-color: var(--border-strong); color: var(--text-secondary); }

    &--active {
      color: var(--accent-primary);
      background: var(--accent-primary-muted);
      border-color: var(--accent-primary);
      &:hover { background: var(--accent-primary-muted); border-color: var(--accent-primary-hover); }
    }

    &__icon { font-family: var(--font-mono); font-size: var(--text-sm); line-height: 1; opacity: 0.7; }

    &__tooltip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      padding: var(--space-2) var(--space-4);
      background: var(--surface-3);
      color: var(--text-primary);
      font-size: 11px;
      font-weight: var(--weight-normal);
      line-height: var(--leading-normal);
      border-radius: var(--radius-sm);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity var(--transition-fast);
      box-shadow: var(--shadow-md);
      z-index: 10;

      &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-top-color: var(--surface-3);
      }
    }

    &:hover .chip__tooltip { opacity: 1; }
  }

  .tools-disabled-note {
    font-size: var(--text-sm);
    color: var(--text-muted);
    padding: var(--space-4) 0;
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

  .btn-save {
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

  .schedules-add-btn {
    margin-left: auto;
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--accent-primary);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    transition: background var(--transition-fast);
    &:hover { background: var(--accent-primary-muted); }
  }

  .schedules-empty {
    font-size: var(--text-sm);
    color: var(--text-muted);
    font-style: italic;
  }

  .schedules-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  @media (max-width: 640px) {
    .model-grid { grid-template-columns: 1fr; }
  }
</style>
