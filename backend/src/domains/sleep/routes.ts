import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateBody, validateQuery } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import {
  createSleepRecord,
  deleteSleepRecord,
  getSleepRecordForDate,
  listSleepRecordsInRange,
  updateSleepRecord,
} from "./service";

const timeStr = z.string().regex(/^\d{2}:\d{2}$/);

const inputSchema = z.object({
  sleepDate: z.string().date(),
  sleepTime: timeStr,
  wakeDate: z.string().date(),
  wakeTime: timeStr,
  quality: z.enum(["poor", "fair", "good", "excellent"]).nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

const rangeQuerySchema = z.object({ from: z.string().date(), to: z.string().date() });
const dateQuerySchema = z.object({ date: z.string().date() });

export const sleepRouter = Router();
sleepRouter.use(requireAuth);

sleepRouter.get(
  "/",
  validateQuery(rangeQuerySchema),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as unknown as z.infer<typeof rangeQuerySchema>;
    res.json({ records: await listSleepRecordsInRange(req.user!.id, from, to) });
  }),
);

sleepRouter.get(
  "/for-date",
  validateQuery(dateQuerySchema),
  asyncHandler(async (req, res) => {
    const { date } = req.query as unknown as z.infer<typeof dateQuerySchema>;
    res.json({ record: (await getSleepRecordForDate(req.user!.id, date)) ?? null });
  }),
);

sleepRouter.post(
  "/",
  validateBody(inputSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ record: await createSleepRecord(req.user!.id, req.user!.timezone, req.body) });
  }),
);

sleepRouter.patch(
  "/:id",
  validateBody(inputSchema),
  asyncHandler(async (req, res) => {
    res.json({ record: await updateSleepRecord(req.user!.id, req.params.id, req.user!.timezone, req.body) });
  }),
);

sleepRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteSleepRecord(req.user!.id, req.params.id);
    res.status(204).end();
  }),
);
