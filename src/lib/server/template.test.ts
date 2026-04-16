import { describe, it, expect } from 'vitest';
import { renderTemplate } from '$lib/server/template';

describe('renderTemplate', () => {
  it('replaces {{date}} with YYYY-MM-DD in given timezone', () => {
    const result = renderTemplate('Report for {{date}}', {
      timezone: 'UTC',
      runNumber: 1
    });
    expect(result).toMatch(/Report for \d{4}-\d{2}-\d{2}/);
  });

  it('replaces {{time}} with HH:mm', () => {
    const result = renderTemplate('Run at {{time}}', {
      timezone: 'UTC',
      runNumber: 1
    });
    expect(result).toMatch(/Run at \d{2}:\d{2}/);
  });

  it('replaces {{datetime}} with full ISO datetime', () => {
    const result = renderTemplate('Generated {{datetime}}', {
      timezone: 'UTC',
      runNumber: 1
    });
    expect(result).toMatch(/Generated \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('replaces {{run_number}} with the run count', () => {
    const result = renderTemplate('Run #{{run_number}}', {
      timezone: 'UTC',
      runNumber: 42
    });
    expect(result).toBe('Run #42');
  });

  it('handles multiple variables in one template', () => {
    const result = renderTemplate('Run #{{run_number}} on {{date}}', {
      timezone: 'UTC',
      runNumber: 5
    });
    expect(result).toMatch(/Run #5 on \d{4}-\d{2}-\d{2}/);
  });

  it('leaves unknown variables untouched', () => {
    const result = renderTemplate('Hello {{unknown}}', {
      timezone: 'UTC',
      runNumber: 1
    });
    expect(result).toBe('Hello {{unknown}}');
  });

  it('handles template with no variables', () => {
    const result = renderTemplate('Plain prompt with no vars', {
      timezone: 'UTC',
      runNumber: 1
    });
    expect(result).toBe('Plain prompt with no vars');
  });
});
