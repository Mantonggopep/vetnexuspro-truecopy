
import { FastifyInstance } from "fastify";
import { SalesController } from "./sales.controller";
import { authGuard } from "../../middlewares/authGuard";

export async function salesRoutes(app: FastifyInstance) {
  const controller = new SalesController();

  app.post("/", { preHandler: [authGuard] }, controller.createSale.bind(controller) as any);
}
