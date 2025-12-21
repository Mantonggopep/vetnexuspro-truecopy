const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const items = await prisma.inventoryItem.findMany({
        where: { visibleToClient: true },
        select: { id: true, name: true, clientPrice: true, tenantId: true }
    });
    console.log('ITEMS_START');
    console.log(JSON.stringify(items, null, 2));
    console.log('ITEMS_END');
}

main().catch(err => console.log(err)).finally(() => prisma.$disconnect());
