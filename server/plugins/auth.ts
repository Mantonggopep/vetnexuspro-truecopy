
import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env";

const authPlugin: FastifyPluginAsync = fp(async (app) => {
  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  app.register(fastifyCookie, {
    secret: env.COOKIE_SECRET,
    hook: "onRequest",
  });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = request.cookies.token;
      if (!token) {
        // Fallback to Header
        await request.jwtVerify();
      } else {
        const decoded = app.jwt.verify(token);
        request.user = decoded as any;
      }
    } catch (err) {
      reply.status(401).send({ message: "Unauthorized" });
    }
  });
});

export default authPlugin;
