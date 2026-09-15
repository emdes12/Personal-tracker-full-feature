import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateBody } from "../../lib/validate";
import { requireAuth } from "../../middleware/requireAuth";
import { chat } from "./service";
import { getAiClient } from "./client";

const chatSchema = z.object({
  message: z.string().trim().min(1),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .optional(),
});

export const aiRouter = Router();
aiRouter.use(requireAuth);

aiRouter.get("/status", (_req, res) => {
  res.json({ configured: getAiClient() !== null });
});

aiRouter.post(
  "/chat",
  validateBody(chatSchema),
  asyncHandler(async (req, res) => {
    const { message, history } = req.body as z.infer<typeof chatSchema>;
    res.json(await chat(req.user!.id, req.user!.timezone, message, history ?? []));
  }),
);
