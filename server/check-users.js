const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { id: true, email: true, tenantId: true, role: true }
    });
    console.log('USERS_START');
    console.log(JSON.stringify(users, null, 2));
    console.log('USERS_END');
}

main().catch(err => console.log(err)).finally(() => prisma.$disconnect());
