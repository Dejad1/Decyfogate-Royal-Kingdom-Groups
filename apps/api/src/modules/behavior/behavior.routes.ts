import { Router } from "express";
import { Role } from "@decyfogate/shared-types";
import { authenticate, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import * as behaviorService from "./behavior.service";

export const behaviorRouter = Router();

behaviorRouter.use(authenticate);

const adminRoles = [Role.SCHOOL_ADMIN, Role.GROUP_ADMIN];

behaviorRouter.get(
  "/alerts",
  requireRole(...adminRoles),
  asyncHandler(async (req, res) => {
    const schoolId = (req.query.schoolId as string) ?? req.auth!.schoolId;
    if (!schoolId) return res.status(400).json({ error: "schoolId is required" });
    res.json(await behaviorService.listBehaviorAlerts(req.auth!, schoolId));
  })
);

behaviorRouter.post(
  "/alerts/:id/acknowledge",
  requireRole(...adminRoles),
  asyncHandler(async (req, res) => {
    res.json(await behaviorService.acknowledgeBehaviorAlert(req.auth!, req.params.id));
  })
);

behaviorRouter.post(
  "/run-end-of-day-digest",
  requireRole(...adminRoles),
  asyncHandler(async (req, res) => {
    const schoolId = (req.body.schoolId as string) ?? req.auth!.schoolId;
    if (!schoolId) return res.status(400).json({ error: "schoolId is required" });
    res.json(await behaviorService.runEndOfDayDigest(req.auth!, schoolId));
  })
);
