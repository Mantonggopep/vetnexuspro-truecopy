
import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";

export class UserService {
  constructor(private app: FastifyInstance) { }

  async create(data: any, actorTenantId: string) {
    // Strict Multi-tenancy check
    if (data.tenantId !== actorTenantId) throw new Error("Unauthorized tenant access");

    // Hash password if present (and not already hashed - simple check length)
    if (data.password && data.password.length < 50) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    // Remove 'roles' if present as Prisma schema only has singular 'role'
    const { roles, ...prismaData } = data;

    return this.app.prisma.user.create({ data: prismaData });
  }

  async findAll(tenantId: string) {
    return this.app.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        branchId: true,
        title: true,
        tenantId: true,
        clientId: true,
        joinedDate: true
      }
    });
  }
}
