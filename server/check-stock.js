
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStock() {
    try {
        console.log("Checking for stock inconsistencies...");
        const items = await prisma.inventoryItem.findMany({
            include: { batches: true }
        });

        for (const item of items) {
            const batchSum = item.batches.reduce((sum, b) => sum + b.quantity, 0);
            if (item.totalStock !== batchSum) {
                console.warn(`Mismatch found for [${item.name}]: totalStock=${item.totalStock}, batchesSum=${batchSum}`);
            }
            if (item.totalStock < 0) {
                console.error(`CRITICAL: Negative stock found for [${item.name}]: ${item.totalStock}`);
            }
        }
        console.log("Check complete.");
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkStock();
