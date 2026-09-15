import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateQuery } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import { globalSearch } from "./service";

const querySchema = z.object({ q: z.string().trim().min(1) });

export const searchRouter = Router();
searchRouter.use(requireAuth);

searchRouter.get(
  "/",
  validateQuery(querySchema),
  asyncHandler(async (req, res) => {
    const { q } = req.query as unknown as z.infer<typeof querySchema>;
    res.json(await globalSearch(req.user!.id, q));
  }),
);
