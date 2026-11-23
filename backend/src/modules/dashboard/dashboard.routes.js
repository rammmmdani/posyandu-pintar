import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/role.js";
import * as controller from "./dashboard.controller.js";

const router = Router();

router.get(
  "/summary",
  authenticate,
  requireRole("koordinator"),
  controller.summary,
);

export default router;
