
import { FastifyInstance } from "fastify";
import { AnalyticsController } from "./analytics.controller";
import { authGuard } from "../../middlewares/authGuard";

export async function analyticsRoutes(app: FastifyInstance) {
  const controller = new AnalyticsController();

  app.get("/metrics", { preHandler: [authGuard] }, controller.getDashboardMetrics.bind(controller) as any);
}
