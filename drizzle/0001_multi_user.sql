-- Multi-user architecture migration

-- Add role and mustResetPassword to users
ALTER TABLE "users" ADD COLUMN "role" text NOT NULL DEFAULT 'member';
ALTER TABLE "users" ADD COLUMN "must_reset_password" boolean NOT NULL DEFAULT false;

-- Update existing users to admin (first user = admin)
UPDATE "users" SET "role" = 'admin' WHERE "created_at" = (SELECT MIN("created_at") FROM "users");

-- API keys: remove unique constraint on user_id, add name column
ALTER TABLE "api_keys" DROP CONSTRAINT IF EXISTS "api_keys_user_id_unique";
ALTER TABLE "api_keys" ADD COLUMN "name" text NOT NULL DEFAULT 'Default';

-- Auth sessions (replaces in-memory Map)
CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Invites
CREATE TABLE IF NOT EXISTS "invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "invited_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "temporary_password" text,
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- API key shares
CREATE TABLE IF NOT EXISTS "api_key_shares" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "api_key_id" uuid NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
  "shared_with_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "api_key_shares_unique" UNIQUE("api_key_id", "shared_with_user_id")
);

-- SMTP settings (single-row)
CREATE TABLE IF NOT EXISTS "smtp_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "host" text NOT NULL,
  "port" integer NOT NULL,
  "username" text NOT NULL,
  "encrypted_password" bytea NOT NULL,
  "iv" bytea NOT NULL,
  "from_email" text NOT NULL,
  "updated_by" uuid NOT NULL REFERENCES "users"("id"),
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add cascade deletes to existing tables that reference users
ALTER TABLE "agent_bookmarks" DROP CONSTRAINT IF EXISTS "agent_bookmarks_user_id_users_id_fk";
ALTER TABLE "agent_bookmarks" ADD CONSTRAINT "agent_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "env_bookmarks" DROP CONSTRAINT IF EXISTS "env_bookmarks_user_id_users_id_fk";
ALTER TABLE "env_bookmarks" ADD CONSTRAINT "env_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "session_bookmarks" DROP CONSTRAINT IF EXISTS "session_bookmarks_user_id_users_id_fk";
ALTER TABLE "session_bookmarks" ADD CONSTRAINT "session_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "user_preferences" DROP CONSTRAINT IF EXISTS "user_preferences_user_id_users_id_fk";
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "api_keys" DROP CONSTRAINT IF EXISTS "api_keys_user_id_users_id_fk";
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
