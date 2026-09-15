import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateQuery } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import { getHistoryRange } from "./service";

const rangeQuerySchema = z.object({ from: z.string().date(), to: z.string().date() });

export const historyRouter = Router();
historyRouter.use(requireAuth);

historyRouter.get(
  "/",
  validateQuery(rangeQuerySchema),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as unknown as z.infer<typeof rangeQuerySchema>;
    res.json({ days: await getHistoryRange(req.user!.id, from, to) });
  }),
);
