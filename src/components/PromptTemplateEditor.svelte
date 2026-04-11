<script lang="ts">
  const {
    value,
    onchange
  }: {
    value: string;
    onchange: (newValue: string) => void;
  } = $props();

  interface TemplateVariable {
    label: string;
    token: string;
  }

  const VARIABLES: TemplateVariable[] = [
    { label: 'Date', token: '{{date}}' },
    { label: 'Time', token: '{{time}}' },
    { label: 'DateTime', token: '{{datetime}}' },
    { label: 'Run #', token: '{{run_number}}' },
    { label: 'Task Name', token: '{{task_name}}' }
  ];

  let textareaEl: HTMLTextAreaElement | null = $state(null);

  function insertVariable(token: string) {
    if (!textareaEl) {
      onchange(value + token);
      return;
    }

    const start = textareaEl.selectionStart ?? value.length;
    const end = textareaEl.selectionEnd ?? value.length;
    const newValue = value.slice(0, start) + token + value.slice(end);

    onchange(newValue);

    // Restore cursor after the inserted token on next tick
    const cursorPos = start + token.length;
    requestAnimationFrame(() => {
      if (textareaEl) {
        textareaEl.focus();
        textareaEl.setSelectionRange(cursorPos, cursorPos);
      }
    });
  }
</script>

<div class="prompt-editor">
  <div class="prompt-editor__toolbar">
    <span class="prompt-editor__toolbar-label">Insert variable:</span>
    <div class="prompt-editor__vars">
      {#each VARIABLES as variable (variable.token)}
        <button
          type="button"
          class="prompt-editor__var-btn"
          onclick={() => insertVariable(variable.token)}
        >
          {variable.label}
        </button>
      {/each}
    </div>
  </div>
  <textarea
    bind:this={textareaEl}
    class="prompt-editor__textarea"
    {value}
    placeholder="Enter your prompt. Use the buttons above to insert dynamic variables like &#123;&#123;date&#125;&#125; or &#123;&#123;task_name&#125;&#125;."
    rows="8"
    oninput={(e) => onchange((e.currentTarget as HTMLTextAreaElement).value)}
  ></textarea>
</div>

<style lang="scss">
  @use '../styles/mixins' as *;

  .prompt-editor {
    display: flex;
    flex-direction: column;

    &__toolbar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
      background: var(--surface-2);
      border: 1px solid var(--border-default);
      border-bottom: none;
      border-radius: var(--radius-md) var(--radius-md) 0 0;
    }

    &__toolbar-label {
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--text-muted);
      white-space: nowrap;
    }

    &__vars {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    &__var-btn {
      display: inline-flex;
      align-items: center;
      padding: var(--space-1) var(--space-3);
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--accent-primary);
      background: var(--accent-primary-muted);
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      cursor: pointer;
      white-space: nowrap;
      transition: background var(--transition-fast), border-color var(--transition-fast),
        color var(--transition-fast);

      &:hover {
        background: var(--surface-3);
        border-color: var(--border-default);
        color: var(--text-primary);
      }

      &:active {
        background: var(--accent-primary-muted);
        border-color: var(--accent-primary);
      }

      &:focus-visible {
        @include focus-ring;
      }
    }

    &__textarea {
      @include input;
      width: 100%;
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      line-height: var(--leading-relaxed);
      resize: vertical;
      min-height: 8rem;
      border-radius: 0 0 var(--radius-md) var(--radius-md);
    }
  }
</style>
