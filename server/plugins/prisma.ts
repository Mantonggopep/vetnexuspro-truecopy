
import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { PrismaClient } from "@prisma/client";

const prismaPlugin: FastifyPluginAsync = fp(async (server, options) => {
  const prisma = new PrismaClient({
    log: ['error', 'warn']
  });

  await prisma.$connect();

  server.decorate("prisma", prisma);

  server.addHook("onClose", async (server) => {
    await server.prisma.$disconnect();
  });
});

export default prismaPlugin;
