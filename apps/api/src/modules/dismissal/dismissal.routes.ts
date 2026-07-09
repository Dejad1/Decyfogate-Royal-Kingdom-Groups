import { Router } from "express";
import { z } from "zod";
import { DismissalType, Role } from "@decyfogate/shared-types";
import { authenticate, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import * as dismissalService from "./dismissal.service";

export const dismissalRouter = Router();

dismissalRouter.use(authenticate);

const teacherRoles = [Role.FORM_TEACHER, Role.SCHOOL_ADMIN, Role.GROUP_ADMIN];

dismissalRouter.get(
  "/guardian-shortlist",
  requireRole(...teacherRoles),
  asyncHandler(async (req, res) => {
    const studentId = req.query.studentId as string;
    if (!studentId) return res.status(400).json({ error: "studentId is required" });
    res.json(await dismissalService.getGuardianShortlist(req.auth!, studentId));
  })
);

const logDismissalSchema = z.object({
  studentId: z.string().uuid(),
  classUnitId: z.string().uuid(),
  date: z.string(),
  type: z.nativeEnum(DismissalType),
  pickupPersonName: z.string().optional(),
  pickupPersonRelationship: z.string().optional(),
  pickupPersonPhone: z.string().optional(),
  matchedGuardianId: z.string().uuid().optional(),
});

dismissalRouter.post(
  "/",
  requireRole(...teacherRoles),
  asyncHandler(async (req, res) => {
    const input = logDismissalSchema.parse(req.body);
    res.status(201).json(await dismissalService.logDismissal(req.auth!, input));
  })
);

dismissalRouter.get(
  "/today",
  requireRole(...teacherRoles),
  asyncHandler(async (req, res) => {
    const classUnitId = req.query.classUnitId as string;
    if (!classUnitId) return res.status(400).json({ error: "classUnitId is required" });
    res.json(await dismissalService.getTodayDismissals(req.auth!, classUnitId));
  })
);
