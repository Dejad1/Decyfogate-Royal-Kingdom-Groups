import { Router } from "express";
import { z } from "zod";
import { DevicePlatform, NotificationChannel, Role } from "@decyfogate/shared-types";
import { authenticate, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import * as guardianService from "./guardian.service";

export const guardianRouter = Router();

guardianRouter.use(authenticate, requireRole(Role.GUARDIAN));

guardianRouter.get(
  "/children",
  asyncHandler(async (req, res) => {
    res.json(await guardianService.listMyChildren(req.auth!));
  })
);

guardianRouter.get(
  "/notifications",
  asyncHandler(async (req, res) => {
    res.json(await guardianService.listMyNotifications(req.auth!));
  })
);

guardianRouter.get(
  "/preferences",
  asyncHandler(async (req, res) => {
    res.json(await guardianService.getPreferences(req.auth!));
  })
);

const updatePreferencesSchema = z.object({
  channels: z.array(z.nativeEnum(NotificationChannel)).min(1),
});

guardianRouter.patch(
  "/preferences",
  asyncHandler(async (req, res) => {
    const { channels } = updatePreferencesSchema.parse(req.body);
    res.json(await guardianService.updatePreferences(req.auth!, channels));
  })
);

const registerDeviceTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.nativeEnum(DevicePlatform),
});

guardianRouter.post(
  "/device-tokens",
  asyncHandler(async (req, res) => {
    const { token, platform } = registerDeviceTokenSchema.parse(req.body);
    res.json(await guardianService.registerDeviceToken(req.auth!, token, platform));
  })
);
