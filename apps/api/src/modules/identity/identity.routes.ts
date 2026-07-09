import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate } from "../../middleware/auth";
import * as identityService from "./identity.service";

export const identityRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

identityRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await identityService.login(email, password);
    res.json(result);
  })
);

const guardianLoginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});

identityRouter.post(
  "/guardian-login",
  asyncHandler(async (req, res) => {
    const { phone, password } = guardianLoginSchema.parse(req.body);
    const result = await identityService.guardianLogin(phone, password);
    res.json(result);
  })
);

identityRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await identityService.getMe(req.auth!);
    res.json(user);
  })
);
