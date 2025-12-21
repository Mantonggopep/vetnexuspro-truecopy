
import { FastifyRequest, FastifyReply } from "fastify";

export class AnalyticsController {
  async getDashboardMetrics(request: FastifyRequest<{ Querystring: { start: string, end: string } }>, reply: FastifyReply) {
    const { start, end } = request.query;
    const tenantId = request.user.tenantId;
    const prisma = request.server.prisma;

    const startDate = new Date(start || new Date().setMonth(new Date().getMonth() - 1));
    const endDate = new Date(end || new Date());

    try {
        const [
            revenueInvoices,
            revenueSales,
            expenses,
            activePatients
        ] = await Promise.all([
            prisma.invoice.aggregate({
                _sum: { total: true },
                where: { tenantId, date: { gte: startDate, lte: endDate }, status: 'PAID' }
            }),
            prisma.sale.aggregate({
                _sum: { total: true },
                where: { tenantId, date: { gte: startDate, lte: endDate }, status: 'COMPLETED' }
            }),
            prisma.expense.aggregate({
                _sum: { amount: true },
                where: { tenantId, date: { gte: startDate, lte: endDate } }
            }),
            prisma.patient.count({ where: { tenantId, status: 'Active' } })
        ]);

        const totalRevenue = (revenueInvoices._sum.total || 0) + (revenueSales._sum.total || 0);
        const totalExpenses = expenses._sum.amount || 0;
        const netProfit = totalRevenue - totalExpenses;

        return reply.send({
            totalRevenue,
            totalExpenses,
            netProfit,
            activePatients
        });
    } catch (e) {
        request.log.error(e);
        return reply.status(500).send({ message: "Analytics error" });
    }
  }
}
