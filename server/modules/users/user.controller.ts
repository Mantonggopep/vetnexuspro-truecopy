
import { FastifyRequest, FastifyReply } from "fastify";
import { UserService } from "./user.service";

export class UserController {
  constructor(private service: UserService) { }

  async createHandler(request: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    try {
      // Force tenantId from authenticated user
      const body = request.body as Record<string, any>;
      const data = { ...body, tenantId: request.user.tenantId };
      const user = await this.service.create(data, request.user.tenantId);

      // Log the Action
      await this.logAction(request, 'CREATE', 'USER', user.id, data);

      return user;
    } catch (e: any) {
      return reply.code(400).send({ message: e.message });
    }
  }

  async getAllHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
      const users = await this.service.findAll(request.user.tenantId);
      return users;
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  }

  private async logAction(request: FastifyRequest, action: string, collection: string, recordId: string, details: any) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...safeDetails } = details;
      await request.server.prisma.auditLog.create({
        data: {
          id: `log${Date.now()}${Math.random().toString(36).substring(2, 7)}`,
          tenantId: request.user.tenantId,
          branchId: request.user.branchId || null,
          userId: request.user.id,
          userName: request.user.name,
          timestamp: new Date(),
          action: `${action}_${collection.toUpperCase()}`,
          details: JSON.stringify({ id: recordId, ...safeDetails })
        }
      });
    } catch (e) {
      console.error("Audit Logging Failed:", e);
    }
  }
}
