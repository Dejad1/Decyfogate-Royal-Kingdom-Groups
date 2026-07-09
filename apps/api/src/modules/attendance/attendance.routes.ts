import { Router } from "express";
import { z } from "zod";
import { AttendanceEntryType, AttendanceStatus, BehaviorTag, Role } from "@decyfogate/shared-types";
import { authenticate, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import * as attendanceService from "./attendance.service";

export const attendanceRouter = Router();

attendanceRouter.use(authenticate);

const markSchema = z.object({
  studentId: z.string().uuid(),
  classUnitId: z.string().uuid(),
  date: z.string(),
  status: z.nativeEnum(AttendanceStatus),
  type: z.nativeEnum(AttendanceEntryType),
  subjectId: z.string().uuid().optional(),
  period: z.string().optional(),
  behaviorTag: z.nativeEnum(BehaviorTag).optional(),
  behaviorComment: z.string().optional(),
});

attendanceRouter.post(
  "/",
  requireRole(Role.FORM_TEACHER, Role.SUBJECT_TEACHER, Role.SCHOOL_ADMIN, Role.GROUP_ADMIN),
  asyncHandler(async (req, res) => {
    const input = markSchema.parse(req.body);
    const record = await attendanceService.markAttendance(req.auth!, input);
    res.status(201).json(record);
  })
);

attendanceRouter.get(
  "/today",
  asyncHandler(async (req, res) => {
    const classUnitId = req.query.classUnitId as string;
    if (!classUnitId) return res.status(400).json({ error: "classUnitId is required" });
    res.json(await attendanceService.getTodayAttendance(req.auth!, classUnitId));
  })
);

const reportQuerySchema = z.object({
  schoolId: z.string().uuid().optional(),
  classUnitId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  from: z.string(),
  to: z.string(),
});

attendanceRouter.get(
  "/report",
  asyncHandler(async (req, res) => {
    const query = reportQuerySchema.parse(req.query);
    res.json(await attendanceService.getAttendanceReport(req.auth!, query));
  })
);

attendanceRouter.get(
  "/low-attendance-flags",
  requireRole(Role.SCHOOL_ADMIN, Role.GROUP_ADMIN),
  asyncHandler(async (req, res) => {
    const schoolId = (req.query.schoolId as string) ?? req.auth!.schoolId;
    if (!schoolId) return res.status(400).json({ error: "schoolId is required" });
    res.json(await attendanceService.getLowAttendanceFlags(req.auth!, schoolId));
  })
);

attendanceRouter.post(
  "/run-not-yet-arrived-check",
  requireRole(Role.SCHOOL_ADMIN, Role.GROUP_ADMIN),
  asyncHandler(async (req, res) => {
    const schoolId = (req.body.schoolId as string) ?? req.auth!.schoolId;
    if (!schoolId) return res.status(400).json({ error: "schoolId is required" });
    res.json(await attendanceService.runNotYetArrivedCheck(schoolId));
  })
);
