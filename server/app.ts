
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastifyCompress from "@fastify/compress";
import path from "path";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import prismaPlugin from "./plugins/prisma";
import authPlugin from "./plugins/auth";
import { errorHandler } from "./utils/errors";
import { authRoutes } from "./modules/auth/auth.routes";
import { userRoutes } from "./modules/users/user.routes";
import { aiRoutes } from "./modules/ai/ai.routes";
import { syncRoutes } from "./modules/sync/sync.routes";
import { salesRoutes } from "./modules/sales/sales.routes";
import { billingRoutes } from "./modules/billing/billing.routes";
import { analyticsRoutes } from "./modules/analytics/analytics.routes"; // New
import { ResourceController } from "./modules/general/resource.controller";
import { authGuard } from "./middlewares/authGuard";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export function buildApp() {
  const app = Fastify({
    logger: true,
    ignoreTrailingSlash: true
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);

  app.register(fastifyCompress);
  app.register(cors, { origin: true });
  app.register(prismaPlugin);
  app.register(authPlugin);

  app.register(fastifyStatic, {
    root: path.join((process as any).cwd(), 'public'),
    wildcard: false
  });

  app.register(swagger, {
    swagger: {
      info: { title: 'VetNexus API', version: '2.0.0' },
      securityDefinitions: { BearerAuth: { type: 'apiKey', name: 'Authorization', in: 'header' } }
    }
  });
  app.register(swaggerUi, { routePrefix: '/docs' });

  app.register(async (api) => {
    api.register(authRoutes, { prefix: "/auth" });
    api.register(userRoutes, { prefix: "/users" });
    api.register(aiRoutes, { prefix: "/ai" });
    api.register(syncRoutes, { prefix: "/sync" });
    api.register(salesRoutes, { prefix: "/sales" });
    api.register(billingRoutes, { prefix: "/billing" });
    api.register(analyticsRoutes, { prefix: "/analytics" }); // Register Analytics

    const resourceController = new ResourceController((api as any).prisma);

    api.get("/:collection", { preHandler: [authGuard] }, resourceController.getAll.bind(resourceController) as any);
    api.get("/:collection/*", { preHandler: [authGuard] }, resourceController.getOne.bind(resourceController) as any);
    api.post("/:collection", { preHandler: [authGuard] }, resourceController.create.bind(resourceController) as any);
    api.put("/:collection/*", { preHandler: [authGuard] }, resourceController.update.bind(resourceController) as any);
    api.delete("/:collection/*", { preHandler: [authGuard] }, resourceController.delete.bind(resourceController) as any);

  }, { prefix: "/api" });

  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url && req.raw.url.startsWith('/api')) {
      reply.code(404).send({ message: 'API Route not found' });
      return;
    }
    return reply.sendFile('index.html');
  });

  return app;
}