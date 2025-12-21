
import { FastifyRequest, FastifyReply } from "fastify";

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  await request.server.authenticate(request, reply);
}
