"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const ALLOWED_COLLECTIONS = [
    'clients', 'patients', 'invoices', 'inventory', 'services',
    'appointments', 'chats', 'consultations', 'labRequests',
    'sales', 'expenses', 'budgets', 'branches'
];
const ADMIN_COLLECTIONS = ['services', 'branches', 'budgets'];
class ResourceController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    getModelName(collection) {
        const map = {
            'users': 'user', 'tenants': 'tenant', 'clients': 'client',
            'patients': 'patient', 'invoices': 'invoice', 'inventory': 'inventoryItem',
            'services': 'service', 'appointments': 'appointment', 'logs': 'auditLog',
            'branches': 'branch', 'labRequests': 'labRequest', 'sales': 'sale',
            'expenses': 'expense', 'budgets': 'budget', 'chats': 'chatMessage',
            'consultations': 'consultation'
        };
        return map[collection] || null;
    }
    fixDates(obj) {
        if (obj === null || typeof obj !== 'object')
            return obj;
        if (Array.isArray(obj))
            return obj.map(v => this.fixDates(v));
        const newObj = {};
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                const date = new Date(value);
                newObj[key] = !isNaN(date.getTime()) ? date : value;
            }
            else if (typeof value === 'object') {
                newObj[key] = this.fixDates(value);
            }
            else {
                newObj[key] = value;
            }
        }
        return newObj;
    }
    async getAll(request, reply) {
        const { collection } = request.params;
        const model = this.getModelName(collection);
        if (!model || (!ALLOWED_COLLECTIONS.includes(collection) && collection !== 'users' && collection !== 'logs')) {
            return reply.status(400).send({ error: "Invalid collection" });
        }
        try {
            const delegate = this.prisma[model];
            let include = {};
            if (collection === 'inventory')
                include = { batches: true };
            const data = await delegate.findMany({
                where: { tenantId: request.user.tenantId },
                orderBy: { createdAt: 'desc' },
                include: Object.keys(include).length > 0 ? include : undefined
            });
            return reply.send(data);
        }
        catch (e) {
            return reply.status(500).send([]);
        }
    }
    async getOne(request, reply) {
        const { collection, id } = request.params;
        const model = this.getModelName(collection);
        if (!model)
            return reply.status(400).send({ error: "Invalid collection" });
        try {
            const delegate = this.prisma[model];
            const include = collection === 'inventory' ? { batches: true } : undefined;
            const item = await delegate.findFirst({
                where: { id, tenantId: request.user.tenantId },
                include
            });
            if (!item)
                return reply.status(404).send({ error: "Not found" });
            return reply.send(item);
        }
        catch (e) {
            return reply.status(500).send({ error: "Database error" });
        }
    }
    async create(request, reply) {
        const { collection } = request.params;
        const model = this.getModelName(collection);
        if (!model || (!ALLOWED_COLLECTIONS.includes(collection) && collection !== 'users')) {
            return reply.status(403).send({ error: "Operation not allowed." });
        }
        if (ADMIN_COLLECTIONS.includes(collection) && !['ADMIN', 'PARENT_ADMIN', 'SUPER_ADMIN'].includes(request.user.role)) {
            return reply.status(403).send({ error: "Insufficient permissions." });
        }
        const body = request.body || {};
        // Security: Hash password if creating a user via this endpoint (e.g. staff creation)
        if (collection === 'users' && body.password && body.password.length < 50) {
            body.password = await bcryptjs_1.default.hash(body.password, 10);
        }
        if (collection === 'inventory' && body.batches) {
            const { batches, ...rest } = body;
            const data = this.fixDates({ ...rest, tenantId: request.user.tenantId });
            try {
                const created = await this.prisma.inventoryItem.create({
                    data: {
                        ...data,
                        batches: { create: batches.map((b) => this.fixDates(b)) }
                    },
                    include: { batches: true }
                });
                return reply.send(created);
            }
            catch (e) {
                return reply.status(500).send({ error: e.message });
            }
        }
        const data = this.fixDates({ ...body, tenantId: request.user.tenantId });
        try {
            const delegate = this.prisma[model];
            const created = await delegate.create({ data });
            return reply.send(created);
        }
        catch (e) {
            if (e.code === 'P2002')
                return reply.status(409).send({ error: 'Duplicate ID' });
            return reply.status(500).send({ error: e.message });
        }
    }
    async update(request, reply) {
        const { collection, id } = request.params;
        const model = this.getModelName(collection);
        if (!model || (!ALLOWED_COLLECTIONS.includes(collection) && collection !== 'users' && collection !== 'tenants')) {
            return reply.status(403).send({ error: "Operation not allowed." });
        }
        const body = request.body;
        const { id: _id, tenantId: _t, createdAt: _c, updatedAt: _u, batches, items, ...rest } = body;
        if (rest.password && rest.password.length < 50) {
            rest.password = await bcryptjs_1.default.hash(rest.password, 10);
        }
        const data = this.fixDates(rest);
        try {
            const delegate = this.prisma[model];
            const updated = await delegate.update({
                where: { id, tenantId: request.user.tenantId },
                data: data
            });
            return reply.send(updated);
        }
        catch (e) {
            return reply.status(500).send({ error: "Update failed" });
        }
    }
    async delete(request, reply) {
        const { collection, id } = request.params;
        const model = this.getModelName(collection);
        if (!model || !ALLOWED_COLLECTIONS.includes(collection)) {
            return reply.status(403).send({ error: "Delete forbidden." });
        }
        try {
            const delegate = this.prisma[model];
            await delegate.delete({ where: { id, tenantId: request.user.tenantId } });
            return reply.send({ success: true });
        }
        catch (e) {
            return reply.status(500).send({ error: "Delete failed" });
        }
    }
}
exports.ResourceController = ResourceController;
