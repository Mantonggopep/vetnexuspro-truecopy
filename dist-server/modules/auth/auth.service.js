"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
class AuthService {
    constructor(app) {
        this.app = app;
    }
    async login(input) {
        const user = await this.app.prisma.user.findFirst({
            where: { email: input.email }
        });
        if (!user)
            throw new Error("Invalid credentials");
        const valid = await bcryptjs_1.default.compare(input.password, user.password);
        if (!valid)
            throw new Error("Invalid credentials");
        if (!user.active)
            throw new Error("Account inactive");
        return user;
    }
    async signup(input) {
        const hash = await bcryptjs_1.default.hash(input.password, 10);
        const user = await this.app.prisma.user.create({
            data: {
                id: `u${Date.now()}`,
                ...input,
                password: hash,
                active: true,
                joinedDate: new Date()
            }
        });
        return user;
    }
    async registerTenant(input) {
        const { tenant, admin } = input;
        const hash = await bcryptjs_1.default.hash(admin.password, 10);
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
                    ramUsage: 0
                }
            });
            const mainBranch = await tx.branch.create({
                data: {
                    id: `b_${tenant.id}`,
                    tenantId: tenant.id,
                    name: 'Main Branch',
                    address: tenant.address,
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
                    role: admin.role, // Cast to enum
                    tenantId: tenant.id,
                    branchId: mainBranch.id,
                    active: true,
                    joinedDate: new Date(admin.joinedDate)
                }
            });
            return { tenant: newTenant, admin: newAdmin, branch: mainBranch };
        });
    }
    async forgotPassword(email) {
        const user = await this.app.prisma.user.findFirst({
            where: { email }
        });
        // Security: Always return true to prevent email enumeration
        if (!user)
            return true;
        // Generate secure token
        const token = crypto_1.default.randomBytes(32).toString('hex');
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
    async resetPasswordConfirm(token, newPassword) {
        const resetRecord = await this.app.prisma.passwordResetToken.findUnique({
            where: { token }
        });
        if (!resetRecord || resetRecord.expiresAt < new Date()) {
            throw new Error("Invalid or expired token");
        }
        const hash = await bcryptjs_1.default.hash(newPassword, 10);
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
exports.AuthService = AuthService;
