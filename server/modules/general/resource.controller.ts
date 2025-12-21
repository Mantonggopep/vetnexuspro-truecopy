import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const ALLOWED_COLLECTIONS = [
  'clients', 'patients', 'invoices', 'inventory', 'services',
  'appointments', 'chats', 'consultations', 'labRequests',
  'sales', 'expenses', 'budgets', 'branches', 'logs', 'orders'
];

const ADMIN_COLLECTIONS = ['services', 'branches', 'budgets'];

export class ResourceController {
  constructor(private prisma: PrismaClient) { }

  private getModelName(collection: string): string | null {
    const map: Record<string, string> = {
      'users': 'user', 'tenants': 'tenant', 'clients': 'client',
      'patients': 'patient', 'invoices': 'invoice', 'inventory': 'inventoryItem',
      'services': 'service', 'appointments': 'appointment', 'logs': 'auditLog',
      'branches': 'branch', 'labRequests': 'labRequest', 'sales': 'sale',
      'expenses': 'expense', 'budgets': 'budget', 'chats': 'chatMessage',
      'consultations': 'consultation', 'orders': 'order'
    };
    return map[collection] || null;
  }

  // UPGRADE: Improved date parser to handle "YYYY-MM-DD" inputs safely
  private fixDates(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(v => this.fixDates(v));

    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];

      if (typeof value === 'string') {
        // Match standard date formats (YYYY-MM-DD or ISO 8601)
        // This prevents strings like "Item Name" from being converted, but catches "2025-01-01"
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
          const date = new Date(value);
          // Only convert if it results in a valid date
          newObj[key] = !isNaN(date.getTime()) ? date : value;
        } else {
          newObj[key] = value;
        }
      } else if (typeof value === 'object') {
        newObj[key] = this.fixDates(value);
      } else {
        newObj[key] = value;
      }
    }
    return newObj;
  }

  async getAll(request: FastifyRequest<{ Params: { collection: string } }>, reply: FastifyReply) {
    const { collection } = request.params;
    const model = this.getModelName(collection);

    if (!model || (!ALLOWED_COLLECTIONS.includes(collection) && collection !== 'users' && collection !== 'logs')) {
      return reply.status(400).send({ error: "Invalid collection" });
    }

    const { branchId, role } = request.user;
    const isAcrossBranches = role === 'SUPER_ADMIN' || role === 'PARENT_ADMIN';

    try {
      const delegate = (this.prisma as any)[model];
      let include = {};
      if (collection === 'inventory') include = { batches: true };

      const orderBy: any = {};
      if (collection === 'logs' || collection === 'chats' || collection === 'auditLog') {
        orderBy.timestamp = 'desc';
      } else if (collection === 'users') {
        orderBy.joinedDate = 'desc';
      } else if (['services', 'budgets'].includes(collection)) {
        orderBy.id = 'desc';
      } else {
        orderBy.createdAt = 'desc';
      }

      const where: any = { tenantId: request.user.tenantId };

      // Apply Branch filter if not across-branch admin and not a global collection
      const globalCollections = ['services', 'branches', 'tenants'];
      if (!isAcrossBranches && branchId && !globalCollections.includes(collection)) {
        where.branchId = branchId;
      }

      const data = await delegate.findMany({
        where,
        orderBy,
        include: Object.keys(include).length > 0 ? include : undefined
      });
      return reply.send(data);
    } catch (e) {
      console.error(`Error fetching ${collection}:`, e);
      return reply.status(500).send([]);
    }
  }

  async getOne(request: FastifyRequest<{ Params: { collection: string, id?: string, '*'?: string } }>, reply: FastifyReply) {
    const { collection } = request.params;
    const id = request.params.id || request.params['*'];
    if (!id) return reply.status(400).send({ error: "ID is required" });
    const model = this.getModelName(collection);
    if (!model) return reply.status(400).send({ error: "Invalid collection" });

    try {
      const delegate = (this.prisma as any)[model];
      const include = collection === 'inventory' ? { batches: true } : undefined;
      const { branchId, role } = request.user;
      const isAcrossBranches = role === 'SUPER_ADMIN' || role === 'PARENT_ADMIN';
      const where: any = { id, tenantId: request.user.tenantId };
      const globalCollections = ['services', 'branches', 'tenants'];
      if (!isAcrossBranches && branchId && !globalCollections.includes(collection)) {
        where.branchId = branchId;
      }

      const item = await delegate.findFirst({
        where,
        include
      });
      if (!item) return reply.status(404).send({ error: "Not found" });
      return reply.send(item);
    } catch (e) {
      return reply.status(500).send({ error: "Database error" });
    }
  }

  async create(request: FastifyRequest<{ Params: { collection: string }, Body: any }>, reply: FastifyReply) {
    const { collection } = request.params;
    const model = this.getModelName(collection);

    if (!model || (!ALLOWED_COLLECTIONS.includes(collection) && collection !== 'users')) {
      return reply.status(403).send({ error: "Operation not allowed." });
    }

    if (ADMIN_COLLECTIONS.includes(collection) && !['ADMIN', 'PARENT_ADMIN', 'SUPER_ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: "Insufficient permissions." });
    }

    const body = (request.body as Record<string, any>) || {};

    if (collection === 'users') {
      if (body.password && body.password.length < 50) {
        body.password = await bcrypt.hash(body.password, 10);
      }
      // Strip frontend-only 'roles' array
      delete body.roles;
    }

    // --- INVENTORY SPECIFIC HANDLING ---
    if (collection === 'inventory' && body.batches) {
      const { batches, ...rest } = body;

      const sanData: any = { ...rest };
      // IMPORTANT: Do NOT remove 'branchId' - it is required for relations
      const stripKeys = ['notes', 'attachments', 'reminders', 'ownerName', 'owner', 'tenant', 'branch', 'patient', 'client', 'items'];
      stripKeys.forEach(k => delete sanData[k]);

      // Validate Branch ID
      if (!sanData.branchId) {
        return reply.status(400).send({ error: "Branch ID is required." });
      }

      const data = this.fixDates({ ...sanData, tenantId: request.user.tenantId });
      try {
        const created = await (this.prisma as any).inventoryItem.create({
          data: {
            ...data,
            batches: {
              create: batches.map((b: any) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { itemId, ...batchRest } = b; // Remove itemId, let relation handle it
                return this.fixDates(batchRest);
              })
            }
          },
          include: { batches: true }
        });

        // Log creation
        await this.logAction(request, 'CREATE', collection, created.id, data);

        return reply.send(created);
      } catch (e: any) {
        console.error(`Error creating inventory with batches:`, e);
        if (e.code === 'P2002') return reply.status(409).send({ error: 'Duplicate ID detected' });
        if (e.code === 'P2003') return reply.status(400).send({ error: 'Relationship constraint failed' });
        return reply.status(500).send({ error: e.message || "Failed to create inventory" });
      }
    }

    // --- GENERIC HANDLING ---
    const data = this.fixDates({ ...body, tenantId: request.user.tenantId });

    const stripKeys = ['attachments', 'reminders', 'ownerName', 'owner', 'tenant', 'branch', 'patient', 'client', 'items'];
    if (collection !== 'labRequests' && collection !== 'clients') {
      stripKeys.push('notes');
    }
    const sanData = { ...data };
    stripKeys.forEach(k => {
      if ((collection === 'invoices' || collection === 'sales' || collection === 'orders') && k === 'items') return;
      delete sanData[k];
    });

    try {
      const { branchId } = request.user;
      const sanWithBranch = { ...sanData };

      // Auto-assign branchId if missing and user has one
      const noBranchCollections = ['services', 'branches', 'chats', 'tenants'];
      if (!sanWithBranch.branchId && branchId && !noBranchCollections.includes(collection)) {
        sanWithBranch.branchId = branchId;
      }

      const delegate = (this.prisma as any)[model];
      const created = await delegate.create({ data: sanWithBranch });

      // Log the creation
      await this.logAction(request, 'CREATE', collection, created.id, sanData);

      return reply.send(created);
    } catch (e: any) {
      console.error(`Error creating ${collection}:`, e);
      if (e.code === 'P2002') return reply.status(409).send({ error: 'Duplicate ID detected' });
      if (e.code === 'P2003') return reply.status(400).send({ error: 'Relationship constraint failed' });
      return reply.status(500).send({ error: e.message });
    }
  }

  async update(request: FastifyRequest<{ Params: { collection: string, id?: string, '*'?: string }, Body: any }>, reply: FastifyReply) {
    const { collection } = request.params;
    const id = request.params.id || request.params['*'];
    if (!id) return reply.status(400).send({ error: "ID is required" });
    const model = this.getModelName(collection);

    if (!model || (!ALLOWED_COLLECTIONS.includes(collection) && collection !== 'users' && collection !== 'tenants')) {
      return reply.status(403).send({ error: "Operation not allowed." });
    }

    const body = request.body as Record<string, any>;
    // Destructure out fields that should never be in the 'data' part of a Prisma update
    const {
      id: _id,
      tenantId: _t,
      branchId: _b,
      clientId: _clId,
      patientId: _pId,
      ownerId: _oId,
      createdAt: _c,
      updatedAt: _u,
      batches,
      items,
      client,
      patient,
      tenant,
      branch,
      owner,
      notes,
      attachments,
      reminders,
      ...rest
    } = body;

    if (collection === 'users') {
      if (rest.password && rest.password.length < 50) {
        rest.password = await bcrypt.hash(rest.password, 10);
      }
      // Strip frontend-only 'roles' array
      delete (rest as any).roles;
    }

    const data = this.fixDates(rest);

    try {
      const delegate = (this.prisma as any)[model];
      const { branchId, role } = request.user;
      const isAcrossBranches = role === 'SUPER_ADMIN' || role === 'PARENT_ADMIN';
      const where: any = { id, tenantId: request.user.tenantId };
      const globalCollections = ['services', 'branches', 'tenants'];
      if (!isAcrossBranches && branchId && !globalCollections.includes(collection)) {
        where.branchId = branchId;
      }

      const updated = await delegate.update({
        where,
        data: data
      });

      // Log the update
      await this.logAction(request, 'UPDATE', collection, id, data);

      return reply.send(updated);
    } catch (e: any) {
      console.error(`Error updating ${collection}:`, e);
      if (e.code === 'P2025') return reply.status(404).send({ error: "Record not found" });
      return reply.status(500).send({ error: "Update failed" });
    }
  }

  async delete(request: FastifyRequest<{ Params: { collection: string, id?: string, '*'?: string } }>, reply: FastifyReply) {
    const { collection } = request.params;
    const id = request.params.id || request.params['*'];
    if (!id) return reply.status(400).send({ error: "ID is required" });
    const model = this.getModelName(collection);

    if (!model || !ALLOWED_COLLECTIONS.includes(collection)) {
      return reply.status(403).send({ error: "Delete forbidden." });
    }

    try {
      const { branchId, role } = request.user;
      const isAcrossBranches = role === 'SUPER_ADMIN' || role === 'PARENT_ADMIN';
      const where: any = { id, tenantId: request.user.tenantId };
      if (!isAcrossBranches && branchId && collection !== 'branches') {
        where.branchId = branchId;
      }

      const delegate = (this.prisma as any)[model];
      await delegate.delete({ where });

      // Log the deletion
      await this.logAction(request, 'DELETE', collection, id, { id });

      return reply.send({ success: true });
    } catch (e: any) {
      console.error(`Error deleting ${collection}:`, e);
      if (e.code === 'P2025') return reply.status(404).send({ error: "Record not found" });
      return reply.status(500).send({ error: "Delete failed" });
    }
  }

  private async logAction(request: FastifyRequest, action: string, collection: string, recordId: string, details: any) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...safeDetails } = details;
      await this.prisma.auditLog.create({
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
