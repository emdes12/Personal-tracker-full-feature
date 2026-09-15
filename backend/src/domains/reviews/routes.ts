import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateBody, validateQuery } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import { getReview, upsertReview } from "./service";

const dateQuerySchema = z.object({ date: z.string().date() });

const upsertSchema = z.object({
  accomplished: z.string().trim().nullable().optional(),
  blockers: z.string().trim().nullable().optional(),
  focusTomorrow: z.string().trim().nullable().optional(),
});

export const reviewsRouter = Router();
reviewsRouter.use(requireAuth);

reviewsRouter.get(
  "/",
  validateQuery(dateQuerySchema),
  asyncHandler(async (req, res) => {
    const { date } = req.query as unknown as z.infer<typeof dateQuerySchema>;
    res.json(await getReview(req.user!.id, date));
  }),
);

reviewsRouter.put(
  "/",
  validateQuery(dateQuerySchema),
  validateBody(upsertSchema),
  asyncHandler(async (req, res) => {
    const { date } = req.query as unknown as z.infer<typeof dateQuerySchema>;
    res.json({ review: await upsertReview(req.user!.id, date, req.body) });
  }),
);
