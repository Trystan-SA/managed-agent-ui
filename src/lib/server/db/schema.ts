import { pgTable, uuid, text, boolean, integer, timestamp, customType, unique } from 'drizzle-orm/pg-core';

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