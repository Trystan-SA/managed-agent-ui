export interface SchedulePreset {
  key: string;
  label: string;
  cron: string | null; // null = needs user input for time/day
  needsTime: boolean;
  needsDay: boolean;
  needsDayOfMonth: boolean;
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  { key: 'every_15m', label: 'Every 15 minutes', cron: '*/15 * * * *', needsTime: false, needsDay: false, needsDayOfMonth: false },
  { key: 'every_30m', label: 'Every 30 minutes', cron: '*/30 * * * *', needsTime: false, needsDay: false, needsDayOfMonth: false },
  { key: 'every_1h', label: 'Every hour', cron: '0 * * * *', needsTime: false, needsDay: false, needsDayOfMonth: false },
  { key: 'every_2h', label: 'Every 2 hours', cron: '0 */2 * * *', needsTime: false, needsDay: false, needsDayOfMonth: false },
  { key: 'every_6h', label: 'Every 6 hours', cron: '0 */6 * * *', needsTime: false, needsDay: false, needsDayOfMonth: false },
  { key: 'daily', label: 'Daily at...', cron: null, needsTime: true, needsDay: false, needsDayOfMonth: false },
  { key: 'weekdays', label: 'Weekdays at...', cron: null, needsTime: true, needsDay: false, needsDayOfMonth: false },
  { key: 'weekly', label: 'Weekly on...', cron: null, needsTime: true, needsDay: true, needsDayOfMonth: false },
  { key: 'monthly', label: 'Monthly on...', cron: null, needsTime: true, needsDay: false, needsDayOfMonth: true }
];

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export function buildCronExpression(
  presetKey: string,
  hour?: number,
  minute?: number,
  dayOfWeek?: number,
  dayOfMonth?: number
): string {
  const preset = SCHEDULE_PRESETS.find(p => p.key === presetKey);
  if (!preset) throw new Error(`Unknown preset: ${presetKey}`);
  if (preset.cron) return preset.cron;

  const h = hour ?? 0;
  const m = minute ?? 0;

  switch (presetKey) {
    case 'daily':
      return `${m} ${h} * * *`;
    case 'weekdays':
      return `${m} ${h} * * 1-5`;
    case 'weekly':
      return `${m} ${h} * * ${dayOfWeek ?? 1}`;
    case 'monthly':
      return `${m} ${h} ${dayOfMonth ?? 1} * *`;
    default:
      throw new Error(`Unhandled preset: ${presetKey}`);
  }
}

export function getPresetLabel(presetKey: string): string {
  const preset = SCHEDULE_PRESETS.find(p => p.key === presetKey);
  return preset?.label ?? presetKey;
}
