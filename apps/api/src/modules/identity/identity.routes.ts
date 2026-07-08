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

identityRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await identityService.getUserById(req.auth!.sub);
    res.json(user);
  })
);
