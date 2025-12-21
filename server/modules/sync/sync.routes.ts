
import { FastifyInstance } from "fastify";
import { SyncController } from "./sync.controller";
import { authGuard } from "../../middlewares/authGuard";

export async function syncRoutes(app: FastifyInstance) {
  const controller = new SyncController();

  app.get("/bootstrap", { preHandler: [authGuard] }, controller.bootstrapHandler.bind(controller));
  app.get("/chats", { preHandler: [authGuard] }, controller.chatsHandler.bind(controller));
}
