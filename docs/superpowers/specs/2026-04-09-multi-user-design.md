# Multi-User Architecture Design

## Overview

Transform the single-user ManagedAgentUI dashboard into a multi-user system. The first registered account becomes the admin, who can invite collaborators. Each user manages their own API keys (private by default) and can optionally share them with specific users. Anthropic resources (agents, sessions, environments) are scoped to API keys and displayed in a unified view across all keys a user has access to.

## Decisions

| Decision | Choice |
|----------|--------|
| Invite model | Invite-only, admin creates invites |
| Shared key access level | Full access (same as key owner) |
| Multi-key UI | Unified view of all resources; key selector at creation time |
| Key re-sharing | Owner only |
| Invite delivery | Email if SMTP configured, temporary password if not |
| User deletion | Hard delete user + their API keys; Anthropic resources untouched |
| Session storage | Database-backed (replaces in-memory Map) |
| SMTP config storage | Database (admin-configurable from settings UI) |

## Schema Changes

### `users` table — new columns

- `role`: text, `'admin'` or `'member'`, default `'member'`. First registered user gets `'admin'`.
- `mustResetPassword`: boolean, default `false`. Set `true` when admin creates account with temporary password.

### `apiKeys` table — changes

- Remove UNIQUE constraint on `userId` (users can have multiple keys).
- Add `name` column (text, required) to distinguish between keys.

### New: `authSessions` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK -> users |
| token | text | Unique, the session cookie value |
| expiresAt | timestamp | 7-day TTL |
| createdAt | timestamp | |

Expired rows cleaned up on every validation check (piggyback delete, no cron).

### New: `invites` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| email | text | Invitee email |
| invitedBy | uuid | FK -> users (admin) |
| token | text | Unique, for invite URL |
| temporaryPassword | text | Nullable, bcrypt-hashed, set if no SMTP |
| expiresAt | timestamp | 48h TTL |
| acceptedAt | timestamp | Nullable, set on registration |
| createdAt | timestamp | |

### New: `apiKeyShares` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| apiKeyId | uuid | FK -> apiKeys |
| sharedWithUserId | uuid | FK -> users |
| createdAt | timestamp | |
| Unique constraint | | (apiKeyId, sharedWithUserId) |

### New: `smtpSettings` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| host | text | |
| port | integer | |
| username | text | |
| encryptedPassword | bytea | AES-256-GCM |
| iv | bytea | |
| fromEmail | text | |
| updatedBy | uuid | FK -> users |
| updatedAt | timestamp | |

Single-row table — one SMTP config per instance.

## Auth & Session Changes

### Database-backed sessions

- `createSession()` inserts a row in `authSessions` instead of the in-memory Map.
- `validateSession()` queries the DB, returns `userId` if token exists and not expired.
- On every validation, piggyback-delete expired rows: `DELETE FROM authSessions WHERE expiresAt < NOW()`.
- `destroySession()` deletes the row by token.
- The in-memory `Map` is removed entirely.

### Registration flow

- `/register` remains the first-user setup page. Created user gets `role: 'admin'`.
- After first user exists, `/register` is blocked (unchanged).
- New route: `/invite/[token]` — invite acceptance page.
  - Validates invite token (exists, not expired, not already accepted).
  - If invite has `temporaryPassword`: user logs in with it, gets redirected to password reset.
  - If invite was sent via email: user sets their password directly on this page.
  - On submit: creates user with `role: 'member'`, marks invite as accepted.

### Password reset intercept

- Users with `mustResetPassword: true` are intercepted by `hooks.server.ts`.
- Any navigation redirects to `/settings/reset-password` (new route).
- After successful reset, `mustResetPassword` set to `false`.
- No self-service "forgot password" — admin can re-invite.

### Hooks changes

- `hooks.server.ts` switches from in-memory lookup to DB query.
- Adds password-reset intercept.
- Public routes expanded: `/invite/[token]` added.

## API Key Management & Sharing

### Multiple keys per user

- Settings page shows a list of the user's API keys (name + masked preview + created date).
- Add key: user provides name + API key string.
- Delete key: cascade-deletes all `apiKeyShares` for that key.

### Sharing

- Key owner sees "Share" action on each key.
- Panel/modal: lists current shares + "Add user" selector (existing members).
- Owner can revoke individual shares.
- Shared users don't see the share action.

### Anthropic client resolution

- `createAnthropicClient(apiKeyId: string)` — takes a key ID, not a user ID.
- Validation: verify requesting user owns the key or has a share entry.
- All API routes receive `apiKeyId` from the request.

### Unified resource view

- Listing agents/environments/sessions fetches from ALL keys the user can access (own + shared).
- Each Anthropic API call uses the respective key.
- Response includes `apiKeyId` and key name alongside each resource.
- Resources merged into a single list, tagged by key.

### Creation flow

- User picks which key to use when creating agents/sessions/environments.
- UI shows key selector populated with all accessible keys.
- Selected `apiKeyId` sent with the create request.

## User Management (Admin)

### Admin settings — Users section

- Lists all users: email, role, joined date, status.
- Admin can invite new users and delete existing ones.

### Invite flow

- Admin clicks "Invite user", enters email.
- SMTP configured: sends email with link to `/invite/[token]` (48h expiry).
- No SMTP: admin sets temporary password, system shows invite URL to copy.
- Pending invites listed with status (pending/accepted/expired).
- Admin can revoke pending invites.

### Delete user

- Confirmation dialog.
- Cascade: deletes user's API keys (cascade-deletes shares), auth sessions, bookmarks, preferences, user row.
- Anthropic resources untouched.
- Admin cannot delete themselves.

### SMTP settings

- Admin-only section in settings.
- Form: host, port, username, password, from email.
- Password encrypted with AES-256-GCM.
- "Send test email" button to validate before saving.
- Only visible to admin role.
