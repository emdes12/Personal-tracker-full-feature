import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateQuery } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import { computeCompletionStreak, computeLongestStreak } from "./service";

const querySchema = z.object({ goalId: z.string().uuid().optional() });

export const streaksRouter = Router();
streaksRouter.use(requireAuth);

streaksRouter.get(
  "/",
  validateQuery(querySchema),
  asyncHandler(async (req, res) => {
    const { goalId } = req.query as unknown as z.infer<typeof querySchema>;
    const [streak, longest] = await Promise.all([
      computeCompletionStreak(req.user!.id, req.user!.timezone, goalId),
      computeLongestStreak(req.user!.id, req.user!.timezone, goalId),
    ]);
    res.json({ streak, longest });
  }),
);
