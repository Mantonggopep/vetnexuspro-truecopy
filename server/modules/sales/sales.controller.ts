import { FastifyRequest, FastifyReply } from "fastify";

interface CreateSaleBody {
  items: any[];
  [key: string]: any;
}

export class SalesController {
  async createSale(request: FastifyRequest<{ Body: CreateSaleBody }>, reply: FastifyReply) {
    console.log("!!! [SalesController] createSale reached !!!");
    const saleData = request.body;
    const { items, ...rest } = saleData;
    const tenantId = request.user.tenantId;
    const saleId = rest.id || `sale_${Date.now()}`;

    // 1. Basic Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return reply.status(400).send({ message: "Sale must contain items" });
    }

    try {
      // 2. Pre-check for duplicate to avoid unnecessary transaction overhead
      const existingRecord = await request.server.prisma.sale.findUnique({
        where: { id: saleId }
      });

      if (existingRecord) {
        console.log(`[SalesController] Record ${saleId} already exists. Returning existing record.`);
        return reply.status(200).send(existingRecord);
      }

      const result = await request.server.prisma.$transaction(async (tx) => {
        // 3. Setup Branch Logic
        const targetBranchId = rest.branchId || request.user.branchId;
        if (!targetBranchId) {
          throw new Error("No branch ID associated with this transaction. Please ensure you are logged into a branch.");
        }

        const branchExists = await tx.branch.findUnique({ where: { id: targetBranchId } });
        if (!branchExists) {
          throw new Error(`Branch with ID '${targetBranchId}' does not exist.`);
        }

        // 4. Create the Sale Record
        console.log("[SalesController] Step 1: Creating sale record...");
        const sale = await tx.sale.create({
          data: {
            id: saleId,
            tenantId,
            branchId: targetBranchId,
            clientId: rest.clientId || null,
            clientName: rest.clientName || 'Walk-in',
            date: new Date(rest.date || Date.now()),
            items: items as any,
            subtotal: Number(rest.subtotal) || 0,
            tax: Number(rest.tax) || 0,
            total: Number(rest.total) || 0,
            paymentMethod: (rest.paymentMethod as any) || 'CASH',
            status: rest.status || 'COMPLETED'
          }
        });

        // 5. Deduct Inventory with Atomic Updates (FEFO Strategy)
        console.log(`[SalesController] Step 2: Deducting inventory for ${items.length} items...`);
        for (const item of items) {
          if (!item.itemId) continue;

          const inventoryItem = await tx.inventoryItem.findUnique({
            where: { id: item.itemId },
            include: { batches: true }
          });

          if (!inventoryItem) {
            console.warn(`[SalesController] Inventory item ${item.itemId} not found.`);
            continue;
          }

          const qtyToDeduct = Number(item.quantity) || 0;
          if (qtyToDeduct <= 0) continue;

          if (inventoryItem.totalStock < qtyToDeduct) {
            throw new Error(`Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.totalStock}, Requested: ${qtyToDeduct}`);
          }

          let remainingToDeduct = qtyToDeduct;
          const sortedBatches = inventoryItem.batches.sort((a, b) =>
            new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
          );

          for (const batch of sortedBatches) {
            if (remainingToDeduct <= 0) break;
            if (batch.quantity > 0) {
              const deduct = Math.min(batch.quantity, remainingToDeduct);
              await tx.inventoryBatch.update({
                where: { id: batch.id },
                data: { quantity: { decrement: deduct } }
              });
              remainingToDeduct -= deduct;
            }
          }

          await tx.inventoryItem.update({
            where: { id: item.itemId },
            data: { totalStock: { decrement: qtyToDeduct } }
          });
        }
        return sale;
      }, { timeout: 15000 });

      // 6. Log the Audit Action
      await this.logAction(request, 'CREATE', 'SALES', result.id, rest);

      return reply.send(result);

    } catch (e: any) {
      console.error(`[SalesController] SALE ERROR:`, e);
      
      // Log to file for persistent debugging
      const fs = require('fs');
      fs.appendFileSync('sale-error.log', `${new Date().toISOString()} - ${e.message}\n${e.stack}\n---\n`);

      // Handle Unique Constraint (Race condition fallback)
      if (e.code === 'P2002') {
        const fallbackRecord = await request.server.prisma.sale.findUnique({ where: { id: saleId } });
        return reply.status(200).send(fallbackRecord);
      }

      if (e.message.includes('Insufficient stock')) {
        return reply.status(400).send({ message: e.message });
      }

      return reply.status(500).send({ 
        message: "Transaction failed", 
        error: e.message, 
        code: e.code 
      });
    }
  }

  private async logAction(request: FastifyRequest, action: string, collection: string, recordId: string, details: any) {
    try {
      await request.server.prisma.auditLog.create({
        data: {
          id: `log${Date.now()}${Math.random().toString(36).substring(2, 7)}`,
          tenantId: request.user.tenantId,
          branchId: request.user.branchId || null,
          userId: request.user.id,
          userName: request.user.name,
          timestamp: new Date(),
          action: `${action}_${collection.toUpperCase()}`,
          details: JSON.stringify({ id: recordId, ...details })
        }
      });
    } catch (e) {
      console.error("Audit Logging Failed:", e);
    }
  }
}