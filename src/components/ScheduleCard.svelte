<script lang="ts">
  import SchedulePresetPicker from './SchedulePresetPicker.svelte';
  import PromptTemplateEditor from './PromptTemplateEditor.svelte';
  import { getPresetLabel } from '$lib/schedule-presets';

  interface ScheduleData {
    id?: string;
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

  const {
    schedule,
    index,
    onchange,
    onremove
  }: {
    schedule: ScheduleData;
    index: number;
    onchange: (updated: ScheduleData) => void;
    onremove: () => void;
  } = $props();

  let collapsed = $state(false);
  let showRemoveConfirm = $state(false);

  const summaryLabel = $derived(() => {
    const preset = getPresetLabel(schedule.schedulePreset);
    const time = schedule.hour !== undefined
      ? `${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`
      : '';
    const parts = [preset, time, schedule.timezone].filter(Boolean);
    return parts.join(' · ');
  });

  function update(overrides: Partial<ScheduleData>) {
    onchange({ ...schedule, ...overrides });
  }

  function handleScheduleChange(values: {
    preset: string;
    hour: number;
    minute: number;
    dayOfWeek: number;
    dayOfMonth: number;
  }) {
    update({
      schedulePreset: values.preset,
      hour: values.hour,
      minute: values.minute,
      dayOfWeek: values.dayOfWeek,
      dayOfMonth: values.dayOfMonth
    });
  }

  function confirmRemove() {
    showRemoveConfirm = false;
    onremove();
  }
</script>

<div class="schedule-card" class:schedule-card--collapsed={collapsed}>
  <div class="schedule-card__header">
    <button
      type="button"
      class="schedule-card__toggle"
      onclick={() => (collapsed = !collapsed)}
      aria-expanded={!collapsed}
    >
      <svg class="schedule-card__chevron" width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="schedule-card__label">Schedule {index + 1}</span>
      <span class="schedule-card__summary">{summaryLabel()}</span>
    </button>
    <div class="schedule-card__actions">
      <label class="schedule-card__enabled-toggle" title={schedule.enabled ? 'Enabled' : 'Disabled'}>
        <input
          type="checkbox"
          checked={schedule.enabled}
          onchange={() => update({ enabled: !schedule.enabled })}
        />
        <span class="schedule-card__enabled-dot" class:schedule-card__enabled-dot--on={schedule.enabled}></span>
      </label>
      {#if showRemoveConfirm}
        <span class="schedule-card__confirm-remove">
          Remove?
          <button type="button" class="schedule-card__confirm-btn schedule-card__confirm-btn--yes" onclick={confirmRemove}>Yes</button>
          <button type="button" class="schedule-card__confirm-btn schedule-card__confirm-btn--no" onclick={() => (showRemoveConfirm = false)}>No</button>
        </span>
      {:else}
        <button
          type="button"
          class="schedule-card__remove"
          title="Remove schedule"
          onclick={() => (showRemoveConfirm = true)}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M4 4v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4M6 2h4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      {/if}
    </div>
  </div>

  {#if !collapsed}
    <div class="schedule-card__body">
      <!-- Prompt Template -->
      <div class="schedule-card__field">
        <label class="schedule-card__field-label">Prompt Template</label>
        <PromptTemplateEditor
          value={schedule.promptTemplate}
          onchange={(v) => update({ promptTemplate: v })}
        />
      </div>

      <!-- Schedule -->
      <div class="schedule-card__field">
        <label class="schedule-card__field-label">Schedule</label>
        <SchedulePresetPicker
          preset={schedule.schedulePreset}
          hour={schedule.hour}
          minute={schedule.minute}
          dayOfWeek={schedule.dayOfWeek}
          dayOfMonth={schedule.dayOfMonth}
          onchange={handleScheduleChange}
        />
      </div>

      <!-- Timezone -->
      <div class="schedule-card__field">
        <label class="schedule-card__field-label" for="tz-{index}">Timezone</label>
        <input
          id="tz-{index}"
          class="schedule-card__input"
          type="text"
          value={schedule.timezone}
          oninput={(e) => update({ timezone: (e.currentTarget as HTMLInputElement).value })}
        />
      </div>

      <!-- Session Mode -->
      <div class="schedule-card__field">
        <label class="schedule-card__field-label">Session Mode</label>
        <div class="schedule-card__radios">
          <label class="schedule-card__radio">
            <input
              type="radio"
              name="session-mode-{index}"
              value="new_session"
              checked={schedule.sessionMode === 'new_session'}
              onchange={() => update({ sessionMode: 'new_session' })}
            />
            <span>New session each run</span>
          </label>
          <label class="schedule-card__radio">
            <input
              type="radio"
              name="session-mode-{index}"
              value="continue_session"
              checked={schedule.sessionMode === 'continue_session'}
              onchange={() => update({ sessionMode: 'continue_session' })}
            />
            <span>Continue existing session</span>
          </label>
        </div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .schedule-card {
    background: var(--surface-0);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
    transition: border-color var(--transition-fast);

    &:hover {
      border-color: var(--border-strong);
    }

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-5);
      gap: var(--space-3);
    }

    &__toggle {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      background: none;
      border: none;
      cursor: pointer;
      font-family: var(--font-sans);
      flex: 1;
      min-width: 0;
      text-align: left;
    }

    &__chevron {
      flex-shrink: 0;
      color: var(--text-muted);
      transition: transform var(--transition-fast);
    }

    &:not(.schedule-card--collapsed) .schedule-card__chevron {
      transform: rotate(90deg);
    }

    &__label {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      white-space: nowrap;
    }

    &__summary {
      font-size: var(--text-xs);
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-shrink: 0;
    }

    &__enabled-toggle {
      display: flex;
      align-items: center;
      cursor: pointer;

      input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
      }
    }

    &__enabled-dot {
      width: 10px;
      height: 10px;
      border-radius: var(--radius-full);
      background: var(--border-strong);
      transition: background var(--transition-fast);

      &--on {
        background: var(--accent-success);
      }
    }

    &__remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: none;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--text-muted);
      transition: color var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast);

      &:hover {
        color: var(--accent-danger);
        background: var(--accent-danger-muted);
        border-color: var(--accent-danger);
      }
    }

    &__confirm-remove {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    &__confirm-btn {
      padding: var(--space-1) var(--space-3);
      font-family: var(--font-sans);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      cursor: pointer;

      &--yes {
        background: var(--accent-danger);
        color: #fff;
        &:hover { background: var(--accent-danger-hover); }
      }

      &--no {
        background: var(--surface-2);
        color: var(--text-primary);
        border-color: var(--border-default);
        &:hover { background: var(--surface-3); }
      }
    }

    &__body {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      padding: var(--space-5) var(--space-5) var(--space-6);
      border-top: 1px solid var(--border-subtle);
    }

    &__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    &__field-label {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-secondary);
    }

    &__input {
      width: 100%;
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      color: var(--text-primary);
      background: var(--surface-0);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      outline: none;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

      &:hover { border-color: var(--border-strong); }
      &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px var(--accent-primary-muted); }
    }

    &__radios {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    &__radio {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--text-sm);
      color: var(--text-secondary);
      cursor: pointer;

      input {
        accent-color: var(--accent-primary);
      }
    }
  }
</style>
