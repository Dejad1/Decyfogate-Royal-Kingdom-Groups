import { Router } from "express";
import { z } from "zod";
import { BroadcastScope, Role } from "@decyfogate/shared-types";
import { authenticate, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import * as notificationsService from "./notifications.service";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get(
  "/logs",
  requireRole(Role.SCHOOL_ADMIN, Role.GROUP_ADMIN, Role.SUPPORT_AGENT, Role.COMPLIANCE_OFFICER, Role.FORM_TEACHER),
  asyncHandler(async (req, res) => {
    const schoolId = (req.query.schoolId as string) ?? req.auth!.schoolId;
    if (!schoolId) {
      return res.status(400).json({ error: "schoolId is required" });
    }
    res.json(await notificationsService.listNotificationLogs(schoolId));
  })
);

const broadcastSchema = z.object({
  scope: z.nativeEnum(BroadcastScope),
  groupId: z.string().uuid().optional(),
  schoolId: z.string().uuid().optional(),
  classLevelId: z.string().uuid().optional(),
  classUnitId: z.string().uuid().optional(),
  message: z.string().min(1).max(480),
});

notificationsRouter.post(
  "/broadcast",
  requireRole(Role.SCHOOL_ADMIN, Role.GROUP_ADMIN),
  asyncHandler(async (req, res) => {
    const input = broadcastSchema.parse(req.body);
    res.status(201).json(await notificationsService.sendBroadcast(req.auth!, input));
  })
);
