import { describe, it, expect } from 'vitest';
import { renderTemplate } from '$lib/server/template';

describe('renderTemplate', () => {
  it('replaces {{date}} with YYYY-MM-DD in given timezone', () => {
    const result = renderTemplate('Report for {{date}}', {
      timezone: 'UTC',
      runNumber: 1,
      taskName: 'Test'
    });
    expect(result).toMatch(/Report for \d{4}-\d{2}-\d{2}/);
  });

  it('replaces {{time}} with HH:mm', () => {
    const result = renderTemplate('Run at {{time}}', {
      timezone: 'UTC',
      runNumber: 1,
      taskName: 'Test'
    });
    expect(result).toMatch(/Run at \d{2}:\d{2}/);
  });

  it('replaces {{datetime}} with full ISO datetime', () => {
    const result = renderTemplate('Generated {{datetime}}', {
      timezone: 'UTC',
      runNumber: 1,
      taskName: 'Test'
    });
    expect(result).toMatch(/Generated \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('replaces {{run_number}} with the run count', () => {
    const result = renderTemplate('Run #{{run_number}}', {
      timezone: 'UTC',
      runNumber: 42,
      taskName: 'Test'
    });
    expect(result).toBe('Run #42');
  });

  it('replaces {{task_name}} with the task name', () => {
    const result = renderTemplate('Task: {{task_name}}', {
      timezone: 'UTC',
      runNumber: 1,
      taskName: 'Daily Sales Report'
    });
    expect(result).toBe('Task: Daily Sales Report');
  });

  it('handles multiple variables in one template', () => {
    const result = renderTemplate('{{task_name}} run #{{run_number}} on {{date}}', {
      timezone: 'UTC',
      runNumber: 5,
      taskName: 'My Task'
    });
    expect(result).toMatch(/My Task run #5 on \d{4}-\d{2}-\d{2}/);
  });

  it('leaves unknown variables untouched', () => {
    const result = renderTemplate('Hello {{unknown}}', {
      timezone: 'UTC',
      runNumber: 1,
      taskName: 'Test'
    });
    expect(result).toBe('Hello {{unknown}}');
  });

  it('handles template with no variables', () => {
    const result = renderTemplate('Plain prompt with no vars', {
      timezone: 'UTC',
      runNumber: 1,
      taskName: 'Test'
    });
    expect(result).toBe('Plain prompt with no vars');
  });
});
