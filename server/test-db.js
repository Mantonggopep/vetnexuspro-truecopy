
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing DB connection...');
        await prisma.$connect();
        console.log('Connected successfully!');

        const tableCount = await prisma.user.count();
        console.log('User count:', tableCount);

        // Check if AuditLog table exists
        try {
            const logCount = await prisma.auditLog.count();
            console.log('AuditLog count:', logCount);
        } catch (e) {
            console.error('AuditLog table check failed:', e.message);
        }

    } catch (e) {
        console.error('DB Connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
