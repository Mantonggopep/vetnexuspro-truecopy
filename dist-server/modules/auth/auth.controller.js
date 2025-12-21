"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
class AuthController {
    constructor(service) {
        this.service = service;
    }
    async loginHandler(request, reply) {
        try {
            const user = await this.service.login(request.body);
            const token = await reply.jwtSign({
                id: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                branchId: user.branchId,
                name: user.name
            });
            // Set cookie
            reply.setCookie('token', token, {
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                sameSite: true
            });
            return { token, user };
        }
        catch (e) {
            return reply.code(401).send({ message: e.message });
        }
    }
    async signupHandler(request, reply) {
        try {
            const user = await this.service.signup(request.body);
            return { user };
        }
        catch (e) {
            return reply.code(400).send({ message: e.message });
        }
    }
    async registerTenantHandler(request, reply) {
        try {
            const result = await this.service.registerTenant(request.body);
            // Auto-login: Generate token for the new admin
            const token = await reply.jwtSign({
                id: result.admin.id,
                email: result.admin.email,
                role: result.admin.role,
                tenantId: result.admin.tenantId,
                branchId: result.admin.branchId,
                name: result.admin.name
            });
            reply.setCookie('token', token, {
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                sameSite: true
            });
            return { ...result, token };
        }
        catch (e) {
            request.log.error(e);
            return reply.code(400).send({ message: "Registration failed", details: e.message });
        }
    }
    async forgotPasswordHandler(request, reply) {
        try {
            await this.service.forgotPassword(request.body.email);
            return { message: "If that email exists, a reset link has been sent." };
        }
        catch (e) {
            request.log.error(e);
            return { message: "If that email exists, a reset link has been sent." };
        }
    }
    async resetPasswordConfirmHandler(request, reply) {
        try {
            await this.service.resetPasswordConfirm(request.body.token, request.body.password);
            return { message: "Password updated successfully." };
        }
        catch (e) {
            return reply.code(400).send({ message: e.message });
        }
    }
    async meHandler(request, reply) {
        try {
            const user = await request.server.prisma.user.findUnique({
                where: { id: request.user.id }
            });
            if (!user) {
                return reply.code(401).send({ message: "User not found" });
            }
            return user;
        }
        catch (e) {
            return reply.code(500).send({ message: "Internal Server Error" });
        }
    }
}
exports.AuthController = AuthController;
