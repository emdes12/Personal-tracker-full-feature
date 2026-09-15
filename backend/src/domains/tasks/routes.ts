import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateBody } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import { createOneOffTask, deleteTask, getTask } from "./service";
import { createRecurringTask, stopRecurringTask } from "./recurringService";

const timeStr = z.string().regex(/^\d{2}:\d{2}$/);

const createTaskSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  areaId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  targetId: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  scheduledDate: z.string().date(),
  startTime: timeStr.nullable().optional(),
  endTime: timeStr.nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
});

const createRecurringTaskSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  areaId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  targetId: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  recurrenceType: z.enum(["daily", "weekdays", "weekly", "monthly", "custom"]),
  recurrenceConfig: z
    .object({
      daysOfWeek: z.array(z.number().int().min(1).max(7)).optional(),
      dayOfMonth: z.number().int().min(1).max(31).optional(),
      intervalDays: z.number().int().min(1).optional(),
    })
    .optional(),
  recurrenceStartDate: z.string().date(),
  recurrenceEndDate: z.string().date().nullable().optional(),
  startTime: timeStr.nullable().optional(),
  endTime: timeStr.nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
});

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.post(
  "/",
  validateBody(createTaskSchema),
  asyncHandler(async (req, res) => {
    const result = await createOneOffTask(req.user!.id, req.user!.timezone, req.body);
    res.status(201).json(result);
  }),
);

tasksRouter.post(
  "/recurring",
  validateBody(createRecurringTaskSchema),
  asyncHandler(async (req, res) => {
    const task = await createRecurringTask(req.user!.id, req.user!.timezone, req.body);
    res.status(201).json({ task });
  }),
);

tasksRouter.post(
  "/:id/stop-recurring",
  asyncHandler(async (req, res) => {
    res.json({ task: await stopRecurringTask(req.user!.id, req.params.id) });
  }),
);

tasksRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ task: await getTask(req.user!.id, req.params.id) });
  }),
);

tasksRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteTask(req.user!.id, req.params.id);
    res.status(204).end();
  }),
);
