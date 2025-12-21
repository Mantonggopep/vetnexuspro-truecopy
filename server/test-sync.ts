
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to database...');
        let tenantId = '00000000-0000-0000-0000-000000000000';
        let role = 'SUPER_ADMIN';
        let clientId = undefined;
        let isClient = false;

        // Get a valid tenant and user to simulate the request
        const tenant = await prisma.tenant.findFirst();
        if (tenant) {
            console.log('Found tenant:', tenant.id);
            tenantId = tenant.id;
            const user = await prisma.user.findFirst({
                where: { tenantId: tenant.id }
            });
            if (user) {
                console.log('Found user:', user.email, 'Role:', user.role);
                role = user.role;
                clientId = user.clientId || undefined;
                isClient = role === 'PET_OWNER';
            }
        } else {
            console.log('No tenant found. Using dummy UUID to test table existence.');
        }

        console.log(`Testing bootstrap for Tenant: ${tenantId}, Role: ${role}, ClientId: ${clientId}`);

        const baseFilter = { tenantId };
        const clientFilter = isClient && clientId ? { tenantId, clientId } : baseFilter;
        const patientFilter = isClient && clientId ? { tenantId, ownerId: clientId } : baseFilter;

        // Run queries one by one to see which fails
        console.log('1. Users...');
        await prisma.user.findMany({
            where: isClient
                ? { tenantId, OR: [{ role: { not: 'PET_OWNER' } }, { clientId }] }
                : baseFilter,
            select: { id: true, name: true, title: true, role: true, email: true, branchId: true, tenantId: true, clientId: true, active: true }
        });

        console.log('2. Tenants...');
        await prisma.tenant.findMany({ where: { id: tenantId } });

        console.log('3. Branches...');
        await prisma.branch.findMany({ where: baseFilter });

        console.log('4. Clients...');
        await prisma.client.findMany({ where: isClient ? { id: clientId } : baseFilter });

        console.log('5. Patients...');
        await prisma.patient.findMany({
            where: patientFilter,
            include: { notes: true, attachments: true, reminders: true }
        });

        console.log('6. Invoices...');
        await prisma.invoice.findMany({ where: clientFilter });

        console.log('7. Inventory...');
        if (!isClient) {
            await prisma.inventoryItem.findMany({ where: baseFilter, include: { batches: true } });
        }

        console.log('8. Sales...');
        if (!isClient) {
            await prisma.sale.findMany({ where: baseFilter });
        }

        console.log('9. Services...');
        await prisma.service.findMany({ where: baseFilter });

        console.log('10. Appointments...');
        await prisma.appointment.findMany({ where: clientFilter });

        console.log('11. Expenses...');
        if (!isClient) {
            await prisma.expense.findMany({ where: baseFilter });
        }

        console.log('12. Logs...');
        if (!isClient) {
            await prisma.auditLog.findMany({ where: baseFilter, orderBy: { timestamp: 'desc' }, take: 100 });
        }

        console.log('13. Chats...');
        await prisma.chatMessage.findMany({ where: clientFilter });

        console.log('14. Consultations...');
        if (!isClient) {
            await prisma.consultation.findMany({ where: baseFilter });
        }

        console.log('15. Lab Requests...');
        await prisma.labRequest.findMany({ where: isClient ? { tenantId, patient: { ownerId: clientId } } : baseFilter });

        console.log('16. Budgets...');
        if (!isClient) {
            await prisma.budget.findMany({ where: baseFilter });
        }

        console.log('All queries passed successfully!');

    } catch (e: any) {
        console.error('Test failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
