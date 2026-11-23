import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import {
  statusSchema,
  followUpSchema,
  listQuerySchema,
} from "./alerts.schema.js";
import * as controller from "./alerts.controller.js";

const router = Router();

router.use(authenticate); // dipasang hanya di /alerts

router.get("/", validate(listQuerySchema, "query"), controller.list);
router.get("/:id", controller.detail);
router.patch("/:id/status", validate(statusSchema), controller.updateStatus);
router.get("/:id/follow-ups", controller.listFollowUps);
router.post(
  "/:id/follow-ups",
  validate(followUpSchema),
  controller.addFollowUp,
);

export default router;
