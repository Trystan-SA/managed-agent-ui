# ManagedAgentUI — Project Guide

## What This Is

A self-hosted SvelteKit dashboard for orchestrating Anthropic Managed Agents. Multi-user — the first registered account becomes admin, each user manages their own API keys.

## Architecture

**Monolith**: SvelteKit handles both SSR frontend and API routes. No separate backend service.

```
Browser → SvelteKit Pages (SSR + CSR)
       → SvelteKit API Routes → Anthropic API (proxied)
       → PostgreSQL (via Drizzle ORM)
```

**Source of truth**: Anthropic API owns agents, environments, and sessions. Local DB stores user auth, encrypted API keys, bookmarks (nicknames, pins), and preferences. Never duplicate Anthropic state locally.

**Security boundary**: API keys are AES-256-GCM encrypted at rest, decrypted server-side only. They never reach the browser. All Anthropic calls go through `/api/*` server routes.

## Principles

- **SOLID**: Each server route handles one resource. Components have single responsibilities. Database schema separates concerns (auth, keys, bookmarks, preferences).
- **DRY**: Design tokens defined once in `_tokens.scss`, shared patterns in `_mixins.scss`. `createAnthropicClient()` is the single path to the Anthropic SDK. Error handling normalized in one place.
- **DDD**: Domain boundaries map to route groups: auth, agents, environments, sessions, chat, settings. Each domain owns its API routes and pages.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5, SvelteKit 2.57, SCSS |
| Backend | SvelteKit server routes (Node adapter) |
| Database | PostgreSQL 16, Drizzle ORM 0.45 |
| API | Anthropic SDK 0.86 (proxied) |
| Auth | bcrypt, AES-256-GCM, HTTP-only cookies |
| Infra | Docker Compose, Node 22 Alpine |

## Directory Structure

```
src/
├── components/          # Reusable Svelte 5 components
├── lib/
│   ├── server/          # Server-only code (NEVER import client-side)
│   │   ├── db/          # Drizzle schema + connection
│   │   ├── anthropic.ts # SDK client factory
│   │   ├── auth.ts      # Password hashing, session management
│   │   └── crypto.ts    # AES-256-GCM encryption
│   ├── stores/          # Svelte stores (theme)
│   └── utils/           # Client-safe utilities (api, format)
├── routes/
│   ├── api/             # REST API (one folder per domain)
│   ├── agents/          # Agent management pages
│   ├── environments/    # Environment management pages
│   ├── sessions/        # Session listing pages
│   ├── chat/            # Real-time chat UI
│   ├── dashboard/       # Overview dashboard
│   ├── settings/        # User settings
│   ├── login/           # Login page
│   └── register/        # One-time setup
├── styles/              # SCSS design system
└── hooks.server.ts      # Auth middleware + setup guard
spec/                    # Domain specifications (chaptered X.X.X)
docs/superpowers/        # Design specs and implementation plans
drizzle/                 # Database migrations
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
- All tables use UUID primary keys
- Timestamps: `created_at` (always), `updated_at` (where mutable)
- Bookmark tables are local metadata over Anthropic resources — never cache API responses in DB
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

### Authentication
- One-time admin setup via `/register` (disabled after first user)
- Additional users onboarded via admin invite system
- Database-backed session store (`auth_sessions` table)
- Session cookies: HTTP-only, secure, SameSite=Lax, 7-day max age
- Two roles: `admin` (first user) and `member` (invited users)

## Domain Map

| Domain | API Routes | Pages | Key Files |
|--------|-----------|-------|-----------|
| Auth | `/api/auth/*` | `/login`, `/register`, `/invite/[token]` | `auth.ts`, `crypto.ts`, `email.ts`, `hooks.server.ts` |
| Admin | `/api/admin/*` | `/settings/admin` | User/invite/SMTP management |
| Agents | `/api/agents/*` | `/agents/*` | Agent CRUD + versioning |
| Environments | `/api/environments/*` | `/environments/*` | Env CRUD + networking/packages |
| Sessions | `/api/sessions/*` | `/sessions/*` | Session lifecycle + status |
| Chat | `/api/sessions/[id]/events`, `/api/sessions/[id]/stream` | `/chat/*` | SSE streaming, event handling |
| Settings | `/api/settings/*` | `/settings`, `/settings/reset-password` | Global API key (admin), preferences, password reset |
| Dashboard | — | `/dashboard` | Aggregation of agent/env/session counts |

## Specifications

Domain specs live in `/spec/` with `X.X.X` chapter numbering. See `/spec/README.md` for the full index.

## Key Design Decisions

1. **Proxy all API calls** — API keys stay server-side. No client-side SDK usage.
2. **Bookmarks over caching** — Local DB enhances (nicknames, pins) rather than duplicates Anthropic state.
3. **SSE over WebSocket** — Simpler, unidirectional streaming fits the agent response model. User actions go through REST.
4. **Multi-user with global API key** — Admin sets one Anthropic key shared by all users. DB-backed sessions. Role-based access (admin/member).
5. **SCSS over CSS-in-JS** — Design tokens as CSS custom properties, component-scoped imports, no runtime cost.
6. **Drizzle over Prisma** — Lighter, closer to SQL, better TypeScript inference for this scale.

## Git Workflow

- **Always create a PR** when introducing changes — target the `develop` branch.
- PR titles follow: `feat|fix|improve|chore(domain): message` (e.g., `feat(auth): add invite flow`, `fix(chat): resolve SSE reconnect`, `improve(agents): add empty state`).
- When asked to commit, stage changes, commit, push to a feature branch, and open a PR to `develop` automatically.
