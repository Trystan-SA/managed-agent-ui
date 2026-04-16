<script lang="ts">
  import { SCHEDULE_PRESETS, DAYS_OF_WEEK } from '$lib/schedule-presets';

  const {
    preset,
    hour,
    minute,
    dayOfWeek,
    dayOfMonth,
    onchange
  }: {
    preset: string;
    hour: number;
    minute: number;
    dayOfWeek: number;
    dayOfMonth: number;
    onchange: (values: {
      preset: string;
      hour: number;
      minute: number;
      dayOfWeek: number;
      dayOfMonth: number;
    }) => void;
  } = $props();

  const selectedPreset = $derived(
    SCHEDULE_PRESETS.find(p => p.key === preset) ?? SCHEDULE_PRESETS[0]
  );

  const MINUTE_OPTIONS = [0, 15, 30, 45];

  function emit(overrides: Partial<{
    preset: string;
    hour: number;
    minute: number;
    dayOfWeek: number;
    dayOfMonth: number;
  }>) {
    onchange({
      preset,
      hour,
      minute,
      dayOfWeek,
      dayOfMonth,
      ...overrides
    });
  }
</script>

<div class="schedule-preset-picker">
  <div class="schedule-preset-picker__row">
    <label class="schedule-preset-picker__label" for="spp-preset">
      Frequency
    </label>
    <select
      id="spp-preset"
      class="schedule-preset-picker__select"
      value={preset}
      onchange={(e) => emit({ preset: (e.currentTarget as HTMLSelectElement).value })}
    >
      {#each SCHEDULE_PRESETS as p (p.key)}
        <option value={p.key}>{p.label}</option>
      {/each}
    </select>
  </div>

  {#if selectedPreset.needsTime}
    <div class="schedule-preset-picker__row">
      <label class="schedule-preset-picker__label" for="spp-hour">
        Time
      </label>
      <div class="schedule-preset-picker__time">
        <select
          id="spp-hour"
          class="schedule-preset-picker__select schedule-preset-picker__select--narrow"
          value={hour}
          onchange={(e) => emit({ hour: Number((e.currentTarget as HTMLSelectElement).value) })}
        >
          {#each Array.from({ length: 24 }, (_, i) => i) as h (h)}
            <option value={h}>{String(h).padStart(2, '0')}</option>
          {/each}
        </select>
        <span class="schedule-preset-picker__colon">:</span>
        <select
          id="spp-minute"
          class="schedule-preset-picker__select schedule-preset-picker__select--narrow"
          value={minute}
          onchange={(e) => emit({ minute: Number((e.currentTarget as HTMLSelectElement).value) })}
        >
          {#each MINUTE_OPTIONS as m (m)}
            <option value={m}>{String(m).padStart(2, '0')}</option>
          {/each}
        </select>
      </div>
    </div>
  {/if}

  {#if selectedPreset.needsDay}
    <div class="schedule-preset-picker__row">
      <label class="schedule-preset-picker__label" for="spp-dow">
        Day of week
      </label>
      <select
        id="spp-dow"
        class="schedule-preset-picker__select"
        value={dayOfWeek}
        onchange={(e) => emit({ dayOfWeek: Number((e.currentTarget as HTMLSelectElement).value) })}
      >
        {#each DAYS_OF_WEEK as day (day.value)}
          <option value={day.value}>{day.label}</option>
        {/each}
      </select>
    </div>
  {/if}

  {#if selectedPreset.needsDayOfMonth}
    <div class="schedule-preset-picker__row">
      <label class="schedule-preset-picker__label" for="spp-dom">
        Day of month
      </label>
      <select
        id="spp-dom"
        class="schedule-preset-picker__select schedule-preset-picker__select--narrow"
        value={dayOfMonth}
        onchange={(e) => emit({ dayOfMonth: Number((e.currentTarget as HTMLSelectElement).value) })}
      >
        {#each Array.from({ length: 28 }, (_, i) => i + 1) as d (d)}
          <option value={d}>{d}</option>
        {/each}
      </select>
    </div>
  {/if}
</div>

<style lang="scss">
  @use '../styles/mixins' as *;

  .schedule-preset-picker {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);

    &__row {
      display: flex;
      align-items: center;
      gap: var(--space-5);
    }

    &__label {
      flex-shrink: 0;
      width: 7rem;
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-secondary);
    }

    &__time {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    &__colon {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-secondary);
      line-height: 1;
    }

    &__select {
      @include input;
      width: auto;
      min-width: 9rem;
      cursor: pointer;
      appearance: auto;

      &--narrow {
        min-width: 4.5rem;
      }
    }
  }
</style>
