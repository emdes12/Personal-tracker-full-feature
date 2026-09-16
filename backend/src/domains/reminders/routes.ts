import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateBody, validateQuery } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import {
  createReminder,
  deleteReminder,
  listDueReminders,
  listRemindersForOccurrence,
  listUpcomingReminders,
  markReminderSent,
} from "./service";

const createSchema = z.object({
  occurrenceId: z.string().uuid(),
  offsetType: z.enum(["at_start", "5_min", "10_min", "15_min", "custom"]),
  customMinutes: z.number().int().min(0).optional(),
});

const occurrenceQuerySchema = z.object({ occurrenceId: z.string().uuid() });

export const remindersRouter = Router();
remindersRouter.use(requireAuth);

remindersRouter.get(
  "/due",
  asyncHandler(async (req, res) => {
    res.json({ reminders: await listDueReminders(req.user!.id) });
  }),
);

/** Not-yet-due alarms in the next ~36h — the mobile app schedules these as native local notifications ahead of time instead of relying on a poll. */
remindersRouter.get(
  "/upcoming",
  asyncHandler(async (req, res) => {
    res.json({ reminders: await listUpcomingReminders(req.user!.id) });
  }),
);

remindersRouter.get(
  "/",
  validateQuery(occurrenceQuerySchema),
  asyncHandler(async (req, res) => {
    const { occurrenceId } = req.query as unknown as z.infer<typeof occurrenceQuerySchema>;
    res.json({ reminders: await listRemindersForOccurrence(req.user!.id, occurrenceId) });
  }),
);

remindersRouter.post(
  "/",
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ reminder: await createReminder(req.user!.id, req.body) });
  }),
);

remindersRouter.post(
  "/:id/mark-sent",
  asyncHandler(async (req, res) => {
    res.json({ reminder: await markReminderSent(req.user!.id, req.params.id) });
  }),
);

remindersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteReminder(req.user!.id, req.params.id);
    res.status(204).end();
  }),
);
