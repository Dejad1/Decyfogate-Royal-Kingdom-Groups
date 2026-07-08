import { Router } from "express";
import { authenticate } from "../../middleware/auth";
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
