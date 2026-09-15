/**
 * Initial schema: enums, all 11 tables, and their foreign keys. Written as
 * raw SQL (rather than the schema builder) because it's a direct, verified
 * port of the previously-generated and already-tested schema — safer than
 * re-deriving ~20 FKs and 10 native enum types by hand.
 */

exports.up = async function up(knex) {
  await knex.raw(`
    DO $$ BEGIN
     CREATE TYPE "public"."goal_priority" AS ENUM('low', 'medium', 'high', 'urgent');
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
     CREATE TYPE "public"."goal_status" AS ENUM('active', 'completed', 'archived', 'cancelled');
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
     CREATE TYPE "public"."occurrence_status" AS ENUM('todo', 'in_progress', 'completed', 'skipped', 'cancelled', 'rescheduled');
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
     CREATE TYPE "public"."plan_status" AS ENUM('active', 'completed', 'archived');
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
     CREATE TYPE "public"."plan_type" AS ENUM('yearly', 'quarterly', 'monthly', 'personal', 'project', 'career', 'school', 'work', 'lifestyle');
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
     CREATE TYPE "public"."recurrence_type" AS ENUM('daily', 'weekdays', 'weekly', 'monthly', 'custom');
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
     CREATE TYPE "public"."reminder_offset_type" AS ENUM('at_start', '5_min', '10_min', '15_min', 'custom');
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
     CREATE TYPE "public"."sleep_quality" AS ENUM('poor', 'fair', 'good', 'excellent');
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
     CREATE TYPE "public"."target_status" AS ENUM('active', 'completed', 'archived', 'cancelled');
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
     CREATE TYPE "public"."target_type" AS ENUM('milestone', 'monthly', 'weekly', 'custom');
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
     CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "email" text NOT NULL,
        "password_hash" text NOT NULL,
        "name" text,
        "timezone" text DEFAULT 'UTC' NOT NULL,
        "sleep_goal_minutes" integer DEFAULT 450 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "users_email_unique" UNIQUE("email")
    );

    CREATE TABLE IF NOT EXISTS "areas" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "name" text NOT NULL,
        "color" text,
        "is_default" boolean DEFAULT false NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "plans" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "type" "plan_type" DEFAULT 'personal' NOT NULL,
        "status" "plan_status" DEFAULT 'active' NOT NULL,
        "start_date" date,
        "end_date" date,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "goals" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "plan_id" uuid,
        "area_id" uuid,
        "title" text NOT NULL,
        "description" text,
        "priority" "goal_priority" DEFAULT 'medium' NOT NULL,
        "status" "goal_status" DEFAULT 'active' NOT NULL,
        "start_date" date,
        "deadline" date,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "targets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "goal_id" uuid NOT NULL,
        "parent_target_id" uuid,
        "type" "target_type" DEFAULT 'milestone' NOT NULL,
        "title" text NOT NULL,
        "description" text,
        "status" "target_status" DEFAULT 'active' NOT NULL,
        "order_index" integer DEFAULT 0 NOT NULL,
        "start_date" date,
        "due_date" date,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "tasks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "area_id" uuid,
        "goal_id" uuid,
        "target_id" uuid,
        "title" text NOT NULL,
        "description" text,
        "priority" "task_priority" DEFAULT 'medium' NOT NULL,
        "default_start_time" text,
        "default_end_time" text,
        "default_duration_minutes" integer,
        "is_recurring" boolean DEFAULT false NOT NULL,
        "recurrence_type" "recurrence_type",
        "recurrence_config" jsonb,
        "recurrence_start_date" date,
        "recurrence_end_date" date,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "task_occurrences" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "task_id" uuid NOT NULL,
        "area_id" uuid,
        "goal_id" uuid,
        "target_id" uuid,
        "title" text NOT NULL,
        "description" text,
        "priority" "task_priority" DEFAULT 'medium' NOT NULL,
        "status" "occurrence_status" DEFAULT 'todo' NOT NULL,
        "scheduled_date" date NOT NULL,
        "start_at" timestamp with time zone,
        "end_at" timestamp with time zone,
        "duration_minutes" integer,
        "completed_at" timestamp with time zone,
        "focus_started_at" timestamp with time zone,
        "focused_minutes" integer DEFAULT 0 NOT NULL,
        "rescheduled_from_id" uuid,
        "rescheduled_to_id" uuid,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "task_reminders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "occurrence_id" uuid NOT NULL,
        "offset_type" "reminder_offset_type" DEFAULT 'at_start' NOT NULL,
        "offset_minutes" integer DEFAULT 0 NOT NULL,
        "remind_at" timestamp with time zone NOT NULL,
        "is_sent" boolean DEFAULT false NOT NULL,
        "sent_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "notes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "content" text NOT NULL,
        "goal_id" uuid,
        "target_id" uuid,
        "task_id" uuid,
        "occurrence_id" uuid,
        "review_id" uuid,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "sleep_records" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "date" date NOT NULL,
        "sleep_at" timestamp with time zone NOT NULL,
        "wake_at" timestamp with time zone NOT NULL,
        "duration_minutes" integer NOT NULL,
        "quality" "sleep_quality",
        "notes" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "daily_reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "date" date NOT NULL,
        "accomplished" text,
        "blockers" text,
        "focus_tomorrow" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "daily_reviews_user_id_date_unique" UNIQUE("user_id","date")
    );

    DO $$ BEGIN
     ALTER TABLE "areas" ADD CONSTRAINT "areas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "goals" ADD CONSTRAINT "goals_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "goals" ADD CONSTRAINT "goals_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "targets" ADD CONSTRAINT "targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "targets" ADD CONSTRAINT "targets_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "targets" ADD CONSTRAINT "targets_parent_target_id_targets_id_fk" FOREIGN KEY ("parent_target_id") REFERENCES "public"."targets"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "tasks" ADD CONSTRAINT "tasks_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "tasks" ADD CONSTRAINT "tasks_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "tasks" ADD CONSTRAINT "tasks_target_id_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."targets"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "task_occurrences" ADD CONSTRAINT "task_occurrences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "task_occurrences" ADD CONSTRAINT "task_occurrences_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "task_occurrences" ADD CONSTRAINT "task_occurrences_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "task_occurrences" ADD CONSTRAINT "task_occurrences_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "task_occurrences" ADD CONSTRAINT "task_occurrences_target_id_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."targets"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "task_occurrences" ADD CONSTRAINT "task_occurrences_rescheduled_from_id_task_occurrences_id_fk" FOREIGN KEY ("rescheduled_from_id") REFERENCES "public"."task_occurrences"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "task_occurrences" ADD CONSTRAINT "task_occurrences_rescheduled_to_id_task_occurrences_id_fk" FOREIGN KEY ("rescheduled_to_id") REFERENCES "public"."task_occurrences"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_occurrence_id_task_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."task_occurrences"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "notes" ADD CONSTRAINT "notes_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "notes" ADD CONSTRAINT "notes_target_id_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."targets"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "notes" ADD CONSTRAINT "notes_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "notes" ADD CONSTRAINT "notes_occurrence_id_task_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."task_occurrences"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "notes" ADD CONSTRAINT "notes_review_id_daily_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."daily_reviews"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "sleep_records" ADD CONSTRAINT "sleep_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
     ALTER TABLE "daily_reviews" ADD CONSTRAINT "daily_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
};

exports.down = async function down(knex) {
  await knex.raw(`
    DROP TABLE IF EXISTS "notes", "task_reminders", "task_occurrences", "tasks", "targets", "goals", "plans", "areas", "daily_reviews", "sleep_records", "users" CASCADE;
    DROP TYPE IF EXISTS "public"."goal_priority", "public"."goal_status", "public"."occurrence_status", "public"."plan_status", "public"."plan_type", "public"."recurrence_type", "public"."reminder_offset_type", "public"."sleep_quality", "public"."target_status", "public"."target_type", "public"."task_priority";
  `);
};
