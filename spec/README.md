# Specifications Index

Domain specifications for the ManagedAgentUI project. Each file covers one bounded context, chaptered with `X.X.X` numbering.

## Chapters

| Chapter | Domain | File |
|---------|--------|------|
| 1.0.0 | [Architecture & Overview](./1.0.0-architecture.md) | System architecture, stack, deployment |
| 2.0.0 | [Authentication & Security](./2.0.0-auth.md) | Roles, registration, login, invites, password reset, sessions |
| 3.0.0 | [Agent Management](./3.0.0-agents.md) | Agent CRUD, versioning, bookmarks |
| 4.0.0 | [Environment Management](./4.0.0-environments.md) | Environment CRUD, networking, packages |
| 5.0.0 | [Session Management](./5.0.0-sessions.md) | Session lifecycle, status tracking |
| 6.0.0 | [Chat & Real-time Streaming](./6.0.0-chat.md) | SSE streaming, event types, chat UI |
| 7.0.0 | [Dashboard](./7.0.0-dashboard.md) | Overview metrics, recent activity |
| 8.0.0 | [Settings & Preferences](./8.0.0-settings.md) | Global API key, user management, invites, SMTP, theme |
| 9.0.0 | [Design System](./9.0.0-design-system.md) | Tokens, components, theming, SCSS |
| 10.0.0 | [Connections (MCP & OAuth)](./10.0.0-connections.md) | Per-user MCP credentials, Anthropic vaults, OAuth flow |
| 11.0.0 | [Scheduled Tasks](./11.0.0-scheduled-tasks.md) | CRON-driven agent runs, executions, edit history |
