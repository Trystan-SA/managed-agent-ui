# ManagedAgentUI Dashboard — Design Spec

## Overview

A full-featured SvelteKit web application for managing Anthropic Managed Agents. The app provides a dashboard, CRUD management for agents/environments/sessions, a real-time chat interface with SSE streaming, an event timeline viewer, and agent version history. Multi-user, each user brings their own Anthropic API key.

## Stack

- **SvelteKit** (Node adapter) — monolith handling UI + API routes
- **Postgres** — user data, encrypted API keys, bookmarks, preferences
- **Drizzle ORM** — type-safe database access
- **Custom SCSS** — design tokens, mixins, component modules (DRY)
- **Docker Compose** — Postgres + SvelteKit app containers

## Architecture

```
┌─────────────────────────────────────────────┐
│  Docker Compose                             │
│  ┌──────────────────────┐  ┌─────────────┐ │
│  │  SvelteKit App       │  │  Postgres   │ │
│  │  (Node adapter)      │──│  5432       │ │
│  │  Port 3000           │  └─────────────┘ │
│  │                      │                   │
│  │  ┌────────────────┐  │                   │
│  │  │ Server routes   │──│──► Anthropic API │
│  │  │ /api/*          │  │    (proxied)     │
│  │  └────────────────┘  │                   │
│  │  ┌────────────────┐  │                   │
│  │  │ Pages/UI        │  │                   │
│  │  │ SSR + CSR       │  │                   │
│  │  └────────────────┘  │                   │
│  └──────────────────────┘                   │
└─────────────────────────────────────────────┘
```

All Anthropic API calls go through SvelteKit server routes. API keys never reach the browser. SSE streaming is proxied from Anthropic through SvelteKit's streaming response API.

## Data Model

### users
| Column     | Type      | Notes          |
|------------|-----------|----------------|
| id         | uuid      | PK             |
| email      | text      | unique         |
| password   | text      | bcrypt hashed  |
| created_at | timestamp |                |
| updated_at | timestamp |                |

### api_keys
| Column        | Type   | Notes                  |
|---------------|--------|------------------------|
| id            | uuid   | PK                     |
| user_id       | uuid   | FK → users, unique     |
| encrypted_key | bytea  | AES-256-GCM encrypted  |
| iv            | bytea  | initialization vector  |
| label         | text   | optional display label |
| created_at    | timestamp |                     |
| updated_at    | timestamp |                     |

### agent_bookmarks
| Column     | Type    | Notes              |
|------------|---------|--------------------|
| id         | uuid    | PK                 |
| user_id    | uuid    | FK → users         |
| agent_id   | text    | Anthropic agent ID |
| nickname   | text    | optional           |
| pinned     | boolean | default false      |
| created_at | timestamp |                  |

### env_bookmarks
| Column     | Type    | Notes                |
|------------|---------|----------------------|
| id         | uuid    | PK                   |
| user_id    | uuid    | FK → users           |
| env_id     | text    | Anthropic env ID     |
| nickname   | text    | optional             |
| pinned     | boolean | default false        |
| created_at | timestamp |                    |

### session_bookmarks
| Column     | Type    | Notes                  |
|------------|---------|------------------------|
| id         | uuid    | PK                     |
| user_id    | uuid    | FK → users             |
| session_id | text    | Anthropic session ID   |
| nickname   | text    | optional               |
| pinned     | boolean | default false          |
| created_at | timestamp |                      |

### user_preferences
| Column           | Type   | Notes          |
|------------------|--------|----------------|
| id               | uuid   | PK             |
| user_id          | uuid   | FK → users, unique |
| theme            | text   | 'light'/'dark' |
| default_agent_id | text   | optional       |
| default_env_id   | text   | optional       |
| created_at       | timestamp |              |
| updated_at       | timestamp |              |

Source of truth for agents, environments, and sessions is the Anthropic API. Bookmark tables let users organize resources locally.

## Authentication

- Email/password registration and login
- Passwords hashed with bcrypt
- Session-based auth via secure HTTP-only cookies
- API keys encrypted with AES-256-GCM (encryption key from `ENCRYPTION_KEY` env var)
- Shared `createAnthropicClient(userId)` helper: reads cookie → decrypts API key → returns SDK client

## Pages & Routes

### Public
- `/login` — email/password login
- `/register` — create account + enter API key

### Dashboard
- `/dashboard` — overview: agent count, environment count, active sessions, recent activity

### Agents
- `/agents` — list all agents (from Anthropic API)
- `/agents/new` — create agent form (name, model, system prompt, tools config)
- `/agents/[id]` — detail: config, version history, sessions using this agent
- `/agents/[id]/edit` — edit agent (bumps version)

### Environments
- `/environments` — list all environments
- `/environments/new` — create form (name, networking mode, packages)
- `/environments/[id]` — detail: config, sessions using it
- `/environments/[id]/edit` — edit environment

### Sessions
- `/sessions` — list all sessions with status badges (idle/running/rescheduling/terminated)
- `/sessions/[id]` — session detail: full event timeline, status, agent/env info

### Chat
- `/chat` — start a new session (pick agent + env) or resume an existing idle session
- `/chat/[sessionId]` — live chat interface

### Settings
- `/settings` — manage API key, preferences, theme

## Chat UI Features

- Real-time SSE streaming with token-by-token rendering
- Tool use shown as collapsible cards (tool name, input, result)
- Thinking blocks shown as collapsible dimmed sections
- Interrupt button sends `user.interrupt` event
- Status indicator (idle/running) in the header
- Session picker sidebar

## API Proxy Layer

```
src/routes/api/
├── auth/
│   ├── login/+server.ts
│   ├── register/+server.ts
│   └── logout/+server.ts
├── agents/
│   ├── +server.ts              — GET list, POST create
│   ├── [id]/+server.ts         — GET retrieve, PUT update
│   ├── [id]/archive/+server.ts — POST archive
│   └── [id]/versions/+server.ts — GET versions
├── environments/
│   ├── +server.ts              — GET list, POST create
│   ├── [id]/+server.ts         — GET retrieve, PUT update
│   ├── [id]/archive/+server.ts — POST archive
│   └── [id]/delete/+server.ts  — DELETE
├── sessions/
│   ├── +server.ts              — GET list, POST create
│   ├── [id]/+server.ts         — GET retrieve
│   ├── [id]/archive/+server.ts — POST archive
│   ├── [id]/delete/+server.ts  — DELETE
│   ├── [id]/events/+server.ts  — POST send events
│   └── [id]/stream/+server.ts  — GET SSE stream (proxied)
└── settings/
    └── api-key/+server.ts      — PUT update, DELETE remove
```

Error responses from Anthropic normalized into consistent `{ error, status }` shapes.

## SCSS Architecture

```
src/styles/
├── _tokens.scss        — CSS custom properties (colors, spacing, radii, shadows, type scale)
├── _mixins.scss        — reusable mixins (responsive, truncate, card, input, button)
├── _reset.scss         — minimal CSS reset
├── _layout.scss        — global layout (nav, page shell, grid)
├── global.scss         — imports all partials
└── components/
    ├── _chat.scss
    ├── _event-card.scss
    ├── _form.scss
    ├── _table.scss
    ├── _badge.scss
    ├── _sidebar.scss
    └── _code-block.scss
```

DRY principles: all values defined once in tokens, shared patterns in mixins, components `@use` only what they need. Dark/light theme via `[data-theme]` token overrides.

## Anthropic API Coverage

### Agents
- Create, update (versioned), list, retrieve, archive
- Version history listing

### Environments
- Create, update, list, retrieve, archive, delete
- Networking config (unrestricted / limited with allowed_hosts)
- Package management (pip, npm, apt, cargo, gem, go)

### Sessions
- Create (with agent + env), list, retrieve, archive, delete
- Pin to specific agent version
- Status tracking: idle, running, rescheduling, terminated

### Events
- Send: user.message, user.interrupt, user.custom_tool_result, user.tool_confirmation
- Receive: agent.message, agent.thinking, agent.tool_use, agent.tool_result, agent.mcp_tool_use, agent.mcp_tool_result, agent.custom_tool_use, session.status_idle, session.status_running

## Docker Compose

Two services:
1. **postgres** — Postgres 16, persistent volume, exposed on 5432
2. **app** — SvelteKit built with Node adapter, depends on postgres, exposed on 3000

Environment variables:
- `DATABASE_URL` — Postgres connection string
- `ENCRYPTION_KEY` — 32-byte hex key for AES-256-GCM
- `SESSION_SECRET` — cookie signing secret
