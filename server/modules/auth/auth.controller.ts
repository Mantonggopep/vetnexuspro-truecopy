
import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.service";
import { LoginInput, SignupInput, RegisterTenantInput } from "./auth.schema";

export class AuthController {
  constructor(private service: AuthService) { }

  async loginHandler(request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) {
    try {
      const user = await this.service.login(request.body);

      const token = await reply.jwtSign({
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        branchId: user.branchId,
        clientId: user.clientId, // Required for Client Portal sync
        name: user.name
      });

      // Set cookie
      reply.setCookie('token', token, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: true
      });

      // Log Login
      await this.logAction(user.tenantId!, user.branchId!, user.id, user.name, 'LOGIN', user.id, { email: user.email });

      return { token, user };
    } catch (e: any) {
      return reply.code(401).send({ message: e.message });
    }
  }

  async signupHandler(request: FastifyRequest<{ Body: SignupInput }>, reply: FastifyReply) {
    try {
      const user = await this.service.signup(request.body);

      // Log Signup
      await this.logAction(user.tenantId!, user.branchId!, user.id, user.name, 'SIGNUP', user.id, { email: user.email });

      return { user };
    } catch (e: any) {
      return reply.code(400).send({ message: e.message });
    }
  }

  async registerTenantHandler(request: FastifyRequest<{ Body: RegisterTenantInput }>, reply: FastifyReply) {
    try {
      const result = await this.service.registerTenant(request.body);

      // Auto-login: Generate token for the new admin
      const token = await reply.jwtSign({
        id: result.admin.id,
        email: result.admin.email,
        role: result.admin.role,
        tenantId: result.admin.tenantId,
        branchId: result.admin.branchId,
        clientId: result.admin.clientId,
        name: result.admin.name
      });

      reply.setCookie('token', token, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: true
      });

      // Log Tenant Registration
      await this.logAction(result.tenant.id, result.branch.id, result.admin.id, result.admin.name, 'REGISTER_TENANT', result.tenant.id, { name: result.tenant.name });

      return { ...result, token };
    } catch (e: any) {
      request.log.error(e);
      return reply.code(400).send({ message: "Registration failed", details: e.message });
    }
  }

  async forgotPasswordHandler(request: FastifyRequest<{ Body: { email: string } }>, reply: FastifyReply) {
    try {
      await this.service.forgotPassword(request.body.email);
      return { message: "If that email exists, a reset link has been sent." };
    } catch (e) {
      request.log.error(e);
      return { message: "If that email exists, a reset link has been sent." };
    }
  }

  async resetPasswordConfirmHandler(request: FastifyRequest<{ Body: { token: string, password: string } }>, reply: FastifyReply) {
    try {
      await this.service.resetPasswordConfirm(request.body.token, request.body.password);

      // Note: We don't have user info here easily without fetching from DB again or returning from service.
      // For now, let's keep it simple.

      return { message: "Password updated successfully." };
    } catch (e: any) {
      return reply.code(400).send({ message: e.message });
    }
  }

  async meHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = await request.server.prisma.user.findUnique({
        where: { id: request.user.id }
      });

      if (!user) {
        return reply.code(401).send({ message: "User not found" });
      }

      return user;
    } catch (e) {
      return reply.code(500).send({ message: "Internal Server Error" });
    }
  }

  private async logAction(tenantId: string, branchId: string | null, userId: string, userName: string, action: string, recordId: string, details: any) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...safeDetails } = details;
      await (this.service as any).app.prisma.auditLog.create({
        data: {
          id: `log${Date.now()}${Math.random().toString(36).substring(2, 7)}`,
          tenantId: tenantId,
          branchId: branchId || null,
          userId: userId,
          userName: userName,
          timestamp: new Date(),
          action: action,
          details: JSON.stringify({ id: recordId, ...safeDetails })
        }
      });
    } catch (e) {
      console.error("Audit Logging Failed:", e);
    }
  }
}
