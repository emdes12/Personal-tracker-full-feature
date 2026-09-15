import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateBody, validateQuery } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import { createNote, deleteNote, listNotes, updateNote } from "./service";

const filterSchema = z.object({
  goalId: z.string().uuid().optional(),
  targetId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  occurrenceId: z.string().uuid().optional(),
  reviewId: z.string().uuid().optional(),
});

const createSchema = z.object({
  content: z.string().trim().min(1),
  goalId: z.string().uuid().nullable().optional(),
  targetId: z.string().uuid().nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
  occurrenceId: z.string().uuid().nullable().optional(),
  reviewId: z.string().uuid().nullable().optional(),
});

const updateSchema = z.object({ content: z.string().trim().min(1) });

export const notesRouter = Router();
notesRouter.use(requireAuth);

notesRouter.get(
  "/",
  validateQuery(filterSchema),
  asyncHandler(async (req, res) => {
    res.json({ notes: await listNotes(req.user!.id, req.query as z.infer<typeof filterSchema>) });
  }),
);

notesRouter.post(
  "/",
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ note: await createNote(req.user!.id, req.body) });
  }),
);

notesRouter.patch(
  "/:id",
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    res.json({ note: await updateNote(req.user!.id, req.params.id, req.body.content) });
  }),
);

notesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteNote(req.user!.id, req.params.id);
    res.status(204).end();
  }),
);
