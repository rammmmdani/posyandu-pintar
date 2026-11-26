import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import * as controller from "./menus.controller.js";

const router = Router();

router.get(
  "/recommendations",
  authenticate,
  validate(controller.querySchema, "query"),
  controller.recommendations,
);

export default router;
