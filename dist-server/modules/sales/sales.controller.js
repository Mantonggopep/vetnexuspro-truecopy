"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesController = void 0;
class SalesController {
    async createSale(request, reply) {
        const saleData = request.body;
        const { items, ...rest } = saleData;
        const tenantId = request.user.tenantId;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return reply.status(400).send({ message: "Sale must contain items" });
        }
        try {
            const result = await request.server.prisma.$transaction(async (tx) => {
                // 1. Create the Sale Record
                const sale = await tx.sale.create({
                    data: {
                        ...rest,
                        tenantId,
                        items: items // Storing structured items as JSON/JsonB
                    }
                });
                // 2. Deduct Inventory with Atomic Updates
                for (const item of items) {
                    // First, find the item to get batch data
                    const inventoryItem = await tx.inventoryItem.findUnique({
                        where: { id: item.itemId },
                        include: { batches: true }
                    });
                    if (!inventoryItem)
                        continue;
                    let qtyToDeduct = item.quantity;
                    // Sort batches by expiry ascending (FEFO - First Expired First Out)
                    const sortedBatches = inventoryItem.batches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
                    for (const batch of sortedBatches) {
                        if (qtyToDeduct <= 0)
                            break;
                        if (batch.quantity > 0) {
                            const deduct = Math.min(batch.quantity, qtyToDeduct);
                            // Update batch quantity atomically
                            await tx.inventoryBatch.update({
                                where: { id: batch.id },
                                data: { quantity: { decrement: deduct } }
                            });
                            qtyToDeduct -= deduct;
                        }
                    }
                    // Atomic decrement of total stock for the item
                    await tx.inventoryItem.update({
                        where: { id: item.itemId },
                        data: { totalStock: { decrement: item.quantity } }
                    });
                }
                return sale;
            });
            return reply.send(result);
        }
        catch (e) {
            request.log.error(e);
            return reply.status(500).send({ message: "Transaction failed", error: e.message });
        }
    }
}
exports.SalesController = SalesController;
