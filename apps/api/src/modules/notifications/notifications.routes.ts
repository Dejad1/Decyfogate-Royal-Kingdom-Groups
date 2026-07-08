import { Router } from "express";
import { Role } from "@decyfogate/shared-types";
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
