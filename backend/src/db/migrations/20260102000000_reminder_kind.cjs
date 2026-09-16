/**
 * Adds a start/end "kind" to task_reminders so a single task can carry both
 * an approaching-start alarm and an end-of-task alarm, auto-managed by the
 * app (see domains/reminders/service.ts::syncRemindersForOccurrence) rather
 * than requiring the user to manually add each one.
 */

exports.up = async function up(knex) {
  await knex.raw(`
    DO $$ BEGIN
     CREATE TYPE "public"."reminder_kind" AS ENUM('start', 'end');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    ALTER TABLE "task_reminders" ADD COLUMN IF NOT EXISTS "kind" "reminder_kind" NOT NULL DEFAULT 'start';
  `);
};

exports.down = async function down(knex) {
  await knex.raw(`
    ALTER TABLE "task_reminders" DROP COLUMN IF EXISTS "kind";
    DROP TYPE IF EXISTS "public"."reminder_kind";
  `);
};
