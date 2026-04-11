<script lang="ts">
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import SchedulePresetPicker from '$components/SchedulePresetPicker.svelte';
  import PromptTemplateEditor from '$components/PromptTemplateEditor.svelte';

  const { data } = $props();

  const task = data.task;

  interface AgentItem {
    id: string;
    name: string;
  }

  interface EnvItem {
    id: string;
    name: string;
  }

  const agents = $derived((data.agents as unknown) as AgentItem[]);
  const environments = $derived((data.environments as unknown) as EnvItem[]);

  // Parse cron expression to recover hour/minute/dayOfWeek/dayOfMonth
  function parseCron(cron: string): { hour: number; minute: number; dayOfWeek: number; dayOfMonth: number } {
    const parts = cron.trim().split(/\s+/);
    // cron format: minute hour dom month dow
    const minute = parseInt(parts[0] ?? '0', 10) || 0;
    const hour = parseInt(parts[1] ?? '0', 10) || 0;
    const dom = parseInt(parts[2] ?? '1', 10) || 1;
    const dow = parseInt(parts[4] ?? '1', 10) || 1;
    return {
      hour: isNaN(hour) ? 0 : hour,
      minute: isNaN(minute) ? 0 : minute,
      dayOfWeek: isNaN(dow) ? 1 : dow,
      dayOfMonth: isNaN(dom) ? 1 : dom
    };
  }

  const parsed = parseCron(task.cronExpression);

  let name = $state(task.name as string);
  let description = $state((task.description ?? '') as string);
  let agentId = $state(task.agentId as string);
  let environmentId = $state(task.environmentId as string);
  let promptTemplate = $state(task.promptTemplate as string);
  let sessionMode = $state(task.sessionMode as string);
  let schedulePreset = $state(task.schedulePreset as string);
  let timezone = $state(task.timezone as string);
  let scheduleHour = $state(parsed.hour);
  let scheduleMinute = $state(parsed.minute);
  let scheduleDayOfWeek = $state(parsed.dayOfWeek);
  let scheduleDayOfMonth = $state(parsed.dayOfMonth);

  let submitting = $state(false);
  let errorMsg = $state('');

  const TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Vancouver',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Amsterdam',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Asia/Kolkata',
    'Australia/Sydney',
    'Pacific/Auckland'
  ];

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
    if (submitting) return;

    errorMsg = '';
    submitting = true;

    try {
      await apiFetch(`/api/scheduled-tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          agentId,
          environmentId,
          promptTemplate,
          schedulePreset,
          timezone,
          sessionMode,
          hour: scheduleHour,
          minute: scheduleMinute,
          dayOfWeek: scheduleDayOfWeek,
          dayOfMonth: scheduleDayOfMonth
        })
      });

      await goto(`/scheduled-tasks/${task.id}`);
    } catch (err: unknown) {
      errorMsg = err instanceof Error ? err.message : 'Failed to save task';
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Edit Task | Managed Agents</title>
</svelte:head>

<div class="edit-task">
  <div class="edit-task__header">
    <a href="/scheduled-tasks/{task.id}" class="back-link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Back to task
    </a>
    <h1 class="edit-task__title">Edit Task</h1>
    <p class="edit-task__subtitle">Update this scheduled task's configuration.</p>
  </div>

  {#if errorMsg}
    <div class="alert alert--error" role="alert">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 5v3.5M8 10.5h.007" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      {errorMsg}
    </div>
  {/if}

  <form class="task-form" onsubmit={handleSubmit}>
    <!-- Section 1: Identity -->
    <section class="form-section">
      <div class="form-section__label">
        <span class="form-section__number">1</span>
        Identity
      </div>
      <div class="form-section__card">
        <div class="field">
          <label class="field__label" for="task-name">
            Task Name <span class="field__req">*</span>
          </label>
          <input
            id="task-name"
            class="field__input"
            type="text"
            bind:value={name}
            required
            placeholder="e.g. Daily standup summary, Weekly report..."
            autocomplete="off"
          />
        </div>
        <div class="field">
          <label class="field__label" for="task-desc">Description</label>
          <input
            id="task-desc"
            class="field__input"
            type="text"
            bind:value={description}
            placeholder="Optional short description..."
            autocomplete="off"
          />
        </div>
      </div>
    </section>

    <!-- Section 2: Agent & Environment -->
    <section class="form-section">
      <div class="form-section__label">
        <span class="form-section__number">2</span>
        Target
      </div>
      <div class="form-section__card">
        <div class="field">
          <label class="field__label" for="task-agent">
            Agent <span class="field__req">*</span>
          </label>
          {#if agents.length === 0}
            <p class="field__hint field__hint--warn">No agents available. Check your API key in Settings.</p>
          {:else}
            <select id="task-agent" class="field__select" bind:value={agentId} required>
              <option value="" disabled>Select an agent...</option>
              {#each agents as agent (agent.id)}
                <option value={agent.id}>{agent.name}</option>
              {/each}
            </select>
          {/if}
        </div>
        <div class="field">
          <label class="field__label" for="task-env">
            Environment <span class="field__req">*</span>
          </label>
          {#if environments.length === 0}
            <p class="field__hint field__hint--warn">No environments available. Check your API key in Settings.</p>
          {:else}
            <select id="task-env" class="field__select" bind:value={environmentId} required>
              <option value="" disabled>Select an environment...</option>
              {#each environments as env (env.id)}
                <option value={env.id}>{env.name}</option>
              {/each}
            </select>
          {/if}
        </div>
      </div>
    </section>

    <!-- Section 3: Prompt Template -->
    <section class="form-section">
      <div class="form-section__label">
        <span class="form-section__number">3</span>
        Prompt
      </div>
      <div class="form-section__card">
        <div class="field">
          <label class="field__label" for="task-prompt">
            Prompt Template <span class="field__req">*</span>
          </label>
          <PromptTemplateEditor
            value={promptTemplate}
            onchange={(v) => (promptTemplate = v)}
          />
          <span class="field__hint">Use variables like &#123;&#123;date&#125;&#125;, &#123;&#123;time&#125;&#125;, or &#123;&#123;run_number&#125;&#125; to make the prompt dynamic.</span>
        </div>
      </div>
    </section>

    <!-- Section 4: Session Mode -->
    <section class="form-section">
      <div class="form-section__label">
        <span class="form-section__number">4</span>
        Session Mode
      </div>
      <div class="form-section__card">
        <div class="radio-cards">
          <label class="radio-card" class:radio-card--selected={sessionMode === 'new_session'}>
            <input type="radio" bind:group={sessionMode} value="new_session" />
            <div class="radio-card__content">
              <span class="radio-card__title">New Session</span>
              <span class="radio-card__desc">Start a fresh session for every run. Clean context each time.</span>
            </div>
          </label>
          <label class="radio-card" class:radio-card--selected={sessionMode === 'reuse_session'}>
            <input type="radio" bind:group={sessionMode} value="reuse_session" />
            <div class="radio-card__content">
              <span class="radio-card__title">Reuse Session</span>
              <span class="radio-card__desc">Continue the same session across runs. Builds context over time.</span>
            </div>
          </label>
        </div>
      </div>
    </section>

    <!-- Section 5: Schedule -->
    <section class="form-section">
      <div class="form-section__label">
        <span class="form-section__number">5</span>
        Schedule
      </div>
      <div class="form-section__card">
        <SchedulePresetPicker
          preset={schedulePreset}
          hour={scheduleHour}
          minute={scheduleMinute}
          dayOfWeek={scheduleDayOfWeek}
          dayOfMonth={scheduleDayOfMonth}
          onchange={handleScheduleChange}
        />
        <div class="field">
          <label class="field__label" for="task-tz">Timezone</label>
          <select id="task-tz" class="field__select" bind:value={timezone}>
            {#each TIMEZONES as tz (tz)}
              <option value={tz}>{tz}</option>
            {/each}
          </select>
        </div>
      </div>
    </section>

    <!-- Actions -->
    <div class="form-footer">
      <a href="/scheduled-tasks/{task.id}" class="btn--secondary">Cancel</a>
      <button
        type="submit"
        class="btn-save"
        disabled={submitting || !name.trim() || !agentId || !environmentId || !promptTemplate.trim()}
      >
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

<style lang="scss">
  .edit-task {
    max-width: 720px;
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

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-decoration: none;
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

  /* ---- Form ---- */
  .task-form {
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
    &__select {
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

    &__select {
      cursor: pointer;
      appearance: auto;
    }

    &__hint {
      font-size: var(--text-xs);
      color: var(--text-muted);

      &--warn {
        color: var(--accent-warning);
      }
    }
  }

  /* ---- Radio cards ---- */
  .radio-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .radio-card {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    padding: var(--space-5);
    background: var(--surface-0);
    border: 1.5px solid var(--border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast),
      box-shadow var(--transition-fast);

    input[type='radio'] {
      flex-shrink: 0;
      margin-top: 2px;
      accent-color: var(--accent-primary);
    }

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

    &__content {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    &__title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
    }

    &__desc {
      font-size: var(--text-xs);
      color: var(--text-muted);
      line-height: var(--leading-relaxed);
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
    text-decoration: none;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);

    &:hover {
      background: var(--surface-3);
      border-color: var(--border-strong);
    }
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

  @media (max-width: 640px) {
    .radio-cards {
      grid-template-columns: 1fr;
    }
  }
</style>
