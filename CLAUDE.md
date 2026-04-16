# ManagedAgentUI — Project Guide

## What This Is

A self-hosted SvelteKit dashboard for orchestrating Anthropic Managed Agents. Multi-user — the first registered account becomes admin, who manages a single global Anthropic API key shared across all users. Each user additionally maintains their own MCP connections (credentials live in per-user Anthropic vaults) and bookmarks.

## Architecture

**Monolith**: SvelteKit handles both SSR frontend and API routes. No separate backend service.

```
Browser → SvelteKit Pages (SSR + CSR)
       → SvelteKit API Routes → Anthropic API (proxied)
       → PostgreSQL (via Drizzle ORM)
```

**Source of truth**: Anthropic Managed Agents API documentation : https://platform.claude.com/docs/en/managed-agents/overview

**Security boundary**: API keys are AES-256-GCM encrypted at rest, decrypted server-side only. They never reach the browser. All Anthropic calls go through `/api/*` server routes.

## Principles

- **SOLID**: Each server route handles one resource. Components have single responsibilities. Database schema separates concerns (auth, keys, bookmarks, preferences).
- **DRY**: Design tokens defined once in `_tokens.scss`, shared patterns in `_mixins.scss`. `createAnthropicClient()` is the single path to the Anthropic SDK. Error handling normalized in one place.
- **DDD**: Domain boundaries map to route groups: auth, agents, environments, sessions, chat, dashboard, settings, connections, scheduled-tasks. Each domain owns its API routes and pages.

## Tech Stack

| Layer    | Technology                             |
| -------- | -------------------------------------- |
| Frontend | Svelte 5, SvelteKit 2.57, SCSS         |
| Backend  | SvelteKit server routes (Node adapter) |
| Database | PostgreSQL 16, Drizzle ORM 0.45        |
| API      | Anthropic SDK 0.86 (proxied)           |
| Auth     | bcrypt, AES-256-GCM, HTTP-only cookies |
| Infra    | Docker Compose, Node 22 Alpine         |

## Directory Structure

```
src/
├── components/              # Reusable Svelte 5 components (ChatView, Toaster, AgentMcpServers, ScheduleCard, …)
├── lib/
│   ├── server/              # Server-only code (NEVER import client-side)
│   │   ├── db/              # Drizzle schema + connection
│   │   ├── anthropic.ts     # SDK client factory
│   │   ├── auth.ts          # Password hashing, session management
│   │   ├── crypto.ts        # AES-256-GCM encryption
│   │   ├── oauth.ts         # OAuth client config + state + code exchange
│   │   ├── user-vault.ts    # getOrCreateUserVault — self-healing per-user vault pointer
│   │   ├── scheduler.ts     # In-process node-cron registry + computeNextRun
│   │   ├── scheduler-executor.ts # Per-task run pipeline (lock, validate, send, collect)
│   │   ├── template.ts      # Prompt-template renderer for scheduled tasks
│   │   ├── rate-limit.ts    # Simple in-memory rate limiter
│   │   └── email.ts         # Raw-socket SMTP client for invite delivery
│   ├── mcp-registry.ts      # Curated list of MCP services (client-safe, no secrets)
│   ├── schedule-presets.ts  # Preset catalog for the schedule UI
│   ├── stores/              # Svelte stores (theme, toast)
│   └── utils/               # Client-safe utilities (api, format, chatEvents)
├── routes/
│   ├── api/                 # REST API (one folder per domain)
│   ├── agents/              # Agent management pages (new, [id], [id]/edit)
│   ├── environments/        # Environment management pages
│   ├── chat/[id]/           # Single-session chat view (listing folded into /dashboard)
│   ├── connections/         # Per-user MCP connections page
│   ├── dashboard/           # Primary chat surface (session list + ChatView + new-chat form)
│   ├── settings/            # Tabbed settings (API key, appearance, account, users, OAuth providers)
│   ├── login/               # Login page
│   └── register/            # One-time setup
├── styles/                  # SCSS design system (tokens, mixins, component partials — all wired from global.scss)
└── hooks.server.ts          # Auth middleware + setup guard
spec/                        # Domain specifications (chaptered X.X.X)
drizzle/                     # Database migrations (latest: 0005 oauth)
docker/                      # Dockerfile(s), compose files, entrypoints
```

## Conventions

### Code Style

- TypeScript strict mode everywhere
- Svelte 5 reactive syntax (`$state`, `$derived`, `$effect`)
- Server-only imports under `$lib/server/` — SvelteKit enforces this boundary
- API routes return `{ error, status }` on failure, domain data on success

### Lint Rules (must pass `npm run lint`)

- **`prefer-const`**: Always use `const` for `$props()`, `$derived()`, and `$state()` bindings that are never reassigned: `const { data } = $props()`, `const x = $derived(...)`, `const x = $state(...)`
- **No `any` types**: Never use `any`. Use `Record<string, unknown>` for generic objects, `unknown` for catch variables, or define a local interface. For catch blocks: `catch (e: unknown)` with `if (e instanceof Error)` guard.
- **No unused imports/vars**: Remove all unused imports. For required-but-unused function params (e.g., SvelteKit `locals`), prefix with underscore: `_locals`.
- **`{#each}` blocks need keys**: Always add a key — `{#each items as item (item.id)}`. Use `(index)` only when no stable ID exists.
- **No empty blocks**: Add `// no-op` inside empty `catch {}` or other empty blocks.
- **`{@html}` requires disable comment**: Add `<!-- eslint-disable-next-line svelte/no-at-html-tags -->` before intentional `{@html}` usage.
- **No useless mustaches**: Don't wrap string literals in `{"..."}` — use plain text or HTML entities (`&#10;` for newlines in attributes).
- **Use `SvelteSet`/`SvelteMap`**: Import from `svelte/reactivity` instead of native `Set`/`Map` for reactive collections in Svelte 5 components.

### Database

- All tables use UUID primary keys (except `oauth_provider_configs.service_id` and `oauth_states.state`, which are natural text PKs)
- Timestamps: `created_at` (always), `updated_at` (where mutable)
- Bookmark tables are local metadata over Anthropic resources — never cache API responses in DB
- MCP credentials are **not** stored locally — they live in per-user Anthropic vaults; the DB only holds the vault pointer (`users.vault_id`)
- Secrets at rest (API key, SMTP password, OAuth client secret) are always stored as `(encrypted_*, *_iv)` pairs via `crypto.ts`
- Drizzle migrations in `/drizzle`, pushed via `drizzle-kit push`

### Styling

- **Always consult `spec/9.0.0-design-system.md` before making any UI changes** — it is the source of truth for colors, tokens, theming, and component patterns.
- **Light theme is the default.** Base tokens define the light palette. Dark theme is the override via `[data-theme="dark"]`.
- All values via CSS custom properties defined in `_tokens.scss`
- Component styles in `src/styles/components/` — one file per component type
- Use mixins from `_mixins.scss` for shared patterns (cards, inputs, buttons)
- Font stack: Inter (sans), JetBrains Mono (code)
- No hardcoded colors — always use semantic tokens (`--color-primary`, `--color-surface`, etc.)

### API Routes

- Each domain gets its own folder under `src/routes/api/`
- Auth check via `requireAuth()` helper in every protected route; admin routes check `locals.userRole === 'admin'`
- Anthropic client created per-request via `createAnthropicClient()` using the global API key
- SSE streaming proxied through `ReadableStream`
- Session creation (`POST /api/sessions`) auto-attaches the caller's vault via `getOrCreateUserVault()` so MCP credentials flow through without client changes
- User-facing toasts: trigger via `showToast(...)` from `$lib/stores/toast` — the global `Toaster` in the layout renders them (never mount a second toaster)

### Authentication

- One-time admin setup via `/register` (disabled after first user)
- Additional users onboarded via admin invite system
- Database-backed session store (`auth_sessions` table)
- Session cookies: HTTP-only, secure, SameSite=Lax, 7-day max age
- Two roles: `admin` (first user) and `member` (invited users)

## Domain Map

| Domain          | API Routes                                                                               | Pages                                    | Key Files                                                    |
| --------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| Auth            | `/api/auth/*`                                                                            | `/login`, `/register`, `/invite/[token]` | `auth.ts`, `crypto.ts`, `email.ts`, `hooks.server.ts`        |
| Admin           | `/api/admin/{users,invites,smtp,oauth-providers}`                                        | `/settings` (admin tabs)                 | User / invite / SMTP / OAuth provider management             |
| Agents          | `/api/agents/*`                                                                          | `/agents/*`                              | Agent CRUD, versioning, MCP-server status, schedules         |
| Environments    | `/api/environments/*`                                                                    | `/environments/*`                        | Env CRUD + networking + packages + metadata                  |
| Sessions        | `/api/sessions/*`                                                                        | — (folded into `/dashboard`)             | Session lifecycle; auto-attaches user vault on create        |
| Chat            | `/api/sessions/[id]/events`, `/api/sessions/[id]/stream`                                 | `/dashboard`, `/chat/[id]`               | SSE streaming; `ChatView` owns the whole surface             |
| Dashboard       | —                                                                                        | `/dashboard`                             | Primary chat surface + session list + new-chat form          |
| Connections     | `/api/connections`, `/api/connections/oauth/[serviceId]/{start,callback}`, `/api/vaults` | `/connections`                           | `mcp-registry.ts`, `oauth.ts`, `user-vault.ts`               |
| Scheduled Tasks | `/api/scheduled-tasks/*`                                                                 | Embedded in `/agents/[id]/edit`          | `scheduler.ts`, `scheduler-executor.ts`, `schedule-presets.ts` |
| Settings        | `/api/settings/*`                                                                        | `/settings`, `/settings/reset-password`  | Global API key (admin), preferences, password reset          |

## Specifications

Domain specs live in `/spec/` with `X.X.X` chapter numbering. See `/spec/README.md` for the full index. Specs are the canonical description of each domain's behavior, contracts, and constraints — treat them as authoritative alongside the code.

**Before making changes:**

- **Read the relevant spec(s) first.** Start at `/spec/README.md` to locate the chapter(s) that cover the affected domain(s), then read them in full before touching code. Do not rely on code-reading alone to infer intent — the spec explains the "why" that the code cannot.
- **Cross-check adjacent specs.** If the change touches shared concerns (design system, auth, sessions, chat, etc.), read those specs too. Features rarely live in a single domain.

**When a change alters behavior defined in a spec:**

- **Update the spec in the same change.** Spec edits and code edits ship together — never leave the spec describing outdated behavior. Treat spec drift as a bug.
- **Be precise.** Edit the exact sections affected; do not rewrite unrelated parts. Keep the chapter numbering and structure intact.
- **New domains get new chapters.** If a feature introduces a new domain, create a new `X.X.X-<domain>.md` file and add it to `/spec/README.md`.

**When the requested change conflicts with specs:**

- **Stop and clarify before coding.** If a request contradicts a single spec rule, or — more importantly — pulls in opposite directions across multiple specs (e.g., design-system says X, chat spec says Y), surface the conflict to the user explicitly: cite each spec section, explain the tension, and ask which rule should win or whether both specs need updating.
- **Do not silently pick a side.** Resolving a spec conflict is a product decision, not an implementation detail.

## Key Design Decisions

1. **Proxy all API calls** — API keys stay server-side. No client-side SDK usage.
2. **Bookmarks over caching** — Local DB enhances (nicknames, pins) rather than duplicates Anthropic state.
3. **SSE over WebSocket** — Simpler, unidirectional streaming fits the agent response model. User actions go through REST.
4. **Multi-user with global API key** — Admin sets one Anthropic key shared by all users. DB-backed sessions. Role-based access (admin/member).
5. **SCSS over CSS-in-JS** — Design tokens as CSS custom properties, component-scoped imports, no runtime cost.
6. **Drizzle over Prisma** — Lighter, closer to SQL, better TypeScript inference for this scale.
7. **MCP credentials live in Anthropic vaults, not our DB** — we store only a `users.vault_id` pointer. A compromised DB cannot leak third-party tokens; vault recovery (if Anthropic archives one) is transparent.
8. **One `ChatView`, two hosts** — `/dashboard` and `/chat/[id]` share a single component. Layout differences live in the parent via `--chat-view-padding`. Do not duplicate transcript/composer/SSE logic.
9. **Dashboard is the primary chat surface** — The old `/chat` and `/sessions` listings are folded in. Server-load parallelizes Anthropic list calls with `Promise.all` and caps results at 50/100/100 (no pagination at this level).
10. **In-process scheduler** — `node-cron` runs inside the SvelteKit server; atomic row locks handle concurrency; stale locks (older than 10 min) are swept on startup. No separate worker.
11. **Agent `system` prompt, not `description`** — Writes go to `system` (nulling `description` on save to migrate legacy rows); reads prefer `system` with a `description` fallback.
12. **Toast via global store** — `$lib/stores/toast` + single `Toaster` mounted in `+layout.svelte`. Pages never mount their own toaster.

## Git Workflow

- **Always create a PR** when introducing changes — target the `develop` branch.
- PR titles follow: `feat|fix|improve|chore(domain): message` (e.g., `feat(auth): add invite flow`, `fix(chat): resolve SSE reconnect`, `improve(agents): add empty state`).
- When asked to commit, stage changes, commit, push to a feature branch, and open a PR to `develop` automatically.
