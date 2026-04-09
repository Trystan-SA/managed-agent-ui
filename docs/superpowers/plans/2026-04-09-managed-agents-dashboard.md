# Managed Agents Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full SvelteKit management dashboard for Claude Managed Agents with CRUD for agents/environments/sessions, real-time chat with SSE streaming, and multi-user auth.

**Architecture:** Monolith SvelteKit app (Node adapter) with server-side API proxy to Anthropic. Postgres for user data, encrypted API keys, bookmarks, preferences. Docker Compose orchestrates both services.

**Tech Stack:** SvelteKit 2, Svelte 5, Drizzle ORM, Postgres 16, @anthropic-ai/sdk, bcrypt, custom SCSS, Docker Compose

**Spec:** `docs/superpowers/specs/2026-04-09-managed-agents-dashboard-design.md`

---

## File Structure

```
/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── drizzle.config.ts
├── src/
│   ├── app.html
│   ├── app.d.ts
│   ├── hooks.server.ts                      — auth middleware
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── index.ts                 — drizzle client
│   │   │   │   ├── schema.ts                — all table definitions
│   │   │   │   └── migrate.ts               — migration runner
│   │   │   ├── auth.ts                      — password hashing, session cookie helpers
│   │   │   ├── crypto.ts                    — AES-256-GCM encrypt/decrypt
│   │   │   └── anthropic.ts                 — createAnthropicClient(userId)
│   │   ├── stores/
│   │   │   └── theme.ts                     — theme store
│   │   └── utils/
│   │       ├── api.ts                       — fetch wrapper for client-side API calls
│   │       └── format.ts                    — date/status formatters
│   ├── styles/
│   │   ├── _tokens.scss
│   │   ├── _mixins.scss
│   │   ├── _reset.scss
│   │   ├── _layout.scss
│   │   ├── global.scss
│   │   └── components/
│   │       ├── _chat.scss
│   │       ├── _event-card.scss
│   │       ├── _form.scss
│   │       ├── _table.scss
│   │       ├── _badge.scss
│   │       ├── _sidebar.scss
│   │       └── _code-block.scss
│   ├── routes/
│   │   ├── +layout.svelte                   — global nav + theme wrapper
│   │   ├── +layout.server.ts                — load user session
│   │   ├── +page.svelte                     — redirect to /dashboard or /login
│   │   ├── login/
│   │   │   └── +page.svelte
│   │   ├── register/
│   │   │   └── +page.svelte
│   │   ├── dashboard/
│   │   │   ├── +page.svelte
│   │   │   └── +page.server.ts
│   │   ├── agents/
│   │   │   ├── +page.svelte
│   │   │   ├── +page.server.ts
│   │   │   ├── new/
│   │   │   │   └── +page.svelte
│   │   │   └── [id]/
│   │   │       ├── +page.svelte
│   │   │       ├── +page.server.ts
│   │   │       └── edit/
│   │   │           └── +page.svelte
│   │   ├── environments/
│   │   │   ├── +page.svelte
│   │   │   ├── +page.server.ts
│   │   │   ├── new/
│   │   │   │   └── +page.svelte
│   │   │   └── [id]/
│   │   │       ├── +page.svelte
│   │   │       ├── +page.server.ts
│   │   │       └── edit/
│   │   │           └── +page.svelte
│   │   ├── sessions/
│   │   │   ├── +page.svelte
│   │   │   ├── +page.server.ts
│   │   │   └── [id]/
│   │   │       ├── +page.svelte
│   │   │       └── +page.server.ts
│   │   ├── chat/
│   │   │   ├── +page.svelte
│   │   │   └── [sessionId]/
│   │   │       ├── +page.svelte
│   │   │       └── +page.server.ts
│   │   ├── settings/
│   │   │   ├── +page.svelte
│   │   │   └── +page.server.ts
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/+server.ts
│   │       │   ├── register/+server.ts
│   │       │   └── logout/+server.ts
│   │       ├── agents/
│   │       │   ├── +server.ts
│   │       │   └── [id]/
│   │       │       ├── +server.ts
│   │       │       ├── archive/+server.ts
│   │       │       └── versions/+server.ts
│   │       ├── environments/
│   │       │   ├── +server.ts
│   │       │   └── [id]/
│   │       │       ├── +server.ts
│   │       │       ├── archive/+server.ts
│   │       │       └── delete/+server.ts
│   │       ├── sessions/
│   │       │   ├── +server.ts
│   │       │   └── [id]/
│   │       │       ├── +server.ts
│   │       │       ├── archive/+server.ts
│   │       │       ├── delete/+server.ts
│   │       │       ├── events/+server.ts
│   │       │       └── stream/+server.ts
│   │       └── settings/
│   │           └── api-key/+server.ts
│   └── components/
│       ├── Nav.svelte
│       ├── Badge.svelte
│       ├── ChatMessage.svelte
│       ├── ToolUseCard.svelte
│       ├── ThinkingBlock.svelte
│       ├── EventTimeline.svelte
│       ├── SessionPicker.svelte
│       └── CodeBlock.svelte
└── drizzle/                                  — generated migrations
```

---

## Phase 1: Project Scaffolding & Infrastructure

### Task 1: Scaffold SvelteKit project

**Files:**
- Create: `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/app.d.ts`, `package.json` (replace existing)

- [ ] **Step 1: Remove old files and scaffold SvelteKit**

```bash
cd /home/trystan/claude-managed-agents
rm -f index.mjs
npx sv create . --template minimal --types ts --no-add-ons --no-install
```

Select: SvelteKit minimal, TypeScript, no extras. If prompted to overwrite, accept.

- [ ] **Step 2: Install dependencies**

```bash
npm install @anthropic-ai/sdk @sveltejs/adapter-node drizzle-orm postgres bcrypt uuid
npm install -D drizzle-kit @types/bcrypt @types/uuid sass-embedded @sveltejs/vite-plugin-svelte
```

- [ ] **Step 3: Configure Node adapter in `svelte.config.js`**

Replace the contents with:

```js
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ out: 'build' })
  }
};

export default config;
```

- [ ] **Step 4: Verify it builds**

```bash
npm run build
```

Expected: Build succeeds with Node adapter output in `build/`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "scaffold: SvelteKit project with Node adapter and dependencies"
```

---

### Task 2: Docker Compose + Postgres

**Files:**
- Create: `docker-compose.yml`, `Dockerfile`, `.env.example`, `.dockerignore`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: managed_agents
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-localdev}
      POSTGRES_DB: managed_agents
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgres://managed_agents:${POSTGRES_PASSWORD:-localdev}@postgres:5432/managed_agents
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      SESSION_SECRET: ${SESSION_SECRET}
      NODE_ENV: production

volumes:
  pgdata:
```

- [ ] **Step 2: Create `Dockerfile`**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/drizzle ./drizzle
EXPOSE 3000
CMD ["node", "build/index.js"]
```

- [ ] **Step 3: Create `.env.example`**

```env
DATABASE_URL=postgres://managed_agents:localdev@localhost:5432/managed_agents
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
SESSION_SECRET=change-me-to-a-random-string
```

- [ ] **Step 4: Create `.dockerignore`**

```
node_modules
build
.git
.env
```

- [ ] **Step 5: Create `.env` from example and start Postgres**

```bash
cp .env.example .env
docker compose up -d postgres
```

Expected: Postgres container running on port 5432.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml Dockerfile .env.example .dockerignore
git commit -m "infra: Docker Compose with Postgres and app containers"
```

---

### Task 3: Drizzle ORM schema and migrations

**Files:**
- Create: `drizzle.config.ts`, `src/lib/server/db/schema.ts`, `src/lib/server/db/index.ts`

- [ ] **Step 1: Create `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});
```

- [ ] **Step 2: Create `src/lib/server/db/schema.ts`**

```ts
import { pgTable, uuid, text, boolean, timestamp, customType } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  }
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),
  encryptedKey: bytea('encrypted_key').notNull(),
  iv: bytea('iv').notNull(),
  label: text('label'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const agentBookmarks = pgTable('agent_bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  agentId: text('agent_id').notNull(),
  nickname: text('nickname'),
  pinned: boolean('pinned').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const envBookmarks = pgTable('env_bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  envId: text('env_id').notNull(),
  nickname: text('nickname'),
  pinned: boolean('pinned').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const sessionBookmarks = pgTable('session_bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  sessionId: text('session_id').notNull(),
  nickname: text('nickname'),
  pinned: boolean('pinned').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),
  theme: text('theme').default('dark').notNull(),
  defaultAgentId: text('default_agent_id'),
  defaultEnvId: text('default_env_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
```

- [ ] **Step 3: Create `src/lib/server/db/index.ts`**

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

- [ ] **Step 4: Generate and run the migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

Expected: Migration files created in `drizzle/` and tables created in Postgres.

- [ ] **Step 5: Verify tables exist**

```bash
docker compose exec postgres psql -U managed_agents -c '\dt'
```

Expected: All 6 tables listed (users, api_keys, agent_bookmarks, env_bookmarks, session_bookmarks, user_preferences).

- [ ] **Step 6: Commit**

```bash
git add drizzle.config.ts src/lib/server/db/ drizzle/
git commit -m "db: Drizzle schema with all tables and initial migration"
```

---

## Phase 2: Auth & Crypto

### Task 4: Encryption helpers

**Files:**
- Create: `src/lib/server/crypto.ts`

- [ ] **Step 1: Create `src/lib/server/crypto.ts`**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

export function encrypt(plaintext: string): { encrypted: Buffer; iv: Buffer } {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return { encrypted, iv };
}

export function decrypt(encrypted: Buffer, iv: Buffer): string {
  const key = getEncryptionKey();
  const authTag = encrypted.subarray(encrypted.length - AUTH_TAG_LENGTH);
  const ciphertext = encrypted.subarray(0, encrypted.length - AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/crypto.ts
git commit -m "feat: AES-256-GCM encryption helpers for API key storage"
```

---

### Task 5: Auth helpers and session cookies

**Files:**
- Create: `src/lib/server/auth.ts`

- [ ] **Step 1: Create `src/lib/server/auth.ts`**

```ts
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

const SALT_ROUNDS = 12;
const SESSION_COOKIE = 'session_id';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// In-memory session store. For production, move to Redis or DB.
const sessions = new Map<string, { userId: string; expiresAt: number }>();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSession(cookies: Cookies, userId: string): void {
  const sessionId = randomUUID();
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  sessions.set(sessionId, { userId, expiresAt });
  cookies.set(SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE
  });
}

export function getUserIdFromSession(cookies: Cookies): string | null {
  const sessionId = cookies.get(SESSION_COOKIE);
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  return session.userId;
}

export function destroySession(cookies: Cookies): void {
  const sessionId = cookies.get(SESSION_COOKIE);
  if (sessionId) sessions.delete(sessionId);
  cookies.delete(SESSION_COOKIE, { path: '/' });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/auth.ts
git commit -m "feat: auth helpers with bcrypt password hashing and session cookies"
```

---

### Task 6: Anthropic client helper

**Files:**
- Create: `src/lib/server/anthropic.ts`

- [ ] **Step 1: Create `src/lib/server/anthropic.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk';
import { db } from './db';
import { apiKeys } from './db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from './crypto';

export async function createAnthropicClient(userId: string): Promise<Anthropic> {
  const [row] = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).limit(1);
  if (!row) {
    throw new Error('No API key configured. Please add your Anthropic API key in Settings.');
  }
  const apiKey = decrypt(row.encryptedKey, row.iv);
  return new Anthropic({ apiKey });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/anthropic.ts
git commit -m "feat: Anthropic client factory that decrypts user API keys"
```

---

### Task 7: Auth hooks and API routes

**Files:**
- Create: `src/hooks.server.ts`, `src/routes/api/auth/register/+server.ts`, `src/routes/api/auth/login/+server.ts`, `src/routes/api/auth/logout/+server.ts`

- [ ] **Step 1: Create `src/hooks.server.ts`**

```ts
import type { Handle } from '@sveltejs/kit';
import { getUserIdFromSession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const userId = getUserIdFromSession(event.cookies);
  event.locals.userId = userId;

  const { pathname } = event.url;
  const isPublic = pathname === '/login' || pathname === '/register' || pathname.startsWith('/api/auth/');

  if (!userId && !isPublic) {
    return new Response(null, { status: 303, headers: { location: '/login' } });
  }

  return resolve(event);
};
```

- [ ] **Step 2: Update `src/app.d.ts`**

```ts
declare global {
  namespace App {
    interface Locals {
      userId: string | null;
    }
  }
}

export {};
```

- [ ] **Step 3: Create `src/routes/api/auth/register/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users, apiKeys, userPreferences } from '$lib/server/db/schema';
import { hashPassword, createSession } from '$lib/server/auth';
import { encrypt } from '$lib/server/crypto';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { email, password, apiKey } = await request.json();

  if (!email || !password || !apiKey) {
    return json({ error: 'Email, password, and API key are required' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const { encrypted, iv } = encrypt(apiKey);

  try {
    const [user] = await db.insert(users).values({ email, password: passwordHash }).returning();
    await db.insert(apiKeys).values({ userId: user.id, encryptedKey: encrypted, iv });
    await db.insert(userPreferences).values({ userId: user.id });
    createSession(cookies, user.id);
    return json({ success: true });
  } catch (e: any) {
    if (e.code === '23505') {
      return json({ error: 'Email already registered' }, { status: 409 });
    }
    throw e;
  }
};
```

- [ ] **Step 4: Create `src/routes/api/auth/login/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { email, password } = await request.json();

  if (!email || !password) {
    return json({ error: 'Email and password are required' }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return json({ error: 'Invalid email or password' }, { status: 401 });
  }

  createSession(cookies, user.id);
  return json({ success: true });
};
```

- [ ] **Step 5: Create `src/routes/api/auth/logout/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroySession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
  destroySession(cookies);
  return json({ success: true });
};
```

- [ ] **Step 6: Verify the dev server starts**

```bash
npm run dev
```

Expected: Server starts without errors on port 5173.

- [ ] **Step 7: Commit**

```bash
git add src/hooks.server.ts src/app.d.ts src/routes/api/auth/
git commit -m "feat: auth system with register, login, logout and session hooks"
```

---

## Phase 3: SCSS Design System

### Task 8: SCSS tokens, mixins, reset, layout, and global

**Files:**
- Create: `src/styles/_tokens.scss`, `src/styles/_mixins.scss`, `src/styles/_reset.scss`, `src/styles/_layout.scss`, `src/styles/global.scss`, `src/styles/components/_form.scss`, `src/styles/components/_table.scss`, `src/styles/components/_badge.scss`, `src/styles/components/_sidebar.scss`, `src/styles/components/_chat.scss`, `src/styles/components/_event-card.scss`, `src/styles/components/_code-block.scss`

Use the **frontend-design** skill when implementing these files to ensure high design quality. Each SCSS file should be production-grade with a distinctive, polished aesthetic.

- [ ] **Step 1: Create `src/styles/_tokens.scss`**

Define CSS custom properties for colors (dark + light), spacing scale, radii, shadows, typography. Both themes.

- [ ] **Step 2: Create `src/styles/_mixins.scss`**

Mixins: `card`, `button($variant)`, `input`, `responsive($breakpoint)`, `truncate`, `badge($color)`, `scrollbar`, `focus-ring`.

- [ ] **Step 3: Create `src/styles/_reset.scss`**

Minimal reset: box-sizing, margin/padding reset, font inheritance, img max-width.

- [ ] **Step 4: Create `src/styles/_layout.scss`**

Global layout: nav bar, page shell with sidebar support, grid utilities.

- [ ] **Step 5: Create `src/styles/global.scss`**

Import all partials: `_reset`, `_tokens`, `_layout`.

- [ ] **Step 6: Create component SCSS files**

Create all component partial files under `src/styles/components/`:
- `_form.scss` — input groups, labels, error states, submit buttons
- `_table.scss` — data tables with hover, sorting indicators, responsive scroll
- `_badge.scss` — status badges (idle=green, running=blue, rescheduling=yellow, terminated=red)
- `_sidebar.scss` — collapsible sidebar, session list items
- `_chat.scss` — message bubbles, input area, streaming indicator
- `_event-card.scss` — collapsible cards for tool use, thinking blocks
- `_code-block.scss` — syntax-highlighted code display

- [ ] **Step 7: Wire SCSS into `src/app.html`**

Update `src/app.html` to include the global styles (SvelteKit auto-handles this via vite config).

- [ ] **Step 8: Commit**

```bash
git add src/styles/
git commit -m "style: complete SCSS design system with tokens, mixins, and component styles"
```

---

## Phase 4: Layout Shell & Public Pages

### Task 9: Global layout with nav and theme

**Files:**
- Create: `src/routes/+layout.svelte`, `src/routes/+layout.server.ts`, `src/lib/stores/theme.ts`

Use the **frontend-design** skill for the layout component.

- [ ] **Step 1: Create `src/lib/stores/theme.ts`**

```ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const stored = browser ? localStorage.getItem('theme') ?? 'dark' : 'dark';
export const theme = writable<'light' | 'dark'>(stored as 'light' | 'dark');

if (browser) {
  theme.subscribe((value) => {
    localStorage.setItem('theme', value);
    document.documentElement.setAttribute('data-theme', value);
  });
}
```

- [ ] **Step 2: Create `src/routes/+layout.server.ts`**

```ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return { userId: locals.userId };
};
```

- [ ] **Step 3: Create `src/routes/+layout.svelte`**

Global layout with:
- Top nav bar: logo, links (Dashboard, Agents, Environments, Sessions, Chat), settings gear icon
- Nav hidden on login/register pages
- `data-theme` attribute on root element
- Import `global.scss`

- [ ] **Step 4: Create `src/routes/+page.svelte`**

Root redirect: if logged in → `/dashboard`, else → `/login`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/theme.ts src/routes/+layout.svelte src/routes/+layout.server.ts src/routes/+page.svelte
git commit -m "feat: global layout with nav bar, theme toggle, and root redirect"
```

---

### Task 10: Login and register pages

**Files:**
- Create: `src/routes/login/+page.svelte`, `src/routes/register/+page.svelte`

Use the **frontend-design** skill for these pages.

- [ ] **Step 1: Create `src/routes/login/+page.svelte`**

Login form with email/password fields. On submit, POST to `/api/auth/login`. On success, redirect to `/dashboard`. Show error messages inline.

- [ ] **Step 2: Create `src/routes/register/+page.svelte`**

Registration form with email, password, and API key fields. API key field has a visibility toggle. On submit, POST to `/api/auth/register`. On success, redirect to `/dashboard`. Show error messages inline. Link to `/login` for existing users.

- [ ] **Step 3: Verify login/register flow works end-to-end**

```bash
npm run dev
```

Test: register a new user, log out, log back in. Verify redirects work.

- [ ] **Step 4: Commit**

```bash
git add src/routes/login/ src/routes/register/
git commit -m "feat: login and register pages with API key setup"
```

---

## Phase 5: API Proxy Routes

### Task 11: Client-side fetch wrapper

**Files:**
- Create: `src/lib/utils/api.ts`, `src/lib/utils/format.ts`

- [ ] **Step 1: Create `src/lib/utils/api.ts`**

```ts
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error || res.statusText);
  }

  return res.json();
}
```

- [ ] **Step 2: Create `src/lib/utils/format.ts`**

```ts
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export function statusColor(status: string): string {
  switch (status) {
    case 'idle': return 'green';
    case 'running': return 'blue';
    case 'rescheduling': return 'yellow';
    case 'terminated': return 'red';
    default: return 'gray';
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/
git commit -m "feat: client-side API fetch wrapper and formatting utilities"
```

---

### Task 12: Agents API proxy routes

**Files:**
- Create: `src/routes/api/agents/+server.ts`, `src/routes/api/agents/[id]/+server.ts`, `src/routes/api/agents/[id]/archive/+server.ts`, `src/routes/api/agents/[id]/versions/+server.ts`

- [ ] **Step 1: Create `src/routes/api/agents/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const agents = await client.beta.agents.list();
  return json(agents);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const body = await request.json();
  const agent = await client.beta.agents.create(body);
  return json(agent, { status: 201 });
};
```

- [ ] **Step 2: Create `src/routes/api/agents/[id]/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const agent = await client.beta.agents.retrieve(params.id);
  return json(agent);
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const body = await request.json();
  const agent = await client.beta.agents.update(params.id, body);
  return json(agent);
};
```

- [ ] **Step 3: Create `src/routes/api/agents/[id]/archive/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const POST: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const result = await client.beta.agents.archive(params.id);
  return json(result);
};
```

- [ ] **Step 4: Create `src/routes/api/agents/[id]/versions/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const versions: any[] = [];
  for await (const version of client.beta.agents.versions.list(params.id)) {
    versions.push(version);
  }
  return json(versions);
};
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/agents/
git commit -m "feat: agents API proxy routes (list, create, retrieve, update, archive, versions)"
```

---

### Task 13: Environments API proxy routes

**Files:**
- Create: `src/routes/api/environments/+server.ts`, `src/routes/api/environments/[id]/+server.ts`, `src/routes/api/environments/[id]/archive/+server.ts`, `src/routes/api/environments/[id]/delete/+server.ts`

- [ ] **Step 1: Create `src/routes/api/environments/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const environments = await client.beta.environments.list();
  return json(environments);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const body = await request.json();
  const environment = await client.beta.environments.create(body);
  return json(environment, { status: 201 });
};
```

- [ ] **Step 2: Create `src/routes/api/environments/[id]/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const env = await client.beta.environments.retrieve(params.id);
  return json(env);
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const body = await request.json();
  const env = await client.beta.environments.update(params.id, body);
  return json(env);
};
```

- [ ] **Step 3: Create `src/routes/api/environments/[id]/archive/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const POST: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const result = await client.beta.environments.archive(params.id);
  return json(result);
};
```

- [ ] **Step 4: Create `src/routes/api/environments/[id]/delete/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  await client.beta.environments.delete(params.id);
  return json({ success: true });
};
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/environments/
git commit -m "feat: environments API proxy routes (list, create, retrieve, update, archive, delete)"
```

---

### Task 14: Sessions API proxy routes

**Files:**
- Create: `src/routes/api/sessions/+server.ts`, `src/routes/api/sessions/[id]/+server.ts`, `src/routes/api/sessions/[id]/archive/+server.ts`, `src/routes/api/sessions/[id]/delete/+server.ts`, `src/routes/api/sessions/[id]/events/+server.ts`, `src/routes/api/sessions/[id]/stream/+server.ts`

- [ ] **Step 1: Create `src/routes/api/sessions/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const sessions: any[] = [];
  for await (const session of client.beta.sessions.list()) {
    sessions.push(session);
  }
  return json(sessions);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const body = await request.json();
  const session = await client.beta.sessions.create(body);
  return json(session, { status: 201 });
};
```

- [ ] **Step 2: Create `src/routes/api/sessions/[id]/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const session = await client.beta.sessions.retrieve(params.id);
  return json(session);
};
```

- [ ] **Step 3: Create `src/routes/api/sessions/[id]/archive/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const POST: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const result = await client.beta.sessions.archive(params.id);
  return json(result);
};
```

- [ ] **Step 4: Create `src/routes/api/sessions/[id]/delete/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  await client.beta.sessions.delete(params.id);
  return json({ success: true });
};
```

- [ ] **Step 5: Create `src/routes/api/sessions/[id]/events/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const body = await request.json();
  const result = await client.beta.sessions.events.send(params.id, body);
  return json(result);
};
```

- [ ] **Step 6: Create `src/routes/api/sessions/[id]/stream/+server.ts`**

This is the SSE proxy — the most critical endpoint. It opens a stream to Anthropic and pipes events to the browser.

```ts
import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const stream = await client.beta.sessions.events.stream(params.id);

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of stream) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
          if (event.type === 'session.status_idle' || event.type === 'session.status_terminated') {
            break;
          }
        }
      } catch (e) {
        const errorData = `data: ${JSON.stringify({ type: 'error', message: String(e) })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
};
```

- [ ] **Step 7: Commit**

```bash
git add src/routes/api/sessions/
git commit -m "feat: sessions API proxy routes with SSE stream passthrough"
```

---

### Task 15: Settings API route (API key management)

**Files:**
- Create: `src/routes/api/settings/api-key/+server.ts`

- [ ] **Step 1: Create `src/routes/api/settings/api-key/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { apiKeys } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt } from '$lib/server/crypto';

export const PUT: RequestHandler = async ({ request, locals }) => {
  const { apiKey, label } = await request.json();
  if (!apiKey) {
    return json({ error: 'API key is required' }, { status: 400 });
  }

  const { encrypted, iv } = encrypt(apiKey);
  const userId = locals.userId!;

  const existing = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).limit(1);

  if (existing.length > 0) {
    await db.update(apiKeys)
      .set({ encryptedKey: encrypted, iv, label: label ?? null, updatedAt: new Date() })
      .where(eq(apiKeys.userId, userId));
  } else {
    await db.insert(apiKeys).values({ userId, encryptedKey: encrypted, iv, label });
  }

  return json({ success: true });
};

export const DELETE: RequestHandler = async ({ locals }) => {
  await db.delete(apiKeys).where(eq(apiKeys.userId, locals.userId!));
  return json({ success: true });
};
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/api/settings/
git commit -m "feat: API key management endpoint (update, delete)"
```

---

## Phase 6: UI Pages

### Task 16: Dashboard page

**Files:**
- Create: `src/routes/dashboard/+page.server.ts`, `src/routes/dashboard/+page.svelte`

Use the **frontend-design** skill for the page component.

- [ ] **Step 1: Create `src/routes/dashboard/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ locals }) => {
  const client = await createAnthropicClient(locals.userId!);

  const [agentsRes, environmentsRes] = await Promise.all([
    client.beta.agents.list(),
    client.beta.environments.list()
  ]);

  const agents = agentsRes.data ?? [];
  const environments = environmentsRes.data ?? [];

  const sessions: any[] = [];
  for await (const s of client.beta.sessions.list()) {
    sessions.push(s);
  }

  return {
    agentCount: agents.length,
    environmentCount: environments.length,
    sessionCount: sessions.length,
    activeSessions: sessions.filter((s: any) => s.status === 'running').length,
    recentSessions: sessions.slice(0, 5)
  };
};
```

- [ ] **Step 2: Create `src/routes/dashboard/+page.svelte`**

Dashboard with:
- 4 stat cards: Agents, Environments, Total Sessions, Active Sessions
- Recent sessions table (last 5) with status badges and links
- Quick action buttons: New Agent, New Environment, New Chat

- [ ] **Step 3: Verify dashboard loads**

```bash
npm run dev
```

Navigate to `/dashboard` after logging in. Verify stats render (may be zeros if no Anthropic resources exist yet).

- [ ] **Step 4: Commit**

```bash
git add src/routes/dashboard/
git commit -m "feat: dashboard page with stats overview and recent sessions"
```

---

### Task 17: Agents list and create pages

**Files:**
- Create: `src/routes/agents/+page.server.ts`, `src/routes/agents/+page.svelte`, `src/routes/agents/new/+page.svelte`

Use the **frontend-design** skill for these components.

- [ ] **Step 1: Create `src/routes/agents/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const result = await client.beta.agents.list();
  return { agents: result.data ?? [] };
};
```

- [ ] **Step 2: Create `src/routes/agents/+page.svelte`**

Table listing all agents: name, model, version, created date, archived status. Link each row to `/agents/[id]`. "New Agent" button linking to `/agents/new`.

- [ ] **Step 3: Create `src/routes/agents/new/+page.svelte`**

Form to create an agent:
- Name (text input)
- Model (dropdown: claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5-20251001)
- System prompt (textarea)
- Tools toggle: agent_toolset_20260401 enabled by default, with per-tool checkboxes (bash, read, write, edit, glob, grep, web_fetch, web_search)
- On submit: POST to `/api/agents`, redirect to `/agents/[id]`

- [ ] **Step 4: Commit**

```bash
git add src/routes/agents/
git commit -m "feat: agents list page and create agent form"
```

---

### Task 18: Agent detail and edit pages

**Files:**
- Create: `src/routes/agents/[id]/+page.server.ts`, `src/routes/agents/[id]/+page.svelte`, `src/routes/agents/[id]/edit/+page.svelte`

Use the **frontend-design** skill.

- [ ] **Step 1: Create `src/routes/agents/[id]/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const [agent, versions] = await Promise.all([
    client.beta.agents.retrieve(params.id),
    (async () => {
      const v: any[] = [];
      for await (const ver of client.beta.agents.versions.list(params.id)) {
        v.push(ver);
      }
      return v;
    })()
  ]);
  return { agent, versions };
};
```

- [ ] **Step 2: Create `src/routes/agents/[id]/+page.svelte`**

Agent detail page:
- Header with name, model badge, version number
- Config section: system prompt (displayed in code block), tools list
- Version history table: version number, updated_at, diff summary (system prompt changes)
- Action buttons: Edit, Archive (with confirmation)
- Archive calls POST `/api/agents/[id]/archive`

- [ ] **Step 3: Create `src/routes/agents/[id]/edit/+page.svelte`**

Pre-populated form (same fields as create). On submit: PUT to `/api/agents/[id]` with current `version` for optimistic concurrency. Redirect back to detail page.

- [ ] **Step 4: Commit**

```bash
git add src/routes/agents/
git commit -m "feat: agent detail page with version history and edit form"
```

---

### Task 19: Environments list, create, detail, and edit pages

**Files:**
- Create: `src/routes/environments/+page.server.ts`, `src/routes/environments/+page.svelte`, `src/routes/environments/new/+page.svelte`, `src/routes/environments/[id]/+page.server.ts`, `src/routes/environments/[id]/+page.svelte`, `src/routes/environments/[id]/edit/+page.svelte`

Use the **frontend-design** skill.

- [ ] **Step 1: Create `src/routes/environments/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const result = await client.beta.environments.list();
  return { environments: result.data ?? [] };
};
```

- [ ] **Step 2: Create `src/routes/environments/+page.svelte`**

Table: name, networking type, archived status, created date. Row links to detail. "New Environment" button.

- [ ] **Step 3: Create `src/routes/environments/new/+page.svelte`**

Form:
- Name (text)
- Networking mode (radio: unrestricted / limited)
- If limited: allowed_hosts (comma-separated text input), allow_mcp_servers toggle, allow_package_managers toggle
- Packages section: pip, npm, apt (comma-separated text inputs per package manager)
- On submit: POST `/api/environments`, redirect to detail

- [ ] **Step 4: Create `src/routes/environments/[id]/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const env = await client.beta.environments.retrieve(params.id);
  return { environment: env };
};
```

- [ ] **Step 5: Create `src/routes/environments/[id]/+page.svelte`**

Detail page:
- Header with name
- Config display: networking mode, allowed hosts, packages (grouped by manager)
- Action buttons: Edit, Archive, Delete (with confirmation dialogs)

- [ ] **Step 6: Create `src/routes/environments/[id]/edit/+page.svelte`**

Pre-populated form (same fields as create). PUT to `/api/environments/[id]`. Redirect back to detail.

- [ ] **Step 7: Commit**

```bash
git add src/routes/environments/
git commit -m "feat: environments list, create, detail, and edit pages"
```

---

### Task 20: Sessions list and detail pages

**Files:**
- Create: `src/routes/sessions/+page.server.ts`, `src/routes/sessions/+page.svelte`, `src/routes/sessions/[id]/+page.server.ts`, `src/routes/sessions/[id]/+page.svelte`
- Create: `src/components/Badge.svelte`, `src/components/EventTimeline.svelte`

Use the **frontend-design** skill.

- [ ] **Step 1: Create `src/components/Badge.svelte`**

```svelte
<script lang="ts">
  let { status, size = 'md' }: { status: string; size?: 'sm' | 'md' } = $props();
</script>

<span class="badge badge--{status} badge--{size}">{status}</span>
```

- [ ] **Step 2: Create `src/routes/sessions/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const sessions: any[] = [];
  for await (const s of client.beta.sessions.list()) {
    sessions.push(s);
  }
  return { sessions };
};
```

- [ ] **Step 3: Create `src/routes/sessions/+page.svelte`**

Table: session ID (truncated), title, status badge, agent name, created date. Row links to detail. Action column: Archive, Delete buttons.

- [ ] **Step 4: Create `src/components/EventTimeline.svelte`**

Component that receives an array of events and renders them as a vertical timeline:
- `agent.message` — text blocks
- `agent.thinking` — collapsible dimmed section
- `agent.tool_use` — collapsible card showing tool name + input JSON
- `agent.tool_result` — result displayed inside the tool card
- `user.message` — styled differently (right-aligned or distinct color)
- Status events — small inline indicators

- [ ] **Step 5: Create `src/routes/sessions/[id]/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const session = await client.beta.sessions.retrieve(params.id);
  const events: any[] = [];
  for await (const event of client.beta.sessions.events.list(params.id)) {
    events.push(event);
  }
  return { session, events };
};
```

- [ ] **Step 6: Create `src/routes/sessions/[id]/+page.svelte`**

Session detail page:
- Header: session ID, status badge, agent link, environment link
- Event timeline (using EventTimeline component)
- Action buttons: Open in Chat (if idle), Archive, Delete
- "Open in Chat" links to `/chat/[sessionId]`

- [ ] **Step 7: Commit**

```bash
git add src/components/Badge.svelte src/components/EventTimeline.svelte src/routes/sessions/
git commit -m "feat: sessions list and detail pages with event timeline"
```

---

## Phase 7: Chat UI

### Task 21: Chat components

**Files:**
- Create: `src/components/ChatMessage.svelte`, `src/components/ToolUseCard.svelte`, `src/components/ThinkingBlock.svelte`, `src/components/CodeBlock.svelte`, `src/components/SessionPicker.svelte`

Use the **frontend-design** skill for all components.

- [ ] **Step 1: Create `src/components/CodeBlock.svelte`**

Displays code with a copy button. Receives `code` and optional `language` props.

- [ ] **Step 2: Create `src/components/ToolUseCard.svelte`**

Collapsible card showing:
- Tool name in the header
- Input JSON (using CodeBlock) — collapsed by default
- Result (when available) — auto-expands when result arrives
- Status indicator: spinner while waiting, checkmark when done

- [ ] **Step 3: Create `src/components/ThinkingBlock.svelte`**

Collapsible block with dimmed text. Header says "Thinking...". Collapsed by default, expandable to see thinking content.

- [ ] **Step 4: Create `src/components/ChatMessage.svelte`**

Renders a single message:
- `role === 'user'` — right-aligned, accent background
- `role === 'assistant'` — left-aligned, renders text with markdown support (basic: bold, italic, code, links)
- Handles mixed content: text blocks rendered inline, tool_use blocks delegated to ToolUseCard

- [ ] **Step 5: Create `src/components/SessionPicker.svelte`**

Sidebar component listing existing idle sessions. Each item shows title/ID and status badge. Click to navigate. "New Session" button at top.

- [ ] **Step 6: Commit**

```bash
git add src/components/
git commit -m "feat: chat components (message, tool card, thinking block, code block, session picker)"
```

---

### Task 22: Chat landing page (new session)

**Files:**
- Create: `src/routes/chat/+page.svelte`

Use the **frontend-design** skill.

- [ ] **Step 1: Create `src/routes/chat/+page.svelte`**

Page to start a new chat session:
- Two dropdowns: select an agent, select an environment (both fetched from `/api/agents` and `/api/environments`)
- Optional title text input
- "Start Session" button: POST to `/api/sessions` with `{ agent: agentId, environment_id: envId, title }`, then redirect to `/chat/[sessionId]`
- Below the form: list of existing idle sessions (fetched from `/api/sessions`) to resume

- [ ] **Step 2: Commit**

```bash
git add src/routes/chat/+page.svelte
git commit -m "feat: chat landing page with agent/env selection and session resume"
```

---

### Task 23: Live chat page with SSE streaming

**Files:**
- Create: `src/routes/chat/[sessionId]/+page.server.ts`, `src/routes/chat/[sessionId]/+page.svelte`

Use the **frontend-design** skill. This is the most complex page.

- [ ] **Step 1: Create `src/routes/chat/[sessionId]/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const load: PageServerLoad = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const session = await client.beta.sessions.retrieve(params.id);
  return { session };
};
```

- [ ] **Step 2: Create `src/routes/chat/[sessionId]/+page.svelte`**

The main chat interface. Key behaviors:

**Layout:**
- Left sidebar: SessionPicker component
- Main area: message list + input bar at bottom
- Header: session title, status badge, interrupt button (visible when running)

**Sending messages:**
- Text input with send button
- On send: POST to `/api/sessions/[id]/events` with `{ events: [{ type: "user.message", content: [{ type: "text", text }] }] }`
- Append the user message to the local message list immediately

**SSE streaming:**
- After sending, open an EventSource to `/api/sessions/[id]/stream`
- Process incoming events:
  - `agent.message` — append text blocks to current assistant message, render token-by-token
  - `agent.thinking` — append to a ThinkingBlock component
  - `agent.tool_use` — append a ToolUseCard to the message list
  - `agent.tool_result` — update the matching ToolUseCard with the result
  - `session.status_idle` — close the EventSource, update status badge
  - `session.status_running` — update status badge

**Interrupt:**
- Interrupt button: POST to `/api/sessions/[id]/events` with `{ events: [{ type: "user.interrupt" }] }`

**Auto-scroll:**
- Scroll to bottom on new content. If user has scrolled up, don't auto-scroll. Resume auto-scroll when user scrolls back to bottom.

- [ ] **Step 3: Test the full chat flow**

```bash
npm run dev
```

1. Create an agent and environment via the UI
2. Start a new chat session
3. Send a message
4. Verify: streaming works, tool use cards appear, status updates, interrupt works

- [ ] **Step 4: Commit**

```bash
git add src/routes/chat/
git commit -m "feat: live chat page with SSE streaming, tool cards, and interrupt"
```

---

## Phase 8: Settings & Polish

### Task 24: Settings page

**Files:**
- Create: `src/routes/settings/+page.server.ts`, `src/routes/settings/+page.svelte`

Use the **frontend-design** skill.

- [ ] **Step 1: Create `src/routes/settings/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { apiKeys, userPreferences } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.userId!;
  const [key] = await db.select({ label: apiKeys.label, createdAt: apiKeys.createdAt })
    .from(apiKeys).where(eq(apiKeys.userId, userId)).limit(1);
  const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return {
    hasApiKey: !!key,
    apiKeyLabel: key?.label ?? null,
    apiKeyCreatedAt: key?.createdAt?.toISOString() ?? null,
    preferences: prefs ?? { theme: 'dark', defaultAgentId: null, defaultEnvId: null }
  };
};
```

- [ ] **Step 2: Create `src/routes/settings/+page.svelte`**

Settings page sections:
- **API Key:** shows label and created date if exists, "Update" form with new key + label input, "Delete" button
- **Theme:** light/dark toggle, saves to preferences and updates `data-theme`
- **Defaults:** dropdowns for default agent and environment (fetched from API)
- **Account:** email display, logout button

- [ ] **Step 3: Commit**

```bash
git add src/routes/settings/
git commit -m "feat: settings page with API key management, theme, and preferences"
```

---

### Task 25: Nav component

**Files:**
- Create: `src/components/Nav.svelte`

Use the **frontend-design** skill.

- [ ] **Step 1: Create `src/components/Nav.svelte`**

Top navigation bar:
- Left: app logo/name ("Managed Agents")
- Center: nav links (Dashboard, Agents, Environments, Sessions, Chat) — highlight active route
- Right: settings gear icon, logout button
- Responsive: collapses to hamburger menu on mobile

- [ ] **Step 2: Wire Nav into `src/routes/+layout.svelte`**

Import and render Nav component. Only show when user is logged in.

- [ ] **Step 3: Commit**

```bash
git add src/components/Nav.svelte src/routes/+layout.svelte
git commit -m "feat: navigation component with active route highlighting"
```

---

### Task 26: Final integration and Docker build test

- [ ] **Step 1: Generate a real ENCRYPTION_KEY in `.env`**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the output in `.env` as `ENCRYPTION_KEY=<output>`. Also set a random `SESSION_SECRET`.

- [ ] **Step 2: Run the full app in dev mode and smoke test**

```bash
npm run dev
```

Test the complete flow:
1. Register → Dashboard loads with stats
2. Agents → Create agent → Detail page with version history
3. Environments → Create environment → Detail page
4. Chat → Pick agent + env → Send message → See streaming response
5. Sessions → List shows the session → Detail shows event timeline
6. Settings → Update API key, toggle theme

- [ ] **Step 3: Build and test Docker Compose**

```bash
docker compose build
docker compose up -d
```

Expected: Both containers start. App accessible at `http://localhost:3000`.

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final integration fixes and Docker build verification"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1. Scaffolding | 1-3 | SvelteKit project, Docker, DB schema |
| 2. Auth & Crypto | 4-7 | Encryption, auth, Anthropic client, login/register API |
| 3. SCSS | 8 | Complete design system |
| 4. Layout & Public | 9-10 | Nav, theme, login/register UI |
| 5. API Proxy | 11-15 | All Anthropic API proxy routes |
| 6. UI Pages | 16-20 | Dashboard, agents, environments, sessions pages |
| 7. Chat | 21-23 | Chat components and live streaming |
| 8. Polish | 24-26 | Settings, nav, Docker build |
