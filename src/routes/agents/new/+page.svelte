<script lang="ts">
  import { goto } from '$app/navigation';

  type ToolKeys = 'bash' | 'read' | 'write' | 'edit' | 'glob' | 'grep' | 'web_fetch' | 'web_search';

  interface Preset {
    id: string;
    label: string;
    desc: string;
    name: string;
    model: string;
    prompt: string;
    tools: Record<ToolKeys, boolean>;
    toolset: boolean;
  }

  const presets: Preset[] = [
    {
      id: 'code-reviewer',
      label: 'Code Reviewer',
      desc: 'Reviews PRs for bugs, security issues, and style',
      name: 'Code Reviewer',
      model: 'claude-sonnet-4-6',
      prompt: `You are a senior code reviewer. For every code change you receive:

1. Check for bugs, logic errors, and edge cases
2. Flag security vulnerabilities (injection, auth bypass, data exposure)
3. Evaluate error handling and failure modes
4. Suggest performance improvements where impactful
5. Note style inconsistencies only when they hurt readability

Be specific — reference line numbers and propose concrete fixes. Approve when the code is solid; don't nitpick for the sake of it.`,
      tools: { bash: true, read: true, write: false, edit: false, glob: true, grep: true, web_fetch: false, web_search: false },
      toolset: true
    },
    {
      id: 'research-assistant',
      label: 'Research Assistant',
      desc: 'Searches the web and synthesizes findings',
      name: 'Research Assistant',
      model: 'claude-sonnet-4-6',
      prompt: `You are a research assistant. When given a topic or question:

1. Search for current, authoritative sources
2. Cross-reference multiple sources to verify claims
3. Synthesize findings into clear, structured summaries
4. Cite your sources with URLs
5. Flag conflicting information or areas of uncertainty

Write for a technical audience. Prefer primary sources over blog posts. Always distinguish established facts from speculation.`,
      tools: { bash: false, read: true, write: true, edit: false, glob: false, grep: false, web_fetch: true, web_search: true },
      toolset: true
    },
    {
      id: 'data-analyst',
      label: 'Data Analyst',
      desc: 'Processes files, runs scripts, generates reports',
      name: 'Data Analyst',
      model: 'claude-sonnet-4-6',
      prompt: `You are a data analyst with access to a sandboxed environment. When given data or an analysis task:

1. Inspect the data structure, types, and quality first
2. Write Python or shell scripts to process and analyze the data
3. Compute summary statistics, identify trends, and flag anomalies
4. Present results in clear tables and plain-language summaries
5. Save outputs as files when requested

Validate assumptions before drawing conclusions. Show your methodology so results are reproducible.`,
      tools: { bash: true, read: true, write: true, edit: true, glob: true, grep: true, web_fetch: false, web_search: false },
      toolset: true
    },
    {
      id: 'devops-engineer',
      label: 'DevOps Engineer',
      desc: 'Infrastructure, CI/CD, and deployment',
      name: 'DevOps Engineer',
      model: 'claude-opus-4-6',
      prompt: `You are a DevOps engineer working in a sandboxed Linux environment. You can:

1. Write and debug Dockerfiles, CI/CD configs, and shell scripts
2. Set up project infrastructure (package managers, build tools, linters)
3. Diagnose build failures, dependency conflicts, and environment issues
4. Create deployment scripts and automation
5. Review infrastructure-as-code for security and best practices

Always explain what you're doing before running commands. Prefer idempotent operations. Never store secrets in plaintext.`,
      tools: { bash: true, read: true, write: true, edit: true, glob: true, grep: true, web_fetch: true, web_search: true },
      toolset: true
    },
    {
      id: 'technical-writer',
      label: 'Technical Writer',
      desc: 'Creates docs, READMEs, and API guides',
      name: 'Technical Writer',
      model: 'claude-sonnet-4-6',
      prompt: `You are a technical writer. When given a codebase, API, or project to document:

1. Read the source code to understand the actual behavior — don't guess
2. Write clear, scannable documentation with headers and examples
3. Include quickstart guides, API references, and troubleshooting sections
4. Use consistent terminology and define jargon on first use
5. Add code examples that actually work

Write for developers who are new to the project. Accuracy matters more than completeness — document what exists, not what might exist.`,
      tools: { bash: true, read: true, write: true, edit: true, glob: true, grep: true, web_fetch: false, web_search: false },
      toolset: true
    },
    {
      id: 'qa-tester',
      label: 'QA Tester',
      desc: 'Writes and runs tests, finds edge cases',
      name: 'QA Tester',
      model: 'claude-sonnet-4-6',
      prompt: `You are a QA engineer. When given code or a feature to test:

1. Identify the happy path, edge cases, and failure modes
2. Write automated tests (unit, integration, or end-to-end as appropriate)
3. Run existing tests and report failures with root cause analysis
4. Check boundary conditions, null handling, and concurrent access
5. Verify error messages are helpful and status codes are correct

Prioritize tests that catch real bugs over tests that pad coverage numbers. Every test should have a clear reason to exist.`,
      tools: { bash: true, read: true, write: true, edit: true, glob: true, grep: true, web_fetch: false, web_search: false },
      toolset: true
    },
    {
      id: 'security-auditor',
      label: 'Security Auditor',
      desc: 'Scans code for vulnerabilities and misconfigurations',
      name: 'Security Auditor',
      model: 'claude-opus-4-6',
      prompt: `You are a security auditor. When given a codebase or configuration to review:

1. Identify OWASP Top 10 vulnerabilities (injection, broken auth, XSS, etc.)
2. Check for hardcoded secrets, insecure defaults, and misconfigured permissions
3. Review dependency versions for known CVEs
4. Assess authentication and authorization flows
5. Evaluate data handling: encryption at rest, in transit, and key management

Rate each finding by severity (critical/high/medium/low). Provide remediation steps, not just warnings.`,
      tools: { bash: true, read: true, write: false, edit: false, glob: true, grep: true, web_fetch: true, web_search: true },
      toolset: true
    },
    {
      id: 'api-builder',
      label: 'API Builder',
      desc: 'Designs and implements REST or GraphQL APIs',
      name: 'API Builder',
      model: 'claude-sonnet-4-6',
      prompt: `You are an API engineer. When asked to design or implement an API:

1. Define clear resource models and endpoint structure
2. Follow RESTful conventions (proper HTTP methods, status codes, pagination)
3. Write request/response schemas with validation
4. Implement error handling with consistent error formats
5. Add authentication and rate limiting where appropriate

Prefer simplicity over cleverness. Document every endpoint with examples. Consider backwards compatibility.`,
      tools: { bash: true, read: true, write: true, edit: true, glob: true, grep: true, web_fetch: true, web_search: false },
      toolset: true
    },
    {
      id: 'database-admin',
      label: 'Database Admin',
      desc: 'Schema design, queries, and migrations',
      name: 'Database Admin',
      model: 'claude-sonnet-4-6',
      prompt: `You are a database administrator. When given a data modeling or query task:

1. Design normalized schemas with proper indexes and constraints
2. Write efficient SQL queries, explain query plans when relevant
3. Create safe migrations with rollback strategies
4. Identify N+1 queries, missing indexes, and slow query patterns
5. Advise on data types, partitioning, and backup strategies

Always consider data integrity first. Prefer reversible migrations. Test with realistic data volumes.`,
      tools: { bash: true, read: true, write: true, edit: true, glob: true, grep: true, web_fetch: false, web_search: false },
      toolset: true
    },
    {
      id: 'frontend-dev',
      label: 'Frontend Developer',
      desc: 'Builds UI components and pages',
      name: 'Frontend Developer',
      model: 'claude-sonnet-4-6',
      prompt: `You are a frontend developer. When given a UI task:

1. Build accessible, responsive components following the project's conventions
2. Use semantic HTML and proper ARIA attributes
3. Match the existing design system (tokens, spacing, typography)
4. Handle loading, error, and empty states
5. Ensure keyboard navigation and screen reader compatibility

Read existing components before creating new ones to maintain consistency. Prefer CSS over JavaScript for layout and animations.`,
      tools: { bash: true, read: true, write: true, edit: true, glob: true, grep: true, web_fetch: false, web_search: false },
      toolset: true
    },
    {
      id: 'refactoring-agent',
      label: 'Refactoring Agent',
      desc: 'Improves code structure without changing behavior',
      name: 'Refactoring Agent',
      model: 'claude-sonnet-4-6',
      prompt: `You are a refactoring specialist. When given code to improve:

1. Identify code smells: duplication, long methods, god classes, tight coupling
2. Apply refactoring patterns incrementally (extract method, move field, etc.)
3. Preserve all existing behavior — run tests before and after each change
4. Improve naming to reflect intent
5. Reduce complexity without over-abstracting

Make small, reviewable changes. Never refactor and add features in the same step. If tests are missing, write them first.`,
      tools: { bash: true, read: true, write: true, edit: true, glob: true, grep: true, web_fetch: false, web_search: false },
      toolset: true
    }
  ];

  let selectedPreset = $state<string | null>(null);
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

  function applyPreset(preset: Preset) {
    if (formDirty && selectedPreset !== preset.id) {
      pendingPreset = preset;
      showConfirm = true;
      return;
    }
    doApplyPreset(preset);
  }

  function doApplyPreset(preset: Preset) {
    selectedPreset = preset.id;
    name = preset.name;
    model = preset.model;
    systemPrompt = preset.prompt;
    agentToolsetEnabled = preset.toolset;
    toolStates = { ...preset.tools };
    showConfirm = false;
    pendingPreset = null;
  }

  function confirmApply() {
    if (pendingPreset) doApplyPreset(pendingPreset);
  }

  function cancelApply() {
    showConfirm = false;
    pendingPreset = null;
  }

  function clearPreset() {
    selectedPreset = null;
    name = '';
    model = 'claude-sonnet-4-6';
    systemPrompt = '';
    agentToolsetEnabled = true;
    toolStates = { bash: true, read: true, write: true, edit: true, glob: true, grep: true, web_fetch: true, web_search: true };
  }

  const models = [
    {
      value: 'claude-sonnet-4-6',
      label: 'Sonnet 4.6',
      desc: 'Fast & capable',
      tier: 'balanced'
    },
    {
      value: 'claude-opus-4-6',
      label: 'Opus 4.6',
      desc: 'Most intelligent',
      tier: 'premium'
    },
    {
      value: 'claude-haiku-4-5-20251001',
      label: 'Haiku 4.5',
      desc: 'Instant & light',
      tier: 'fast'
    }
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
  const formDirty = $derived(name.trim() !== '' || systemPrompt.trim() !== '');
  let showConfirm = $state(false);
  let pendingPreset = $state<Preset | null>(null);

  function toggleAllTools() {
    const newVal = !allToolsEnabled;
    for (const key of Object.keys(toolStates)) {
      toolStates[key as keyof typeof toolStates] = newVal;
    }
  }

  function buildTools(): Record<string, unknown>[] {
    if (!agentToolsetEnabled) return [];

    const configs = Object.entries(toolStates)
      .filter(([_, enabled]) => !enabled)
      .map(([name]) => ({ name, enabled: false }));

    const tool: Record<string, unknown> = { type: 'agent_toolset_20260401' };
    if (configs.length > 0) {
      tool.configs = configs;
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
        description: systemPrompt || undefined,
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
    } catch (err: unknown) {
      error = (err as Error).message;
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>New Agent | Managed Agents</title>
</svelte:head>

<div class="page-layout">
  <!-- Left: Form -->
  <div class="form-col">
    <div class="create-agent__header">
      <a href="/agents" class="back-link">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Agents
      </a>
      <h1 class="create-agent__title">New Agent</h1>
      <p class="create-agent__subtitle">Configure identity, model, and capabilities</p>
    </div>

    {#if error}
      <div class="alert" role="alert">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
          <path d="M8 5v3.5M8 10.5h.007" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        {error}
      </div>
    {/if}

    {#if showConfirm}
      <div class="confirm-backdrop" onclick={cancelApply} onkeydown={(e) => e.key === 'Escape' && cancelApply()} role="presentation">
        <div class="confirm-modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
          <p class="confirm-modal__text">
            Applying <strong>{pendingPreset?.label}</strong> will overwrite your current name and system prompt.
          </p>
          <div class="confirm-modal__actions">
            <button type="button" class="confirm-modal__btn confirm-modal__btn--cancel" onclick={cancelApply}>Keep editing</button>
            <button type="button" class="confirm-modal__btn confirm-modal__btn--apply" onclick={confirmApply}>Apply template</button>
          </div>
        </div>
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
            <span class="field__hint">Optional. Guides the agent's behavior across all sessions.</span>
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

      <!-- Actions -->
      <div class="form-footer">
        <a href="/agents" class="btn--secondary">Cancel</a>
        <button type="submit" class="btn-create" disabled={submitting || !name.trim()}>
          {#if submitting}
            <span class="spinner"></span>
            Creating...
          {:else}
            Create Agent
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {/if}
        </button>
      </div>
    </form>
  </div>

  <!-- Right: Templates sidebar -->
  <aside class="templates-col">
    <div class="templates-col__sticky">
      <div class="templates__header">
        <span class="templates__title">Templates</span>
        {#if selectedPreset}
          <button type="button" class="templates__clear" onclick={clearPreset}>Clear</button>
        {/if}
      </div>
      <p class="templates__desc">Pre-configured agents for common tasks. Click to populate the form.</p>
      <div class="templates__list">
        {#each presets as preset (preset.id)}
          <button
            type="button"
            class="tmpl"
            class:tmpl--selected={selectedPreset === preset.id}
            onclick={() => applyPreset(preset)}
          >
            <span class="tmpl__name">{preset.label}</span>
            <span class="tmpl__desc">{preset.desc}</span>
            <span class="tmpl__meta">
              {preset.model === 'claude-opus-4-6' ? 'Opus' : 'Sonnet'}
              &middot;
              {Object.values(preset.tools).filter(Boolean).length} tools
            </span>
          </button>
        {/each}
      </div>
    </div>
  </aside>
</div>

<style lang="scss">
  /* ======== Two-column layout ======== */
  .page-layout {
    display: flex;
    gap: var(--space-9);
    align-items: flex-start;
  }

  .form-col {
    flex: 1;
    min-width: 0;
    max-width: 680px;
    padding-bottom: var(--space-12);
  }

  .templates-col {
    width: 320px;
    flex-shrink: 0;
    padding-top: 106px;
  }

  .templates-col__sticky {
    position: sticky;
    top: calc(56px + var(--space-10));
  }

  @media (max-width: 960px) {
    .page-layout {
      flex-direction: column-reverse;
      gap: var(--space-6);
    }

    .templates-col {
      width: 100%;
      padding-top: 0;
    }

    .templates-col__sticky {
      position: static;
    }

    .templates__list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-2) !important;
    }
  }

  @media (max-width: 640px) {
    .templates__list {
      grid-template-columns: 1fr !important;
    }
  }

  /* ======== Templates sidebar ======== */
  .templates__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .templates__title {
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .templates__desc {
    font-size: var(--text-xs);
    color: var(--text-muted);
    line-height: var(--leading-normal);
    margin-bottom: var(--space-4);
  }

  .templates__clear {
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast), background var(--transition-fast);

    &:hover {
      color: var(--accent-danger);
      background: var(--accent-danger-muted);
    }
  }

  .templates__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-height: calc(100vh - 260px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border-strong) transparent;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--border-strong);
      border-radius: var(--radius-full);
    }
  }

  .tmpl {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-4) var(--space-5);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-family: var(--font-sans);
    text-align: left;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast),
      box-shadow var(--transition-fast);

    &:hover {
      border-color: var(--border-strong);
      background: var(--surface-2);
    }

    &--selected {
      border-color: var(--accent-primary);
      background: var(--accent-primary-muted);

      &:hover {
        border-color: var(--accent-primary);
        background: var(--accent-primary-muted);
      }

      .tmpl__name {
        color: var(--accent-primary);
      }
    }

    &__name {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      line-height: var(--leading-tight);
    }

    &__desc {
      font-size: var(--text-xs);
      color: var(--text-muted);
      line-height: var(--leading-normal);
    }

    &__meta {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: var(--space-1);
      opacity: 0.7;
    }
  }

  /* ======== Header ======== */
  .create-agent__header {
    margin-bottom: var(--space-9);
  }

  .create-agent__title {
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
    color: var(--text-primary);
    line-height: var(--leading-tight);
    margin-top: var(--space-4);
  }

  .create-agent__subtitle {
    font-size: var(--text-sm);
    color: var(--text-muted);
    margin-top: var(--space-2);
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
    padding: var(--space-5) var(--space-6);
    background: var(--accent-danger-muted);
    border: 1px solid var(--accent-danger);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-8);
    font-size: var(--text-sm);
    color: var(--accent-danger);
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

      &::placeholder {
        color: var(--text-muted);
      }

      &:hover {
        border-color: var(--border-strong);
      }

      &:focus {
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 3px var(--accent-primary-muted);
      }
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

    &:hover {
      border-color: var(--border-strong);
      background: var(--surface-1);
    }

    &--selected {
      border-color: var(--accent-primary);
      background: var(--accent-primary-muted);
      box-shadow: 0 0 0 3px var(--accent-primary-muted);

      &:hover {
        border-color: var(--accent-primary);
        background: var(--accent-primary-muted);
      }
    }

    &__tier {
      font-size: 10px;
      font-weight: var(--weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 1px var(--space-3);
      border-radius: var(--radius-sm);
      line-height: 1.6;

      &[data-tier='balanced'] {
        color: var(--accent-primary);
        background: var(--accent-primary-muted);
      }

      &[data-tier='premium'] {
        color: var(--accent-warning);
        background: var(--accent-warning-muted);
      }

      &[data-tier='fast'] {
        color: var(--accent-success);
        background: var(--accent-success-muted);
      }
    }

    &__name {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
    }

    &__desc {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

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

      &:hover {
        background: var(--accent-primary-muted);
      }
    }
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    cursor: pointer;

    input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    &__track {
      position: relative;
      width: 36px;
      height: 20px;
      background: var(--border-strong);
      border-radius: var(--radius-full);
      transition: background var(--transition-fast);
    }

    input:checked + &__track {
      background: var(--accent-primary);
    }

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

    input:checked + .toggle__track .toggle__thumb {
      transform: translateX(16px);
    }

    &__label {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
    }
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
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);
    user-select: none;

    &:hover {
      border-color: var(--border-strong);
      color: var(--text-secondary);
    }

    &--active {
      color: var(--accent-primary);
      background: var(--accent-primary-muted);
      border-color: var(--accent-primary);

      &:hover {
        background: var(--accent-primary-muted);
        border-color: var(--accent-primary-hover);
      }
    }

    &__icon {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      line-height: 1;
      opacity: 0.7;
    }

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

    &:hover .chip__tooltip {
      opacity: 1;
    }
  }

  /* ---- Confirmation modal ---- */
  .confirm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .confirm-modal {
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-7);
    box-shadow: var(--shadow-lg);
    max-width: 400px;
    width: 90%;

    &__text {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      line-height: var(--leading-relaxed);
      margin-bottom: var(--space-6);

      strong {
        color: var(--text-primary);
      }
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
    }

    &__btn {
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      cursor: pointer;
      transition: background var(--transition-fast), border-color var(--transition-fast);

      &--cancel {
        background: var(--surface-2);
        color: var(--text-primary);
        border-color: var(--border-default);

        &:hover { background: var(--surface-3); }
      }

      &--apply {
        background: var(--accent-primary);
        color: #fff;

        &:hover { background: var(--accent-primary-hover); }
      }
    }
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
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);
    text-decoration: none;

    &:hover {
      background: var(--surface-3);
      border-color: var(--border-strong);
    }
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
    transition:
      background var(--transition-fast),
      transform var(--transition-fast),
      box-shadow var(--transition-fast);

    &:hover:not(:disabled) {
      background: var(--accent-primary-hover);
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
    }

    &:active:not(:disabled) {
      background: var(--accent-primary-active);
      transform: translateY(1px);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
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

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ---- Responsive ---- */
  @media (max-width: 640px) {
    .model-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
