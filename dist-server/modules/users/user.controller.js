"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
class UserController {
    constructor(service) {
        this.service = service;
    }
    async createHandler(request, reply) {
        try {
            // Force tenantId from authenticated user
            const body = request.body;
            const data = { ...body, tenantId: request.user.tenantId };
            const user = await this.service.create(data, request.user.tenantId);
            return user;
        }
        catch (e) {
            return reply.code(400).send({ message: e.message });
        }
    }
    async getAllHandler(request, reply) {
        try {
            const users = await this.service.findAll(request.user.tenantId);
            return users;
        }
        catch (e) {
            return reply.code(500).send({ message: e.message });
        }
    }
}
exports.UserController = UserController;
