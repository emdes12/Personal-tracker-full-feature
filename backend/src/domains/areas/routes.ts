import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateBody } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import { createArea, deleteArea, listAreas, updateArea } from "./service";

const createSchema = z.object({
  name: z.string().trim().min(1),
  color: z.string().trim().min(1).nullable().optional(),
});

const updateSchema = createSchema.partial();

export const areasRouter = Router();
areasRouter.use(requireAuth);

areasRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ areas: await listAreas(req.user!.id) });
  }),
);

areasRouter.post(
  "/",
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ area: await createArea(req.user!.id, req.body) });
  }),
);

areasRouter.patch(
  "/:id",
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    res.json({ area: await updateArea(req.user!.id, req.params.id, req.body) });
  }),
);

areasRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteArea(req.user!.id, req.params.id);
    res.status(204).end();
  }),
);
