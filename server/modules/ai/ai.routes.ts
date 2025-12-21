import { FastifyInstance } from "fastify";
import { AIController } from "./ai.controller";
import { authGuard } from "../../middlewares/authGuard"; // Adjust path if using absolute imports

export async function aiRoutes(app: FastifyInstance) {
  const controller = new AIController();

  app.post("/summary", { preHandler: [authGuard] }, controller.summarizeHandler.bind(controller) as any);
  app.post("/diagnosis", { preHandler: [authGuard] }, controller.diagnosisHandler.bind(controller) as any);
  app.post("/identify", { preHandler: [authGuard] }, controller.identifyHandler.bind(controller) as any);
}