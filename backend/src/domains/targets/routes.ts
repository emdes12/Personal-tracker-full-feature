import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateBody } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import { createTarget, deleteTarget, getTarget, updateTarget } from "./service";

const createSchema = z.object({
  goalId: z.string().uuid(),
  parentTargetId: z.string().uuid().nullable().optional(),
  type: z.enum(["milestone", "monthly", "weekly", "custom"]).optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  orderIndex: z.number().int().optional(),
  startDate: z.string().date().nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
});

const updateSchema = createSchema.omit({ goalId: true }).partial().extend({
  status: z.enum(["active", "completed", "archived", "cancelled"]).optional(),
});

export const targetsRouter = Router();
targetsRouter.use(requireAuth);

targetsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ target: await getTarget(req.user!.id, req.params.id) });
  }),
);

targetsRouter.post(
  "/",
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ target: await createTarget(req.user!.id, req.body) });
  }),
);

targetsRouter.patch(
  "/:id",
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    res.json({ target: await updateTarget(req.user!.id, req.params.id, req.body) });
  }),
);

targetsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteTarget(req.user!.id, req.params.id);
    res.status(204).end();
  }),
);
