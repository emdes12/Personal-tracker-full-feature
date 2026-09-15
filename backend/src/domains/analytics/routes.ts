import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/requireAuth";
import { getDashboardStats, getLifetimeStats } from "./service";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

analyticsRouter.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    res.json(await getDashboardStats(req.user!.id, req.user!.timezone));
  }),
);

analyticsRouter.get(
  "/lifetime",
  asyncHandler(async (req, res) => {
    res.json(await getLifetimeStats(req.user!.id));
  }),
);
