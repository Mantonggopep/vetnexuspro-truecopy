"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTenantSchema = exports.signupSchema = exports.loginSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.loginSchema = zod_1.default.object({
    email: zod_1.default.string().email(),
    password: zod_1.default.string(),
});
// Standard user signup (e.g. adding a staff member)
exports.signupSchema = zod_1.default.object({
    email: zod_1.default.string().email(),
    password: zod_1.default.string().min(6),
    name: zod_1.default.string(),
    title: zod_1.default.string().optional(),
    role: zod_1.default.string().optional(),
    tenantId: zod_1.default.string().optional(),
    branchId: zod_1.default.string().optional(),
});
// Full Tenant Registration Schema
exports.registerTenantSchema = zod_1.default.object({
    tenant: zod_1.default.object({
        id: zod_1.default.string(),
        name: zod_1.default.string(),
        address: zod_1.default.string(),
        type: zod_1.default.enum(['Companion', 'Livestock', 'Mixed']),
        country: zod_1.default.string(),
        timezone: zod_1.default.string(),
        currency: zod_1.default.string(),
        plan: zod_1.default.enum(['STARTER', 'STANDARD', 'PREMIUM']),
        status: zod_1.default.enum(['ACTIVE', 'SUSPENDED']),
        features: zod_1.default.any() // JSON object
    }),
    admin: zod_1.default.object({
        id: zod_1.default.string(),
        title: zod_1.default.string(),
        name: zod_1.default.string(),
        email: zod_1.default.string().email(),
        password: zod_1.default.string().min(6),
        role: zod_1.default.string(), // PARENT_ADMIN
        tenantId: zod_1.default.string(),
        joinedDate: zod_1.default.string()
    })
});
