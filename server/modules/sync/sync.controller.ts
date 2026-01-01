
import { FastifyRequest, FastifyReply } from "fastify";

export class SyncController {
    async bootstrapHandler(request: FastifyRequest, reply: FastifyReply) {
        const prisma = request.server.prisma;

        try {
            // Access user info inside try block for safety
            const { tenantId, role, clientId } = request.user;
            const isSuperAdmin = role === 'SUPER_ADMIN';

            if (!tenantId && !isSuperAdmin) {
                return reply.status(400).send({ message: "Tenant ID required" });
            }

            const isClient = role === 'PET_OWNER';

            if (isSuperAdmin) {
                // Super Admin View: Fetch global data
                const [users, tenants] = await Promise.all([
                    prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true, name: true, title: true, role: true, email: true, active: true } }),
                    prisma.tenant.findMany()
                ]);

                return {
                    users,
                    tenants,
                    branches: [],
                    clients: [],
                    patients: [],
                    invoices: [],
                    inventory: [],
                    sales: [],
                    services: [],
                    appointments: [],
                    expenses: [],
                    logs: [],
                    chats: [],
                    consultations: [],
                    labRequests: [],
                    budgets: [],
                    currentUser: request.user,
                    currentTenantId: null,
                    currentBranchId: null
                };
            }

            // Define filters based on role
            const isAcrossBranches = role === 'SUPER_ADMIN' || role === 'PARENT_ADMIN';
            const branchFilter: any = { tenantId };

            // Apply branch filter if not an cross-branch admin
            if (!isAcrossBranches && request.user.branchId) {
                branchFilter.branchId = request.user.branchId;
            }

            // Client-specific filters
            const clientFilter = isClient && clientId ? { tenantId, clientId } : (isClient ? { tenantId, clientId: 'NOT_SET' } : branchFilter);
            const patientFilter = isClient && clientId ? { tenantId, ownerId: clientId } : (isClient ? { tenantId, ownerId: 'NOT_SET' } : branchFilter);
            const tenantOnlyFilter = { tenantId };

            // Helper to run query and catch error locally to pinpoint failure
            const runQuery = async (name: string, promise: Promise<any>) => {
                try {
                    return await promise;
                } catch (err: any) {
                    request.log.error(`Bootstrap query failed [${name}]: ${err.message}`);
                    return []; // Return empty array so the rest of the sync can continue
                }
            };

            // Fetch in batches to avoid overwhelming connection pool
            // Group 1: Core metadata
            const [users, tenants, branches, services] = await Promise.all([
                runQuery('users', prisma.user.findMany({
                    where: isClient
                        ? { tenantId, OR: [{ role: { not: 'PET_OWNER' } }, { clientId }] }
                        : branchFilter,
                    select: { id: true, name: true, title: true, role: true, email: true, branchId: true, tenantId: true, clientId: true, active: true }
                })),
                runQuery('tenants', prisma.tenant.findMany({ where: { id: tenantId } })),
                runQuery('branches', prisma.branch.findMany({ where: tenantOnlyFilter })),
                runQuery('services', prisma.service.findMany({ where: tenantOnlyFilter }))
            ]);

            // Group 2: Client & Patient data
            const [clients, patients, labRequests, chats] = await Promise.all([
                runQuery('clients', prisma.client.findMany({ where: isClient ? { id: clientId } : branchFilter })),
                runQuery('patients', prisma.patient.findMany({
                    where: patientFilter,
                    include: { notes: true, attachments: true, reminders: true }
                })),
                runQuery('labRequests', prisma.labRequest.findMany({
                    where: isClient ? { tenantId, patient: { ownerId: clientId } } : branchFilter,
                    take: isClient ? undefined : 200 // Limit for staff to avoid payload bloat
                })),
                runQuery('chats', prisma.chatMessage.findMany({
                    where: isClient ? { tenantId, clientId } : tenantOnlyFilter,
                    orderBy: { timestamp: 'desc' },
                    take: 250 // Limit historical chats in bootstrap
                }))
            ]);

            // Group 3: Financial & Operations
            const [invoices, inventory, sales, appointments] = await Promise.all([
                runQuery('invoices', prisma.invoice.findMany({ where: clientFilter, take: 500 })),
                runQuery('inventory', prisma.inventoryItem.findMany({
                    where: isClient ? { tenantId, visibleToClient: true } : branchFilter,
                    include: { batches: true }
                })),
                runQuery('sales', isClient ? Promise.resolve([]) : prisma.sale.findMany({ where: branchFilter, take: 500 })),
                runQuery('appointments', prisma.appointment.findMany({ where: clientFilter, take: 1000 }))
            ]);

            // Group 4: Administrative
            const [expenses, logs, consultations, budgets] = await Promise.all([
                runQuery('expenses', isClient ? Promise.resolve([]) : prisma.expense.findMany({ where: branchFilter, take: 500 })),
                runQuery('logs', isClient ? Promise.resolve([]) : prisma.auditLog.findMany({ where: branchFilter, orderBy: { timestamp: 'desc' }, take: 100 })),
                runQuery('consultations', isClient ? Promise.resolve([]) : prisma.consultation.findMany({ where: branchFilter, take: 500 })),
                runQuery('budgets', isClient ? Promise.resolve([]) : prisma.budget.findMany({ where: branchFilter }))
            ]);

            return {
                users,
                tenants,
                branches,
                clients,
                patients,
                invoices,
                inventory,
                sales,
                services,
                appointments,
                expenses,
                logs,
                chats: chats.reverse(), // Reverse to get chronological if taken from desc order
                consultations,
                labRequests,
                budgets,
                currentUser: request.user,
                currentTenantId: tenantId,
                currentBranchId: request.user.branchId
            };

        } catch (e: any) {
            request.log.error(e);
            return reply.status(500).send({
                message: "Bootstrap sync failed",
                error: e.message,
                stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
            });
        }
    }

    async chatsHandler(request: FastifyRequest, reply: FastifyReply) {
        const prisma = request.server.prisma;

        try {
            const { tenantId, role, clientId } = request.user;

            if (!tenantId && role !== 'SUPER_ADMIN') {
                return reply.status(400).send({ message: "Tenant ID required" });
            }

            const isClient = role === 'PET_OWNER';
            const chats = await prisma.chatMessage.findMany({
                where: role === 'SUPER_ADMIN' ? {} : (isClient ? { tenantId, clientId } : { tenantId }),
                orderBy: { timestamp: 'asc' },
                take: 1000 // Safety limit
            });

            return chats;
        } catch (e: any) {
            request.log.error(e);
            return reply.status(500).send({ message: "Chat sync failed", error: e.message });
        }
    }
}
