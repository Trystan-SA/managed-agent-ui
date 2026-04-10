interface TemplateContext {
  timezone: string;
  runNumber: number;
  taskName: string;
}

export function renderTemplate(template: string, ctx: TemplateContext): string {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ctx.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const dateParts = formatter.formatToParts(now);
  const year = dateParts.find(p => p.type === 'year')?.value ?? '';
  const month = dateParts.find(p => p.type === 'month')?.value ?? '';
  const day = dateParts.find(p => p.type === 'day')?.value ?? '';
  const dateStr = `${year}-${month}-${day}`;

  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ctx.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const timeStr = timeFormatter.format(now);

  const datetimeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ctx.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const dtParts = datetimeFormatter.formatToParts(now);
  const dtYear = dtParts.find(p => p.type === 'year')?.value ?? '';
  const dtMonth = dtParts.find(p => p.type === 'month')?.value ?? '';
  const dtDay = dtParts.find(p => p.type === 'day')?.value ?? '';
  const dtHour = dtParts.find(p => p.type === 'hour')?.value ?? '';
  const dtMinute = dtParts.find(p => p.type === 'minute')?.value ?? '';
  const dtSecond = dtParts.find(p => p.type === 'second')?.value ?? '';
  const datetimeStr = `${dtYear}-${dtMonth}-${dtDay}T${dtHour}:${dtMinute}:${dtSecond}`;

  const variables: Record<string, string> = {
    date: dateStr,
    time: timeStr,
    datetime: datetimeStr,
    run_number: String(ctx.runNumber),
    task_name: ctx.taskName
  };

  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return key in variables ? variables[key] : match;
  });
}
