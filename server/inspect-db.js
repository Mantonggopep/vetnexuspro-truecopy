
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, name: true, role: true, tenantId: true, branchId: true }
        });
        console.log("Users:", JSON.stringify(users, null, 2));

        const branches = await prisma.branch.findMany({
            select: { id: true, name: true, tenantId: true }
        });
        console.log("Branches:", JSON.stringify(branches, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

inspect();
