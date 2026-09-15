import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateQuery } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import { todayInTimezone } from "../../lib/time";
import { getTodayView } from "./service";

const querySchema = z.object({ date: z.string().date().optional() });

export const todayRouter = Router();
todayRouter.use(requireAuth);

todayRouter.get(
  "/",
  validateQuery(querySchema),
  asyncHandler(async (req, res) => {
    const { date } = req.query as unknown as z.infer<typeof querySchema>;
    const resolvedDate = date ?? todayInTimezone(req.user!.timezone);
    res.json(await getTodayView(req.user!.id, req.user!.timezone, resolvedDate));
  }),
);
