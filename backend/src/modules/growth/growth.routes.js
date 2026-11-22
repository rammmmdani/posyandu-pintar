import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import * as controller from "./growth.controller.js";

const router = Router();

router.get("/measurements/:id/assessment", authenticate, controller.assessment);
router.get("/children/:id/growth", authenticate, controller.growth);

export default router;
