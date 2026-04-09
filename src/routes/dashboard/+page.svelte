<script lang="ts">
  let { data } = $props();

  function formatDate(dateStr: string): string {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  }

  function statusClass(status: string): string {
    switch (status) {
      case 'running':
        return 'badge--running';
      case 'idle':
        return 'badge--idle';
      case 'terminated':
        return 'badge--terminated';
      default:
        return 'badge--info';
    }
  }
</script>

<svelte:head>
  <title>Dashboard — Managed Agents</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1 class="page-header__title">Dashboard</h1>
    <p class="page-header__subtitle">Overview of your agents, environments, and sessions</p>
  </div>
</div>

{#if data.error}
  <div class="dashboard-notice">
    <div class="dashboard-notice__icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
    <div class="dashboard-notice__content">
      <p class="dashboard-notice__title">API key not configured</p>
      <p class="dashboard-notice__text">
        Add your Anthropic API key in <a href="/settings">Settings</a> to get started.
      </p>
    </div>
  </div>
{:else}
  <div class="grid grid--4">
    <a href="/agents" class="stat-card">
      <span class="stat-card__label">Agents</span>
      <span class="stat-card__value">{data.agentCount}</span>
      <span class="stat-card__link">View all &rarr;</span>
    </a>

    <a href="/environments" class="stat-card">
      <span class="stat-card__label">Environments</span>
      <span class="stat-card__value">{data.environmentCount}</span>
      <span class="stat-card__link">View all &rarr;</span>
    </a>

    <a href="/sessions" class="stat-card">
      <span class="stat-card__label">Total Sessions</span>
      <span class="stat-card__value">{data.sessionCount}</span>
      <span class="stat-card__link">View all &rarr;</span>
    </a>

    <a href="/sessions?status=running" class="stat-card" class:stat-card--active={data.activeSessions > 0}>
      <span class="stat-card__label">Active Sessions</span>
      <span class="stat-card__value">{data.activeSessions}</span>
      <span class="stat-card__link">View active &rarr;</span>
    </a>
  </div>

  <section class="dashboard-section">
    <div class="dashboard-section__header">
      <h2 class="dashboard-section__title">Recent Sessions</h2>
      <a href="/sessions" class="dashboard-section__link">View all</a>
    </div>

    {#if data.recentSessions.length > 0}
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Title / ID</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {#each data.recentSessions as session}
              <tr class="table__row--clickable" onclick={() => window.location.href = `/sessions/${session.id}`}>
                <td>
                  <span class="session-title">{session.title || session.id}</span>
                  {#if session.title}
                    <span class="session-id">{session.id}</span>
                  {/if}
                </td>
                <td>
                  <span class="badge {statusClass(session.status)}">
                    <span class="badge__dot"></span>
                    {session.status}
                  </span>
                </td>
                <td>{formatDate(session.created_at)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <div class="dashboard-empty">
        <p>No sessions yet. Start a chat to create your first session.</p>
      </div>
    {/if}
  </section>

  <section class="dashboard-actions">
    <h2 class="dashboard-section__title">Quick Actions</h2>
    <div class="dashboard-actions__row">
      <a href="/agents/new" class="btn btn--secondary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Agent
      </a>
      <a href="/environments/new" class="btn btn--secondary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Environment
      </a>
      <a href="/chat" class="btn btn--primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        New Chat
      </a>
    </div>
  </section>
{/if}

<style lang="scss">
  /* Stat cards */
  .stat-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-7);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    text-decoration: none;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast),
      transform var(--transition-fast);

    &:hover {
      border-color: var(--accent-primary);
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }

    &__label {
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    &__value {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      color: var(--text-primary);
      line-height: 1;
    }

    &__link {
      font-size: var(--text-xs);
      color: var(--text-muted);
      margin-top: var(--space-2);
      transition: color var(--transition-fast);
    }

    &:hover &__link {
      color: var(--accent-primary);
    }

    &--active {
      border-color: var(--accent-success);

      .stat-card__value {
        color: var(--accent-success);
      }

      &:hover {
        border-color: var(--accent-success-hover);
      }
    }
  }

  /* Notice / error state */
  .dashboard-notice {
    display: flex;
    align-items: flex-start;
    gap: var(--space-6);
    padding: var(--space-8);
    background: var(--accent-warning-muted);
    border: 1px solid var(--accent-warning);
    border-radius: var(--radius-lg);

    &__icon {
      color: var(--accent-warning);
      flex-shrink: 0;
      margin-top: var(--space-1);
    }

    &__title {
      font-size: var(--text-md);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
      margin-bottom: var(--space-2);
    }

    &__text {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      line-height: var(--leading-normal);

      a {
        color: var(--accent-primary);
        text-decoration: underline;
        text-underline-offset: 2px;

        &:hover {
          color: var(--accent-primary-hover);
        }
      }
    }
  }

  /* Sections */
  .dashboard-section {
    margin-top: var(--space-10);

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-6);
    }

    &__title {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
    }

    &__link {
      font-size: var(--text-sm);
      color: var(--accent-primary);
      text-decoration: none;

      &:hover {
        color: var(--accent-primary-hover);
        text-decoration: underline;
      }
    }
  }

  .dashboard-empty {
    padding: var(--space-10) var(--space-8);
    text-align: center;
    color: var(--text-muted);
    font-size: var(--text-sm);
    background: var(--surface-1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
  }

  /* Session table cells */
  .session-title {
    display: block;
    color: var(--text-primary);
    font-weight: var(--weight-medium);
  }

  .session-id {
    display: block;
    font-size: var(--text-xs);
    color: var(--text-muted);
    font-family: var(--font-mono);
    margin-top: var(--space-1);
  }

  /* Quick actions */
  .dashboard-actions {
    margin-top: var(--space-10);

    &__row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
      margin-top: var(--space-6);
    }
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    border-radius: var(--radius-md);
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast),
      border-color var(--transition-fast);

    &--primary {
      background: var(--accent-primary);
      color: #fff;
      border: 1px solid transparent;

      &:hover {
        background: var(--accent-primary-hover);
      }
    }

    &--secondary {
      background: var(--surface-2);
      color: var(--text-primary);
      border: 1px solid var(--border-default);

      &:hover {
        background: var(--surface-3);
        border-color: var(--border-strong);
      }
    }
  }
</style>
