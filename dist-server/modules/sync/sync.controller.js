"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncController = void 0;
class SyncController {
    async bootstrapHandler(request, reply) {
        const prisma = request.server.prisma;
        const { tenantId, role, clientId } = request.user;
        if (!tenantId) {
            return reply.status(400).send({ message: "Tenant ID required" });
        }
        const isClient = role === 'PET_OWNER';
        try {
            // Define filters based on role
            const baseFilter = { tenantId };
            // Client-specific filters
            // Note: Some tables use 'clientId', others 'ownerId'. We map accordingly.
            const clientFilter = isClient && clientId ? { tenantId, clientId } : baseFilter;
            const patientFilter = isClient && clientId ? { tenantId, ownerId: clientId } : baseFilter;
            // Parallel fetch configuration
            const queries = [
                // 1. Users: Clients only see themselves and Staff (for context), Staff see all
                prisma.user.findMany({
                    where: isClient
                        ? { tenantId, OR: [{ role: { not: 'PET_OWNER' } }, { clientId }] }
                        : baseFilter,
                    select: { id: true, name: true, title: true, role: true, email: true, branchId: true, tenantId: true, clientId: true, active: true } // Exclude password
                }),
                // 2. Tenants: Always fetch current tenant context
                prisma.tenant.findMany({ where: { id: tenantId } }),
                // 3. Branches: Public info
                prisma.branch.findMany({ where: baseFilter }),
                // 4. Clients: Staff see all, Client sees self
                prisma.client.findMany({ where: isClient ? { id: clientId } : baseFilter }),
                // 5. Patients
                prisma.patient.findMany({
                    where: patientFilter,
                    include: { notes: true, attachments: true, reminders: true }
                }),
                // 6. Invoices
                prisma.invoice.findMany({ where: clientFilter }),
                // 7. Inventory: Clients don't need full inventory with costs, but maybe active items for reference?
                // For security, let's give Clients a simplified list or empty if not needed. 
                // The frontend uses services for pricing mostly. Let's send full inventory to staff, basic to client if needed.
                // Actually, Client Portal doesn't use Inventory Manager, only Services.
                isClient ? [] : prisma.inventoryItem.findMany({ where: baseFilter, include: { batches: true } }),
                // 8. Sales: Staff only
                isClient ? [] : prisma.sale.findMany({ where: baseFilter }),
                // 9. Services: Public list for pricing
                prisma.service.findMany({ where: baseFilter }),
                // 10. Appointments
                prisma.appointment.findMany({ where: clientFilter }),
                // 11. Expenses: Staff only
                isClient ? [] : prisma.expense.findMany({ where: baseFilter }),
                // 12. Logs: Staff only (and usually limited)
                isClient ? [] : prisma.auditLog.findMany({ where: baseFilter, orderBy: { timestamp: 'desc' }, take: 100 }),
                // 13. Chats
                prisma.chatMessage.findMany({ where: clientFilter }),
                // 14. Consultations: Clients see their own pet's history usually via Patients->Notes, but if using Consultation model:
                // Let's allow clients to see consultations for their pets.
                // Consultation has patientId but not clientId directly usually, need to filter by patient list or join.
                // Prisma doesn't support deep join filters easily in findMany top level.
                // We'll fetch all for tenant if staff, or specific strategy for client.
                // For MVP simplicity/security trade-off: Only Staff gets Consultations collection sync. 
                // Clients rely on 'MedicalNotes' embedded in Patients.
                isClient ? [] : prisma.consultation.findMany({ where: baseFilter }),
                // 15. Lab Requests
                prisma.labRequest.findMany({ where: isClient ? { tenantId, patient: { ownerId: clientId } } : baseFilter }),
                // 16. Budgets: Staff only
                isClient ? [] : prisma.budget.findMany({ where: baseFilter }),
            ];
            const [users, tenants, branches, clients, patients, invoices, inventory, sales, services, appointments, expenses, logs, chats, consultations, labRequests, budgets] = await Promise.all(queries);
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
        }
        catch (e) {
            request.log.error(e);
            return reply.status(500).send({ message: "Bootstrap sync failed", error: e.message });
        }
    }
}
exports.SyncController = SyncController;
