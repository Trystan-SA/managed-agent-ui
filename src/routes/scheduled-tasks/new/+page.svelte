<script lang="ts">
  import { goto } from '$app/navigation';
  import PromptTemplateEditor from '$components/PromptTemplateEditor.svelte';
  import SchedulePresetPicker from '$components/SchedulePresetPicker.svelte';
  import { apiFetch, ApiError } from '$lib/utils/api';

  const { data } = $props();

  // Basics
  let name = $state('');
  let description = $state('');

  // Agent & Environment
  let agentId = $state('');
  let environmentId = $state('');

  // Prompt
  let promptTemplate = $state('');

  // Schedule
  let schedulePreset = $state('daily');
  let scheduleHour = $state(8);
  let scheduleMinute = $state(0);
  let scheduleDayOfWeek = $state(1);
  let scheduleDayOfMonth = $state(1);
  let timezone = $state(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Session mode
  let sessionMode = $state<'new_session' | 'continue_session'>('new_session');

  // UI state
  let submitting = $state(false);
  let error = $state('');

  function handleScheduleChange(values: {
    preset: string;
    hour: number;
    minute: number;
    dayOfWeek: number;
    dayOfMonth: number;
  }) {
    schedulePreset = values.preset;
    scheduleHour = values.hour;
    scheduleMinute = values.minute;
    scheduleDayOfWeek = values.dayOfWeek;
    scheduleDayOfMonth = values.dayOfMonth;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';

    if (!name.trim()) {
      error = 'Task name is required.';
      return;
    }
    if (!agentId) {
      error = 'Please select an agent.';
      return;
    }
    if (!environmentId) {
      error = 'Please select an environment.';
      return;
    }
    if (!promptTemplate.trim()) {
      error = 'Prompt template is required.';
      return;
    }

    submitting = true;

    try {
      const task = await apiFetch<{ id: string }>('/api/scheduled-tasks', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          agentId,
          environmentId,
          promptTemplate: promptTemplate.trim(),
          schedulePreset,
          hour: scheduleHour,
          minute: scheduleMinute,
          dayOfWeek: scheduleDayOfWeek,
          dayOfMonth: scheduleDayOfMonth,
          timezone,
          sessionMode
        })
      });

      await goto(`/scheduled-tasks/${task.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        error = err.message;
      } else if (err instanceof Error) {
        error = err.message;
      } else {
        error = 'An unexpected error occurred.';
      }
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>New Scheduled Task | Managed Agents</title>
</svelte:head>

<div class="new-task-page">
  <div class="new-task-page__header">
    <div>
      <h1 class="new-task-page__title">New Scheduled Task</h1>
      <p class="new-task-page__subtitle">Configure an agent to run automatically on a schedule.</p>
    </div>
  </div>

  {#if error}
    <div class="error-banner" role="alert">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.25"/>
        <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      {error}
    </div>
  {/if}

  <form class="task-form" onsubmit={handleSubmit} novalidate>

    <!-- ── Basics ── -->
    <section class="form-section">
      <div class="form-section__heading">Basics</div>
      <div class="form-group">
        <label class="form-field__label" for="task-name">
          Name <span class="form-field__required">*</span>
        </label>
        <input
          id="task-name"
          type="text"
          class="form-field__input"
          bind:value={name}
          placeholder="e.g. Daily standup summary"
          required
          autocomplete="off"
        />
      </div>
      <div class="form-group">
        <label class="form-field__label" for="task-description">Description</label>
        <input
          id="task-description"
          type="text"
          class="form-field__input"
          bind:value={description}
          placeholder="Optional description"
          autocomplete="off"
        />
      </div>
    </section>

    <!-- ── Agent & Environment ── -->
    <section class="form-section">
      <div class="form-section__heading">Agent &amp; Environment</div>
      <div class="form-group">
        <label class="form-field__label" for="task-agent">
          Agent <span class="form-field__required">*</span>
        </label>
        <select
          id="task-agent"
          class="form-field__select"
          bind:value={agentId}
        >
          <option value="">Select an agent…</option>
          {#each data.agents as agent (agent.id)}
            <option value={agent.id as string}>
              {(agent.name as string | null | undefined) ?? (agent.id as string)}
            </option>
          {/each}
        </select>
        {#if data.agents.length === 0}
          <p class="form-field__hint">No agents found. Create one first.</p>
        {/if}
      </div>
      <div class="form-group">
        <label class="form-field__label" for="task-environment">
          Environment <span class="form-field__required">*</span>
        </label>
        <select
          id="task-environment"
          class="form-field__select"
          bind:value={environmentId}
        >
          <option value="">Select an environment…</option>
          {#each data.environments as env (env.id)}
            <option value={env.id as string}>
              {(env.name as string | null | undefined) ?? (env.id as string)}
            </option>
          {/each}
        </select>
        {#if data.environments.length === 0}
          <p class="form-field__hint">No environments found. Create one first.</p>
        {/if}
      </div>
    </section>

    <!-- ── Prompt ── -->
    <section class="form-section">
      <div class="form-section__heading">Prompt</div>
      <div class="form-group">
        <label class="form-field__label" for="task-prompt">
          Prompt Template <span class="form-field__required">*</span>
        </label>
        <p class="form-field__hint">
          Use dynamic variables to personalise each run. The agent receives this prompt at each scheduled execution.
        </p>
        <PromptTemplateEditor
          value={promptTemplate}
          onchange={(v) => { promptTemplate = v; }}
        />
      </div>
    </section>

    <!-- ── Schedule ── -->
    <section class="form-section">
      <div class="form-section__heading">Schedule</div>
      <div class="form-group">
        <SchedulePresetPicker
          preset={schedulePreset}
          hour={scheduleHour}
          minute={scheduleMinute}
          dayOfWeek={scheduleDayOfWeek}
          dayOfMonth={scheduleDayOfMonth}
          onchange={handleScheduleChange}
        />
      </div>
      <div class="form-group">
        <label class="form-field__label" for="task-timezone">Timezone</label>
        <input
          id="task-timezone"
          type="text"
          class="form-field__input"
          bind:value={timezone}
          placeholder="e.g. America/New_York"
          autocomplete="off"
        />
        <p class="form-field__hint">IANA timezone identifier. Defaults to your browser's detected timezone.</p>
      </div>
    </section>

    <!-- ── Session Mode ── -->
    <section class="form-section">
      <div class="form-section__heading">Session Mode</div>
      <p class="form-section__desc">
        Choose how the agent manages sessions across scheduled runs.
      </p>
      <div class="radio-cards">
        <label class="radio-card" class:radio-card--selected={sessionMode === 'new_session'}>
          <input
            type="radio"
            name="session-mode"
            value="new_session"
            bind:group={sessionMode}
            class="radio-card__input"
          />
          <div class="radio-card__body">
            <span class="radio-card__title">New session each run</span>
            <span class="radio-card__desc">
              Each execution starts a fresh session with no prior context. Best for independent, self-contained tasks.
            </span>
          </div>
        </label>

        <label class="radio-card" class:radio-card--selected={sessionMode === 'continue_session'}>
          <input
            type="radio"
            name="session-mode"
            value="continue_session"
            bind:group={sessionMode}
            class="radio-card__input"
          />
          <div class="radio-card__body">
            <span class="radio-card__title">Continue in same session</span>
            <span class="radio-card__desc">
              All runs reuse the same session, preserving conversation history. Best for ongoing tasks that build on prior context.
            </span>
          </div>
        </label>
      </div>
    </section>

    <!-- ── Actions ── -->
    <div class="form-actions">
      <a href="/scheduled-tasks" class="btn-cancel">Cancel</a>
      <button type="submit" class="btn-submit" disabled={submitting}>
        {#if submitting}
          <svg class="btn-submit__spinner" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="10"/>
          </svg>
          Creating…
        {:else}
          Create Task
        {/if}
      </button>
    </div>

  </form>
</div>

<style lang="scss">
  .new-task-page {
    max-width: 720px;

    &__header {
      margin-bottom: var(--space-9);
    }

    &__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      color: var(--text-primary);
      line-height: var(--leading-tight);
    }

    &__subtitle {
      font-size: var(--text-sm);
      color: var(--text-muted);
      margin-top: var(--space-2);
    }
  }

  /* ── Error banner ── */
  .error-banner {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-5) var(--space-6);
    margin-bottom: var(--space-7);
    background: var(--accent-danger-muted);
    color: var(--accent-danger);
    border: 1px solid var(--accent-danger);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  /* ── Form sections ── */
  .task-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-9);
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-8);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);

    &__heading {
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.07em;
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border-subtle);
    }

    &__desc {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin-top: calc(-1 * var(--space-3));
    }
  }

  /* ── Form groups and fields ── */
  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .form-field {
    &__label {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-secondary);
    }

    &__required {
      color: var(--accent-danger);
      margin-left: var(--space-1);
    }

    &__hint {
      font-size: var(--text-xs);
      color: var(--text-muted);
      line-height: var(--leading-relaxed);
    }

    &__input {
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
      &:focus {
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 3px var(--accent-primary-muted);
      }
    }

    &__select {
      width: 100%;
      padding: var(--space-4) var(--space-9) var(--space-4) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--surface-0);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b6b80' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right var(--space-5) center;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      outline: none;
      appearance: none;
      cursor: pointer;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

      &:hover { border-color: var(--border-strong); }
      &:focus {
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 3px var(--accent-primary-muted);
      }
    }
  }

  /* ── Radio cards ── */
  .radio-cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .radio-card {
    display: flex;
    align-items: flex-start;
    gap: var(--space-5);
    padding: var(--space-6);
    background: var(--surface-0);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

    &:hover {
      border-color: var(--border-strong);
    }

    &--selected {
      border-color: var(--accent-primary);
      background: var(--accent-primary-muted);
      box-shadow: 0 0 0 1px var(--accent-primary);
    }

    &__input {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      margin-top: 2px;
      accent-color: var(--accent-primary);
      cursor: pointer;
    }

    &__body {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    &__title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      line-height: var(--leading-tight);
    }

    &__desc {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      line-height: var(--leading-relaxed);
    }
  }

  /* ── Actions ── */
  .form-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-4);
    padding-top: var(--space-6);
    border-top: 1px solid var(--border-subtle);
  }

  .btn-cancel {
    display: inline-flex;
    align-items: center;
    padding: var(--space-4) var(--space-6);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--text-primary);
    background: var(--surface-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: background var(--transition-fast), border-color var(--transition-fast);

    &:hover {
      background: var(--surface-3);
      border-color: var(--border-strong);
    }
  }

  .btn-submit {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: #fff;
    background: var(--accent-primary);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--transition-fast), box-shadow var(--transition-fast);

    &:hover:not(:disabled) {
      background: var(--accent-primary-hover);
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
    }

    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    &__spinner {
      animation: spin 0.75s linear infinite;
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 640px) {
    .radio-cards {
      flex-direction: column;
    }

    .form-actions {
      flex-direction: column-reverse;
      align-items: stretch;
    }

    .btn-cancel,
    .btn-submit {
      justify-content: center;
    }
  }
</style>
