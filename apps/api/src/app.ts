import express from "express";
import cors from "cors";
import { identityRouter } from "./modules/identity/identity.routes";
import { directoryRouter } from "./modules/directory/directory.routes";
import { attendanceRouter } from "./modules/attendance/attendance.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { billingRouter } from "./modules/billing/billing.routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/auth", identityRouter);
  app.use("/directory", directoryRouter);
  app.use("/attendance", attendanceRouter);
  app.use("/notifications", notificationsRouter);
  app.use("/billing", billingRouter);

  app.use(errorHandler);

  return app;
}
