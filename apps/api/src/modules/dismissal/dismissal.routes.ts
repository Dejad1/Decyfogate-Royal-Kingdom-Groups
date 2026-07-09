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
  "/authorized-list",
  requireRole(...teacherRoles),
  asyncHandler(async (req, res) => {
    const studentId = req.query.studentId as string;
    const date = (req.query.date as string) ?? new Date().toISOString();
    if (!studentId) return res.status(400).json({ error: "studentId is required" });
    res.json(await dismissalService.getAuthorizedPickupList(req.auth!, studentId, date));
  })
);

const addOneOffSchema = z.object({
  studentId: z.string().uuid(),
  fullName: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().optional(),
  date: z.string(),
});

dismissalRouter.post(
  "/one-off-pickup-person",
  requireRole(...teacherRoles),
  asyncHandler(async (req, res) => {
    const input = addOneOffSchema.parse(req.body);
    res.status(201).json(await dismissalService.addOneOffPickupPerson(req.auth!, input));
  })
);

const logDismissalSchema = z.object({
  studentId: z.string().uuid(),
  classUnitId: z.string().uuid(),
  date: z.string(),
  type: z.nativeEnum(DismissalType),
  guardianId: z.string().uuid().optional(),
  oneOffPickupPersonId: z.string().uuid().optional(),
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

const escalateSchema = z.object({
  studentId: z.string().uuid(),
  classUnitId: z.string().uuid(),
  attemptedPickupPersonName: z.string().min(1),
  attemptedPickupPersonPhone: z.string().optional(),
  note: z.string().optional(),
});

dismissalRouter.post(
  "/escalate",
  requireRole(...teacherRoles),
  asyncHandler(async (req, res) => {
    const input = escalateSchema.parse(req.body);
    res.status(201).json(await dismissalService.escalateUnauthorizedPickup(req.auth!, input));
  })
);

dismissalRouter.get(
  "/escalations",
  requireRole(Role.SCHOOL_ADMIN, Role.GROUP_ADMIN),
  asyncHandler(async (req, res) => {
    const schoolId = (req.query.schoolId as string) ?? req.auth!.schoolId;
    const status = req.query.status as "OPEN" | "RESOLVED" | undefined;
    if (!schoolId) return res.status(400).json({ error: "schoolId is required" });
    res.json(await dismissalService.listEscalations(req.auth!, schoolId, status));
  })
);

dismissalRouter.patch(
  "/escalations/:id/resolve",
  requireRole(Role.SCHOOL_ADMIN, Role.GROUP_ADMIN),
  asyncHandler(async (req, res) => {
    res.json(await dismissalService.resolveEscalation(req.auth!, req.params.id));
  })
);
