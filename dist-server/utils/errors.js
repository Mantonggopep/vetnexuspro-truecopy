"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
function errorHandler(error, request, reply) {
    if (error instanceof zod_1.ZodError) {
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
    return reply.status(500).send({ message: "Internal Server Error" });
}
