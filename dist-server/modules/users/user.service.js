"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class UserService {
    constructor(app) {
        this.app = app;
    }
    async create(data, actorTenantId) {
        // Strict Multi-tenancy check
        if (data.tenantId !== actorTenantId)
            throw new Error("Unauthorized tenant access");
        // Hash password if present (and not already hashed - simple check length)
        if (data.password && data.password.length < 50) {
            data.password = await bcryptjs_1.default.hash(data.password, 10);
        }
        return this.app.prisma.user.create({ data });
    }
    async findAll(tenantId) {
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
exports.UserService = UserService;
