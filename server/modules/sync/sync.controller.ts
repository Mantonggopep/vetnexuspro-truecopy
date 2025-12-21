
import { FastifyRequest, FastifyReply } from "fastify";

export class SyncController {
    async bootstrapHandler(request: FastifyRequest, reply: FastifyReply) {
        const prisma = request.server.prisma;
        const { tenantId, role, clientId } = request.user;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        if (!tenantId && !isSuperAdmin) {
            return reply.status(400).send({ message: "Tenant ID required" });
        }

        const isClient = role === 'PET_OWNER';

        try {
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
            const baseFilter = { tenantId }; // Tenant level always
            const branchFilter: any = { tenantId }; // Branch level if applicable

            // Apply branch filter if not an cross-branch admin
            if (!isAcrossBranches && request.user.branchId) {
                branchFilter.branchId = request.user.branchId;
            }

            // Client-specific filters
            // Note: Some tables use 'clientId', others 'ownerId'. We map accordingly.
            const clientFilter = isClient && clientId ? { tenantId, clientId } : (isClient ? { tenantId, clientId: 'NOT_SET' } : branchFilter);
            const patientFilter = isClient && clientId ? { tenantId, ownerId: clientId } : (isClient ? { tenantId, ownerId: 'NOT_SET' } : branchFilter);

            // Special case for tables that DON'T have branchId but should be tenant-scoped
            // Specifically: Service, ChatMessage, Branch (itself)
            const tenantOnlyFilter = { tenantId };

            // Parallel fetch configuration
            const queries = [
                // 1. Users
                prisma.user.findMany({
                    where: isClient
                        ? { tenantId, OR: [{ role: { not: 'PET_OWNER' } }, { clientId }] }
                        : branchFilter,
                    select: { id: true, name: true, title: true, role: true, email: true, branchId: true, tenantId: true, clientId: true, active: true }
                }),
                // 2. Tenants
                prisma.tenant.findMany({ where: { id: tenantId } }),
                // 3. Branches: Branches belong to tenant, they don't have a branchId themselves
                prisma.branch.findMany({ where: tenantOnlyFilter }),
                // 4. Clients
                prisma.client.findMany({ where: isClient ? { id: clientId } : branchFilter }),
                // 5. Patients
                prisma.patient.findMany({
                    where: patientFilter,
                    include: { notes: true, attachments: true, reminders: true }
                }),
                // 6. Invoices
                prisma.invoice.findMany({ where: clientFilter }),
                // 7. Inventory
                prisma.inventoryItem.findMany({
                    where: isClient ? { tenantId, visibleToClient: true } : branchFilter,
                    include: { batches: true }
                }),
                // 8. Sales
                isClient ? [] : prisma.sale.findMany({ where: branchFilter }),
                // 9. Services: Service model doesn't have branchId
                prisma.service.findMany({ where: tenantOnlyFilter }),
                // 10. Appointments
                prisma.appointment.findMany({ where: clientFilter }),
                // 11. Expenses
                isClient ? [] : prisma.expense.findMany({ where: branchFilter }),
                // 12. Logs
                isClient ? [] : prisma.auditLog.findMany({ where: branchFilter, orderBy: { timestamp: 'desc' }, take: 100 }),
                // 13. Chats: ChatMessage model doesn't have branchId
                prisma.chatMessage.findMany({ where: isClient ? { tenantId, clientId } : tenantOnlyFilter }),
                // 14. Consultations
                isClient ? [] : prisma.consultation.findMany({ where: branchFilter }),
                // 15. Lab Requests
                prisma.labRequest.findMany({ where: isClient ? { tenantId, patient: { ownerId: clientId } } : branchFilter }),
                // 16. Budgets
                isClient ? [] : prisma.budget.findMany({ where: branchFilter }),
            ];

            const [
                users, tenants, branches, clients, patients, invoices,
                inventory, sales, services, appointments, expenses,
                logs, chats, consultations, labRequests, budgets
            ] = await Promise.all(queries);

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
                chats,
                consultations,
                labRequests,
                budgets,
                // Return context to help frontend hydrate immediately
                currentUser: request.user,
                currentTenantId: tenantId,
                currentBranchId: request.user.branchId
            };

        } catch (e: any) {
            request.log.error(e);
            // Debugging: Write error to file since we can't see console easily
            const fs = require('fs');
            fs.appendFileSync('sync-error.log', `${new Date().toISOString()} - ${e.message}\n${e.stack}\n---\n`);
            return reply.status(500).send({ message: "Bootstrap sync failed", error: e.message });
        }
    }

    async chatsHandler(request: FastifyRequest, reply: FastifyReply) {
        const prisma = request.server.prisma;
        const { tenantId, role, clientId } = request.user;

        if (!tenantId) {
            return reply.status(400).send({ message: "Tenant ID required" });
        }

        const isClient = role === 'PET_OWNER';

        try {
            const chats = await prisma.chatMessage.findMany({
                where: isClient ? { tenantId, clientId } : { tenantId },
                orderBy: { timestamp: 'asc' }
            });

            return chats;
        } catch (e: any) {
            return reply.status(500).send({ message: "Chat sync failed", error: e.message });
        }
    }
}
