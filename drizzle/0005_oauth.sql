CREATE TABLE "oauth_provider_configs" (
  "service_id" text PRIMARY KEY NOT NULL,
  "encrypted_client_id" bytea NOT NULL,
  "client_id_iv" bytea NOT NULL,
  "encrypted_client_secret" bytea NOT NULL,
  "client_secret_iv" bytea NOT NULL,
  "scopes" text,
  "updated_by" uuid NOT NULL REFERENCES "users" ("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "oauth_states" (
  "state" text PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "service_id" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "oauth_states_expires_at_idx" ON "oauth_states" ("expires_at");
