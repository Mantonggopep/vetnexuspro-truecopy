
import { FastifyInstance } from "fastify";
import { LoginInput, SignupInput, RegisterTenantInput } from "./auth.schema";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export class AuthService {
  constructor(private app: FastifyInstance) { }

  async login(input: LoginInput) {
    const user = await this.app.prisma.user.findFirst({
      where: { email: input.email }
    });

    if (!user) throw new Error("Invalid credentials");

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) throw new Error("Invalid credentials");

    if (!user.active) throw new Error("Account inactive");

    return user;
  }

  async signup(input: SignupInput) {
    const hash = await bcrypt.hash(input.password, 10);

    const user = await this.app.prisma.user.create({
      data: {
        id: `u${Date.now()}`,
        name: input.name,
        email: input.email,
        password: hash,
        title: input.title || "Staff",
        role: (input.role as any) || "NURSE",
        tenantId: input.tenantId,
        branchId: input.branchId,
        active: true,
        joinedDate: new Date()
      }
    });

    return user;
  }

  async registerTenant(input: RegisterTenantInput) {
    const { tenant, admin, branch } = input;
    const hash = await bcrypt.hash(admin.password, 10);

    return await this.app.prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          id: tenant.id,
          name: tenant.name,
          address: tenant.address,
          type: tenant.type,
          country: tenant.country,
          timezone: tenant.timezone,
          currency: tenant.currency,
          plan: tenant.plan,
          status: tenant.status,
          features: tenant.features,
          storageUsed: 0,
          ramUsage: 0,
          subscriptionId: tenant.subscriptionId,
          paymentPlanId: tenant.paymentPlanId,
          nextPaymentDate: tenant.nextPaymentDate ? new Date(tenant.nextPaymentDate) : undefined,
          billingCycle: tenant.billingCycle,
          isTrial: tenant.isTrial,
          autoRenew: tenant.autoRenew,
          subscriptionStatus: tenant.subscriptionStatus
        }
      });

      const mainBranch = await tx.branch.create({
        data: {
          id: branch.id,
          tenantId: tenant.id,
          name: 'Main Branch',
          address: tenant.address, // Correctly accessing address from the tenant object in scope
          phone: '',
          active: true
        }
      });

      const newAdmin = await tx.user.create({
        data: {
          id: admin.id,
          title: admin.title,
          name: admin.name,
          email: admin.email,
          password: hash,
          role: admin.role as any, // Cast to enum
          tenantId: tenant.id,
          branchId: mainBranch.id,
          active: true,
          joinedDate: new Date(admin.joinedDate)
        }
      });

      return { tenant: newTenant, admin: newAdmin, branch: mainBranch };
    });
  }

  async forgotPassword(email: string) {
    const user = await this.app.prisma.user.findFirst({
      where: { email }
    });

    // Security: Always return true to prevent email enumeration
    if (!user) return true;

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // Store token in DB
    await this.app.prisma.passwordResetToken.create({
      data: {
        email: email,
        token: token,
        expiresAt: expires
      }
    });

    // Simulate sending email (In production, integrate SendGrid/Resend)
    console.log(`[Email Service] Password Reset Link for ${email}: https://vetnexus.app/reset-password?token=${token}`);

    return true;
  }

  async resetPasswordConfirm(token: string, newPassword: string) {
    const resetRecord = await this.app.prisma.passwordResetToken.findUnique({
      where: { token }
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      throw new Error("Invalid or expired token");
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await this.app.prisma.user.updateMany({
      where: { email: resetRecord.email },
      data: { password: hash }
    });

    // Cleanup used token
    await this.app.prisma.passwordResetToken.delete({
      where: { token }
    });

    return true;
  }
}
