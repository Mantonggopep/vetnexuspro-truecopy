
import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export function errorHandler(error: any, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: "Validation Error",
      errors: error.flatten().fieldErrors,
    });
  }

  // Prisma Error Code P2002: Unique constraint failed
  if (error.code === 'P2002') {
    return reply.status(409).send({ message: "Resource already exists (Duplicate Entry)" });
  }

  if (error.statusCode) {
    return reply.status(error.statusCode).send({ message: error.message });
  }

  request.log.error(error);
  // Debug logging
  try {
    const fs = require('fs');
    fs.appendFileSync('server-error.log', `${new Date().toISOString()} - ${error.message}\n${error.stack}\n---\n`);
  } catch (err) {
    console.error('Failed to write to log file', err);
  }
  return reply.status(500).send({
    message: "Internal Server Error",
    error: error.message,
    stack: error.stack
  });
}
