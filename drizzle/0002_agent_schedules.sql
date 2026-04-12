CREATE TABLE "scheduled_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"prompt_template" text NOT NULL,
	"cron_expression" text NOT NULL,
	"schedule_preset" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"session_mode" text DEFAULT 'new_session' NOT NULL,
	"active_session_id" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"locked_at" timestamp,
	"next_run_at" timestamp NOT NULL,
	"last_run_at" timestamp,
	"run_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"session_id" text,
	"status" text DEFAULT 'running' NOT NULL,
	"prompt_sent" text NOT NULL,
	"response" text,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "task_edit_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"edited_by" uuid NOT NULL,
	"changes" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_tasks" ADD CONSTRAINT "scheduled_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scheduled_tasks" ADD CONSTRAINT "scheduled_tasks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_executions" ADD CONSTRAINT "task_executions_task_id_scheduled_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."scheduled_tasks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_edit_history" ADD CONSTRAINT "task_edit_history_task_id_scheduled_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."scheduled_tasks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_edit_history" ADD CONSTRAINT "task_edit_history_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
