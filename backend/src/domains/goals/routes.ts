import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateBody } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import { listTargetsForGoal } from "../targets/service";
import { createGoal, deleteGoal, getGoal, listGoals, updateGoal } from "./service";

const createSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  planId: z.string().uuid().nullable().optional(),
  areaId: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  startDate: z.string().date().nullable().optional(),
  deadline: z.string().date().nullable().optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(["active", "completed", "archived", "cancelled"]).optional(),
});

export const goalsRouter = Router();
goalsRouter.use(requireAuth);

goalsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ goals: await listGoals(req.user!.id) });
  }),
);

goalsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const goal = await getGoal(req.user!.id, req.params.id);
    const targets = await listTargetsForGoal(req.user!.id, req.params.id);
    res.json({ goal, targets });
  }),
);

goalsRouter.post(
  "/",
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ goal: await createGoal(req.user!.id, req.body) });
  }),
);

goalsRouter.patch(
  "/:id",
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    res.json({ goal: await updateGoal(req.user!.id, req.params.id, req.body) });
  }),
);

goalsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteGoal(req.user!.id, req.params.id);
    res.status(204).end();
  }),
);
