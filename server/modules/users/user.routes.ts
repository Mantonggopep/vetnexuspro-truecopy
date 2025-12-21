import { FastifyInstance } from "fastify";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { authGuard } from "../../middlewares/authGuard";

export async function userRoutes(app: FastifyInstance) {
  const service = new UserService(app);
  const controller = new UserController(service);

  app.post("/", { preHandler: [authGuard] }, controller.createHandler.bind(controller) as any);
  app.get("/", { preHandler: [authGuard] }, controller.getAllHandler.bind(controller) as any);
}