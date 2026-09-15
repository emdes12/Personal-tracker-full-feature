import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateBody } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import { createPlan, deletePlan, getPlan, listPlans, updatePlan } from "./service";

const PLAN_TYPES = [
  "yearly",
  "quarterly",
  "monthly",
  "personal",
  "project",
  "career",
  "school",
  "work",
  "lifestyle",
] as const;

const createSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  type: z.enum(PLAN_TYPES).optional(),
  startDate: z.string().date().nullable().optional(),
  endDate: z.string().date().nullable().optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(["active", "completed", "archived"]).optional(),
});

export const plansRouter = Router();
plansRouter.use(requireAuth);

plansRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ plans: await listPlans(req.user!.id) });
  }),
);

plansRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ plan: await getPlan(req.user!.id, req.params.id) });
  }),
);

plansRouter.post(
  "/",
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ plan: await createPlan(req.user!.id, req.body) });
  }),
);

plansRouter.patch(
  "/:id",
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    res.json({ plan: await updatePlan(req.user!.id, req.params.id, req.body) });
  }),
);

plansRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deletePlan(req.user!.id, req.params.id);
    res.status(204).end();
  }),
);
