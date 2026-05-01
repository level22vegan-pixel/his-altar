import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { authRouter } from "./auth";
import { configRouter } from "./config";
import { altarReportsRouter } from "./altarReports";
import { dailyAltarReportsRouter } from "./dailyAltarReports";
import { workersRouter } from "./workers";
import { checkInsRouter } from "./checkIns";
import { serviceReportsRouter } from "./serviceReports";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/config", configRouter);
router.use("/altar-reports", altarReportsRouter);
router.use("/daily-altar-reports", dailyAltarReportsRouter);
router.use("/workers", workersRouter);
router.use("/check-ins", checkInsRouter);
router.use("/service-reports", serviceReportsRouter);

export default router;
