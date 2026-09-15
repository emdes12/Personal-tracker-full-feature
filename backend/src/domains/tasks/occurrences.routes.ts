import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateBody, validateQuery } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import {
  cancelOccurrence,
  completeOccurrence,
  getOccurrence,
  listOccurrencesInRange,
  rescheduleOccurrence,
  reopenOccurrence,
  skipOccurrence,
  startFocus,
  startOccurrence,
  stopFocus,
  updateOccurrence,
} from "./occurrences.service";
import { ensureRollingOccurrences } from "./recurringService";

const timeStr = z.string().regex(/^\d{2}:\d{2}$/);

const rangeQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  startTime: timeStr.nullable().optional(),
  endTime: timeStr.nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
});

const rescheduleSchema = z.object({
  newDate: z.string().date(),
});

export const occurrencesRouter = Router();
occurrencesRouter.use(requireAuth);

occurrencesRouter.get(
  "/",
  validateQuery(rangeQuerySchema),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as unknown as z.infer<typeof rangeQuerySchema>;
    await ensureRollingOccurrences(req.user!.id, req.user!.timezone);
    res.json({ occurrences: await listOccurrencesInRange(req.user!.id, from, to) });
  }),
);

occurrencesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ occurrence: await getOccurrence(req.user!.id, req.params.id) });
  }),
);

occurrencesRouter.patch(
  "/:id",
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    res.json({ occurrence: await updateOccurrence(req.user!.id, req.params.id, req.user!.timezone, req.body) });
  }),
);

occurrencesRouter.post(
  "/:id/start",
  asyncHandler(async (req, res) => {
    res.json({ occurrence: await startOccurrence(req.user!.id, req.params.id) });
  }),
);

occurrencesRouter.post(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    res.json({ occurrence: await completeOccurrence(req.user!.id, req.params.id) });
  }),
);

occurrencesRouter.post(
  "/:id/reopen",
  asyncHandler(async (req, res) => {
    res.json({ occurrence: await reopenOccurrence(req.user!.id, req.params.id) });
  }),
);

occurrencesRouter.post(
  "/:id/skip",
  asyncHandler(async (req, res) => {
    res.json({ occurrence: await skipOccurrence(req.user!.id, req.params.id) });
  }),
);

occurrencesRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    res.json({ occurrence: await cancelOccurrence(req.user!.id, req.params.id) });
  }),
);

occurrencesRouter.post(
  "/:id/focus/start",
  asyncHandler(async (req, res) => {
    res.json({ occurrence: await startFocus(req.user!.id, req.params.id) });
  }),
);

occurrencesRouter.post(
  "/:id/focus/stop",
  asyncHandler(async (req, res) => {
    res.json({ occurrence: await stopFocus(req.user!.id, req.params.id) });
  }),
);

occurrencesRouter.post(
  "/:id/reschedule",
  validateBody(rescheduleSchema),
  asyncHandler(async (req, res) => {
    const { newDate } = req.body as z.infer<typeof rescheduleSchema>;
    res.json(await rescheduleOccurrence(req.user!.id, req.params.id, req.user!.timezone, newDate));
  }),
);
