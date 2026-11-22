import { Router } from "express";
import { query } from "./config/db.js";
import { sendSuccess } from "./utils/response.js";
import authRoutes from "./modules/auth/auth.routes.js";
import childrenRoutes from "./modules/children/children.routes.js";
import measurementRoutes from "./modules/measurements/measurements.routes.js";
import growthRoutes from "./modules/growth/growth.routes.js";

const router = Router();

router.get("/health", async (req, res) => {
  await query("SELECT 1");
  sendSuccess(res, {
    message: "Server berjalan",
    data: { status: "ok", database: "connected" },
  });
});

router.use("/auth", authRoutes);
router.use(measurementRoutes);
router.use(growthRoutes);
router.use("/children", childrenRoutes);

export default router;
