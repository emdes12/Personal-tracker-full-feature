import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { authRouter } from "./domains/auth/routes";
import { areasRouter } from "./domains/areas/routes";
import { plansRouter } from "./domains/plans/routes";
import { goalsRouter } from "./domains/goals/routes";
import { targetsRouter } from "./domains/targets/routes";
import { tasksRouter } from "./domains/tasks/routes";
import { occurrencesRouter } from "./domains/tasks/occurrences.routes";
import { todayRouter } from "./domains/today/routes";
import { notesRouter } from "./domains/notes/routes";
import { sleepRouter } from "./domains/sleep/routes";
import { reviewsRouter } from "./domains/reviews/routes";
import { remindersRouter } from "./domains/reminders/routes";
import { historyRouter } from "./domains/history/routes";
import { searchRouter } from "./domains/search/routes";
import { streaksRouter } from "./domains/streaks/routes";
import { analyticsRouter } from "./domains/analytics/routes";
import { aiRouter } from "./domains/ai/routes";
import { errorHandler } from "./middleware/errorHandler";

const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",").map((s) => s.trim());

export function createApp() {
  const app = express();

  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/areas", areasRouter);
  app.use("/api/plans", plansRouter);
  app.use("/api/goals", goalsRouter);
  app.use("/api/targets", targetsRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/occurrences", occurrencesRouter);
  app.use("/api/today", todayRouter);
  app.use("/api/notes", notesRouter);
  app.use("/api/sleep", sleepRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/reminders", remindersRouter);
  app.use("/api/history", historyRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/streaks", streaksRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/ai", aiRouter);

  app.use(errorHandler);

  return app;
}
