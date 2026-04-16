import { pgTable, uuid, text, boolean, integer, timestamp, customType, unique, jsonb } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  }
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull().default('member'),
  mustResetPassword: boolean('must_reset_password').notNull().default(false),
  // Anthropic-side vault ID (vlt_*). Lazily populated on first MCP-related
  // action. May be cleared if the vault is deleted/archived externally — the
  // user-vault helper transparently recreates it.
  vaultId: text('vault_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  encryptedKey: bytea('encrypted_key').notNull(),
  iv: bytea('iv').notNull(),
  label: text('label'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const invites = pgTable('invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  temporaryPassword: text('temporary_password'),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const apiKeyShares = pgTable('api_key_shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'cascade' }).notNull(),
  sharedWithUserId: uuid('shared_with_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  unique('api_key_shares_unique').on(table.apiKeyId, table.sharedWithUserId)
]);

export const smtpSettings = pgTable('smtp_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  username: text('username').notNull(),
  encryptedPassword: bytea('encrypted_password').notNull(),
  iv: bytea('iv').notNull(),
  fromEmail: text('from_email').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const agentBookmarks = pgTable('agent_bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  agentId: text('agent_id').notNull(),
  nickname: text('nickname'),
  pinned: boolean('pinned').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const envBookmarks = pgTable('env_bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  envId: text('env_id').notNull(),
  nickname: text('nickname'),
  pinned: boolean('pinned').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const sessionBookmarks = pgTable('session_bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sessionId: text('session_id').notNull(),
  nickname: text('nickname'),
  pinned: boolean('pinned').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  theme: text('theme').default('dark').notNull(),
  defaultAgentId: text('default_agent_id'),
  defaultEnvId: text('default_env_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const scheduledTasks = pgTable('scheduled_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: text('agent_id').notNull(),
  environmentId: text('environment_id'),
  promptTemplate: text('prompt_template').notNull(),
  cronExpression: text('cron_expression').notNull(),
  schedulePreset: text('schedule_preset').notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  sessionMode: text('session_mode').notNull().default('new_session'),
  activeSessionId: text('active_session_id'),
  enabled: boolean('enabled').notNull().default(true),
  lockedAt: timestamp('locked_at'),
  nextRunAt: timestamp('next_run_at').notNull(),
  lastRunAt: timestamp('last_run_at'),
  runCount: integer('run_count').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const taskExecutions = pgTable('task_executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => scheduledTasks.id, { onDelete: 'cascade' }).notNull(),
  sessionId: text('session_id'),
  status: text('status').notNull().default('running'),
  promptSent: text('prompt_sent').notNull(),
  response: text('response'),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms')
});

export const taskEditHistory = pgTable('task_edit_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => scheduledTasks.id, { onDelete: 'cascade' }).notNull(),
  editedBy: uuid('edited_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  changes: jsonb('changes').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
// === OAuth (for MCP services that use OAuth instead of static bearer) ===

// Admin-configured OAuth client credentials per registered service. The
// secrets are AES-256-GCM encrypted at rest (see crypto.ts), the same path used
// for api_keys + smtp_settings.
export const oauthProviderConfigs = pgTable('oauth_provider_configs', {
  // The serviceId from src/lib/mcp-registry.ts; one config per service.
  serviceId: text('service_id').primaryKey(),
  encryptedClientId: bytea('encrypted_client_id').notNull(),
  clientIdIv: bytea('client_id_iv').notNull(),
  encryptedClientSecret: bytea('encrypted_client_secret').notNull(),
  clientSecretIv: bytea('client_secret_iv').notNull(),
  // Optional scope override. NULL means use the service's default scopes.
  scopes: text('scopes'),
  updatedBy: uuid('updated_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Short-lived CSRF state tokens for OAuth redirect flows. Cleaned up
// opportunistically on each lookup.
export const oauthStates = pgTable('oauth_states', {
  state: text('state').primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  serviceId: text('service_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
