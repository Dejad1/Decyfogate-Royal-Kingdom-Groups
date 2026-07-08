import { Router } from "express";
import { Role } from "@decyfogate/shared-types";
import { authenticate, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";

// Billing is explicitly stubbed for the demo -- no real payment processing
// (see build brief section 4.3). This exposes read-only subscription
// records for the Billing/Account Manager role and the Group Admin.
export const billingRouter = Router();

billingRouter.use(authenticate);

billingRouter.get(
  "/subscription",
  requireRole(Role.GROUP_ADMIN, Role.BILLING_MANAGER),
  asyncHandler(async (req, res) => {
    const groupId = (req.query.groupId as string) ?? req.auth!.groupId;
    if (!groupId) throw new HttpError(400, "groupId is required");
    const subscription = await prisma.subscription.findFirst({ where: { groupId }, orderBy: { createdAt: "desc" } });
    res.json(subscription);
  })
);
