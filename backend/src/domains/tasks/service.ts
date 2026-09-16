import { db } from "../../db/index";
import type { TaskOccurrenceRow, TaskPriority, TaskRow } from "../../db/types";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { combineToUtc } from "../../lib/time";
import { syncRemindersForOccurrence } from "../reminders/service";

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  areaId?: string | null;
  goalId?: string | null;
  targetId?: string | null;
  priority?: TaskPriority;
  scheduledDate: string; // "YYYY-MM-DD", user's local calendar date
  startTime?: string | null; // "HH:MM"
  endTime?: string | null;
  durationMinutes?: number | null;
}

/**
 * Creates a one-off task definition plus its single occurrence, in one
 * transaction. Recurring task creation lives separately (Phase 2) since it
 * generates many occurrences instead of one.
 */
export async function createOneOffTask(userId: string, timezone: string, input: CreateTaskInput) {
  const startAt = combineToUtc(input.scheduledDate, input.startTime, timezone);
  const endAt = combineToUtc(input.scheduledDate, input.endTime, timezone);
  if (startAt && endAt && endAt <= startAt) {
    throw new BadRequestError("endTime must be after startTime");
  }

  return db.transaction(async (trx) => {
    const [task] = await trx<TaskRow>("tasks")
      .insert({
        userId,
        areaId: input.areaId ?? null,
        goalId: input.goalId ?? null,
        targetId: input.targetId ?? null,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? "medium",
        defaultStartTime: input.startTime ?? null,
        defaultEndTime: input.endTime ?? null,
        defaultDurationMinutes: input.durationMinutes ?? null,
        isRecurring: false,
      })
      .returning("*");

    const [occurrence] = await trx<TaskOccurrenceRow>("task_occurrences")
      .insert({
        userId,
        taskId: task.id,
        areaId: input.areaId ?? null,
        goalId: input.goalId ?? null,
        targetId: input.targetId ?? null,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? "medium",
        scheduledDate: input.scheduledDate,
        startAt,
        endAt,
        durationMinutes: input.durationMinutes ?? null,
      })
      .returning("*");

    await syncRemindersForOccurrence(occurrence, trx);

    return { task, occurrence };
  });
}

export async function getTask(userId: string, taskId: string): Promise<TaskRow> {
  const task = await db<TaskRow>("tasks").where({ id: taskId, userId }).first();
  if (!task) throw new NotFoundError("Task not found");
  return task;
}

/**
 * Deleting a task cascades to its occurrences (see schema FK). To avoid
 * silently erasing history, block the delete once any occurrence under
 * this task has actually been completed.
 */
export async function deleteTask(userId: string, taskId: string): Promise<void> {
  await getTask(userId, taskId);
  const completed = await db<TaskOccurrenceRow>("task_occurrences").where({ taskId, status: "completed" }).first();
  if (completed) {
    throw new BadRequestError(
      "This task has completed history and can't be deleted. Cancel its remaining occurrences instead.",
    );
  }
  await db<TaskRow>("tasks").where({ id: taskId, userId }).del();
}
