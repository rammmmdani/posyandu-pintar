import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/role.js";
import { validate } from "../../middlewares/validate.js";
import { createReportSchema, listQuerySchema } from "./reports.schema.js";
import * as controller from "./reports.controller.js";

const router = Router();

router.use(authenticate, requireRole("koordinator")); // dipasang hanya di /reports

router.get("/", validate(listQuerySchema, "query"), controller.list);
router.post("/", validate(createReportSchema), controller.create);
router.get("/:id", controller.detail);
router.get("/:id/download", controller.download);

export default router;
