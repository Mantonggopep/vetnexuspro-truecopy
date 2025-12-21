
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixStock() {
    try {
        console.log("Fixing stock inconsistencies...");
        const items = await prisma.inventoryItem.findMany({
            include: { batches: true }
        });

        for (const item of items) {
            const batchSum = item.batches.reduce((sum, b) => sum + b.quantity, 0);

            // Only update if there is a mismatch
            if (item.totalStock !== batchSum) {
                console.log(`Fixing [${item.name}]: Setting totalStock from ${item.totalStock} to ${batchSum}`);
                await prisma.inventoryItem.update({
                    where: { id: item.id },
                    data: { totalStock: Math.max(0, batchSum) }
                });
            } else if (item.totalStock < 0) {
                console.log(`Fixing [${item.name}]: Resetting negative stock to 0`);
                await prisma.inventoryItem.update({
                    where: { id: item.id },
                    data: { totalStock: 0 }
                });
            }
        }
        console.log("Fix complete.");
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fixStock();
