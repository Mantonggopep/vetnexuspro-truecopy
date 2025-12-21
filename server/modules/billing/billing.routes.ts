
import { FastifyInstance } from "fastify";
import { BillingController } from "./billing.controller";
import { authGuard } from "../../middlewares/authGuard";

export async function billingRoutes(app: FastifyInstance) {
  const controller = new BillingController();

  app.post("/verify", { preHandler: [authGuard] }, controller.verifyPayment.bind(controller) as any);
}
