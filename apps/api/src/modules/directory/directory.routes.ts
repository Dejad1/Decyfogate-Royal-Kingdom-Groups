import { Router } from "express";
import { z } from "zod";
import { Role } from "@decyfogate/shared-types";
import { authenticate, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import * as directoryService from "./directory.service";

export const directoryRouter = Router();

directoryRouter.use(authenticate);

directoryRouter.get(
  "/schools",
  asyncHandler(async (req, res) => {
    res.json(await directoryService.listSchoolsForActor(req.auth!));
  })
);

directoryRouter.get(
  "/schools/:schoolId/class-levels",
  asyncHandler(async (req, res) => {
    res.json(await directoryService.getSchoolClassLevels(req.params.schoolId));
  })
);

directoryRouter.get(
  "/schools/:schoolId/subjects",
  asyncHandler(async (req, res) => {
    res.json(await directoryService.getSchoolSubjects(req.params.schoolId));
  })
);

directoryRouter.get(
  "/schools/:schoolId/staff",
  requireRole(Role.SCHOOL_ADMIN, Role.GROUP_ADMIN),
  asyncHandler(async (req, res) => {
    res.json(await directoryService.getSchoolStaff(req.auth!, req.params.schoolId));
  })
);

const enrollStudentSchema = z.object({
  classUnitId: z.string().uuid(),
  fullName: z.string().min(1),
  admissionNumber: z.string().min(1),
  dateOfBirth: z.string(),
  gender: z.enum(["MALE", "FEMALE"]),
  guardians: z
    .array(
      z.object({
        fullName: z.string().min(1),
        phone: z.string().min(1),
        relationship: z.string().min(1),
        isPrimary: z.boolean(),
      })
    )
    .min(1),
});

directoryRouter.post(
  "/students",
  requireRole(Role.SCHOOL_ADMIN, Role.GROUP_ADMIN),
  asyncHandler(async (req, res) => {
    const input = enrollStudentSchema.parse(req.body);
    res.status(201).json(await directoryService.enrollStudent(req.auth!, input));
  })
);

directoryRouter.get(
  "/class-units/mine",
  asyncHandler(async (req, res) => {
    res.json(await directoryService.listMyClassUnits(req.auth!));
  })
);

directoryRouter.get(
  "/class-units/:classUnitId/roster",
  asyncHandler(async (req, res) => {
    res.json(await directoryService.getRoster(req.auth!, req.params.classUnitId));
  })
);
