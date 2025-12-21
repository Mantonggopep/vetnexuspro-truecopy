import React, { useState, useRef } from 'react';
import { AppState } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Download, Calendar, TrendingUp, DollarSign, Package, Filter, FileText, BarChart3, PieChart as PieIcon, Activity, Download as DownloadIcon, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '../services/storage';

interface Props {
    state: AppState;
}

type ChartType = 'bar' | 'line' | 'pie' | 'area';
type ReportCategory = 'financial' | 'inventory' | 'staff' | 'clients' | 'services';
type ComparisonPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

const COLORS = ['#0D9488', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#10B981', '#F97316'];

export const ReportsAnalytics: React.FC<Props> = ({ state }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportCategory, setReportCategory] = useState<ReportCategory>('financial');
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [comparisonEnabled, setComparisonEnabled] = useState(false);
    const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('month');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['revenue', 'expenses']);

    const currentTenant = state.tenants.find(t => t.id === (state.currentTenantId || state.currentUser?.tenantId));
    const currency = currentTenant?.currency || 'NGN';

    // Filter Data
    const filterByDate = (dateString: string) => {
        const d = new Date(dateString).toISOString().split('T')[0];
        return d >= startDate && d <= endDate;
    };

    const tenantInvoices = state.invoices.filter(i => i.tenantId === state.currentTenantId && i.status === 'PAID' && filterByDate(i.date));
    const tenantExpenses = state.expenses.filter(e => e.tenantId === state.currentTenantId && filterByDate(e.date));
    const tenantSales = state.sales.filter(s => s.tenantId === state.currentTenantId && filterByDate(s.date));
    const tenantClients = state.clients.filter(c => c.tenantId === state.currentTenantId);
    const tenantAppointments = state.appointments.filter(a => a.tenantId === state.currentTenantId && filterByDate(a.date));


    // Revenue Calculation
    const totalRevenue = tenantInvoices.reduce((sum, i) => sum + i.total, 0) + tenantSales.reduce((sum, s) => sum + s.total, 0);

    // CORRECT Profit Calculation
    // 1. Calculate profit from POS sales (inventory items)
    const salesProfit = tenantSales.reduce((profit, sale) => {
        const saleItemsProfit = sale.items.reduce((itemProfit, saleItem) => {
            // Find the inventory item to get purchase price
            const inventoryItem = state.inventory.find(inv => inv.id === saleItem.itemId);
            if (inventoryItem && inventoryItem.batches.length > 0) {
                // Use average purchase price from batches
                const avgPurchasePrice = inventoryItem.batches.reduce((sum, b) => sum + b.purchasePrice, 0) / inventoryItem.batches.length;
                const itemProfit = (saleItem.unitPrice - avgPurchasePrice) * saleItem.quantity;
                return itemProfit + itemProfit;
            }
            // If no inventory data, assume full revenue as profit (fallback)
            return itemProfit + saleItem.total;
        }, 0);
        return profit + saleItemsProfit;
    }, 0);

    // 2. Calculate profit from services (invoices)
    const servicesProfit = tenantInvoices.reduce((profit, invoice) => {
        const invoiceProfit = invoice.items.reduce((itemProfit, invItem) => {
            // Try to match invoice item to a service
            const service = state.services.find(s =>
                invItem.description.toLowerCase().includes(s.name.toLowerCase()) ||
                s.name.toLowerCase().includes(invItem.description.toLowerCase())
            );

            if (service) {
                // Use the service's defined profit (priceClient - costInternal)
                return itemProfit + service.profit;
            } else {
                // If no service match, try to estimate from item cost
                // Assuming item.cost in invoice is the client price
                // For safety, assume 50% margin if we can't determine cost
                const estimatedCost = invItem.cost * 0.5; // Conservative estimate
                return itemProfit + (invItem.cost - estimatedCost);
            }
        }, 0);
        return profit + invoiceProfit;
    }, 0);

    // 3. Subtract expenses (negative profit)
    const totalExpenses = tenantExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Net Profit = Sales Profit + Services Profit - Expenses
    const netProfit = salesProfit + servicesProfit - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Inventory Metrics
    const lowStockCount = state.inventory.filter(i => i.tenantId === state.currentTenantId && i.totalStock <= i.minLevel).length;
    const totalItems = state.inventory.filter(i => i.tenantId === state.currentTenantId).length;

    // Financial Trend Data (Last 7 periods based on selected comparison)
    const getTrendData = () => {
        const now = new Date(endDate);
        const data = [];

        for (let i = 6; i >= 0; i--) {
            const periodEnd = new Date(now);
            const periodStart = new Date(now);

            if (comparisonPeriod === 'day') {
                periodStart.setDate(now.getDate() - i);
                periodEnd.setDate(now.getDate() - i);
            } else if (comparisonPeriod === 'week') {
                periodStart.setDate(now.getDate() - (i * 7) - 6);
                periodEnd.setDate(now.getDate() - (i * 7));
            } else if (comparisonPeriod === 'month') {
                periodStart.setMonth(now.getMonth() - i, 1);
                periodEnd.setMonth(now.getMonth() - i + 1, 0);
            }

            const periodInvoices = state.invoices.filter(inv => {
                const invDate = new Date(inv.date);
                return inv.tenantId === state.currentTenantId &&
                    inv.status === 'PAID' &&
                    invDate >= periodStart &&
                    invDate <= periodEnd;
            });

            const periodSales = state.sales.filter(s => {
                const sDate = new Date(s.date);
                return s.tenantId === state.currentTenantId &&
                    sDate >= periodStart &&
                    sDate <= periodEnd;
            });

            const periodExpenses = state.expenses.filter(e => {
                const eDate = new Date(e.date);
                return e.tenantId === state.currentTenantId &&
                    eDate >= periodStart &&
                    eDate <= periodEnd;
            });


            const revenue = periodInvoices.reduce((sum, i) => sum + i.total, 0) + periodSales.reduce((sum, s) => sum + s.total, 0);
            const expenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

            // Calculate actual profit for this period
            const periodSalesProfit = periodSales.reduce((profit, sale) => {
                const saleItemsProfit = sale.items.reduce((itemProfit, saleItem) => {
                    const inventoryItem = state.inventory.find(inv => inv.id === saleItem.itemId);
                    if (inventoryItem && inventoryItem.batches.length > 0) {
                        const avgPurchasePrice = inventoryItem.batches.reduce((sum, b) => sum + b.purchasePrice, 0) / inventoryItem.batches.length;
                        const itemProfit = (saleItem.unitPrice - avgPurchasePrice) * saleItem.quantity;
                        return itemProfit + itemProfit;
                    }
                    return itemProfit + saleItem.total;
                }, 0);
                return profit + saleItemsProfit;
            }, 0);

            const periodServicesProfit = periodInvoices.reduce((profit, invoice) => {
                const invoiceProfit = invoice.items.reduce((itemProfit, invItem) => {
                    const service = state.services.find(s =>
                        invItem.description.toLowerCase().includes(s.name.toLowerCase()) ||
                        s.name.toLowerCase().includes(invItem.description.toLowerCase())
                    );
                    if (service) {
                        return itemProfit + service.profit;
                    } else {
                        const estimatedCost = invItem.cost * 0.5;
                        return itemProfit + (invItem.cost - estimatedCost);
                    }
                }, 0);
                return profit + invoiceProfit;
            }, 0);

            const profit = periodSalesProfit + periodServicesProfit - expenses;

            data.push({
                name: periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue,
                expenses,
                profit: profit > 0 ? profit : 0,
                transactions: periodInvoices.length + periodSales.length
            });
        }

        return data;
    };

    // Service Performance
    const servicePerformance = state.services
        .filter(s => s.tenantId === state.currentTenantId)
        .map(service => {
            const serviceInvoices = tenantInvoices.filter(inv =>
                inv.items.some((item: any) => item.description?.toLowerCase().includes(service.name.toLowerCase()))
            );
            const revenue = serviceInvoices.reduce((sum, inv) => sum + inv.total, 0);
            return {
                name: service.name,
                revenue,
                count: serviceInvoices.length
            };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);

    // Client Distribution
    const clientsByType = tenantClients.reduce((acc, client) => {
        const type = (client as any).clientType || 'Regular';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const clientData = Object.keys(clientsByType).map(key => ({
        name: key,
        value: clientsByType[key]
    }));

    // Inventory by Category
    const inventoryByCategory = state.inventory
        .filter(i => i.tenantId === state.currentTenantId)
        .reduce((acc, item) => {
            const category = item.category || 'Other';
            const avgCost = item.batches.length > 0 ? (item.batches.reduce((sum, b) => sum + b.purchasePrice, 0) / item.batches.length) : 0;
            const value = avgCost * item.totalStock;

            acc[category] = (acc[category] || 0) + value;
            return acc;
        }, {} as Record<string, number>);

    const inventoryData = Object.keys(inventoryByCategory).map(key => ({
        name: key,
        value: inventoryByCategory[key]
    }));

    // Staff Performance
    const staffPerformance = state.users
        .filter(u => u.tenantId === state.currentTenantId && u.role !== 'PET_OWNER')
        .map(user => {
            const appointments = state.appointments.filter(a => a.assignedStaffId === user.id && a.status === 'Completed' && filterByDate(a.date));
            const revenue = appointments.length * 50;
            return {
                name: user.name,
                role: user.role,
                appointments: appointments.length,
                revenue
            };
        })
        .sort((a, b) => b.revenue - a.revenue);

    // Get data based on report category
    const getChartData = () => {
        switch (reportCategory) {
            case 'financial':
                return comparisonEnabled ? getTrendData() : [
                    { name: 'Revenue', value: totalRevenue },
                    { name: 'Expenses', value: totalExpenses },
                    { name: 'Profit', value: netProfit > 0 ? netProfit : 0 }
                ];
            case 'inventory':
                return inventoryData;
            case 'staff':
                return staffPerformance;
            case 'clients':
                return clientData;
            case 'services':
                return servicePerformance;
            default:
                return [];
        }
    };

    const chartData = getChartData();

    // Export Functions
    const exportToPDF = () => {
        // Professional approach: Use window.print() which allows the user to 'Save as PDF'
        // We'll add a print-only style to the page for a clean report look.

        // Temporarily adjust document title for the PDF filename
        const originalTitle = document.title;
        document.title = `VetNexus_Report_${reportCategory}_${new Date().toISOString().split('T')[0]}`;

        window.print();

        document.title = originalTitle;
    };

    const exportToWord = () => {
        // Create a basic HTML structure that Word can read as a document
        const content = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Clinic Report</title></head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <h1 style="color: #6366F1; text-align: center;">VetNexus Pro Report</h1>
                <h2 style="text-align: center; color: #64748b;">${reportCategory.toUpperCase()} ANALYSIS</h2>
                <hr>
                <p><strong>Date Range:</strong> ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}</p>
                <p><strong>Generated On:</strong> ${new Date().toLocaleString()}</p>
                
                <h3>Key Performance Indicators</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <tr style="background-color: #f8fafc;">
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Metric</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Value</th>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e2e8f0;">Total Revenue</td>
                        <td style="padding: 10px; border: 1px solid #e2e8f0;">${formatCurrency(totalRevenue, currency)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e2e8f0;">Total Expenses</td>
                        <td style="padding: 10px; border: 1px solid #e2e8f0;">${formatCurrency(totalExpenses, currency)}</td>
                    </tr>
                    <tr style="font-weight: bold; background-color: #f1f5f9;">
                        <td style="padding: 10px; border: 1px solid #e2e8f0;">Net Profit</td>
                        <td style="padding: 10px; border: 1px solid #e2e8f0;">${formatCurrency(netProfit, currency)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e2e8f0;">Profit Margin</td>
                        <td style="padding: 10px; border: 1px solid #e2e8f0;">${profitMargin.toFixed(2)}%</td>
                    </tr>
                </table>

                <h3>Top Service Data</h3>
                <p>This report contains detailed data for ${reportCategory} across ${tenantInvoices.length + tenantSales.length} transactions in the selected period.</p>
                
                <footer style="margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center;">
                    Generated by VetNexus Pro Veterinary Management System
                </footer>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', content], {
            type: 'application/msword'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `VetNexus_Report_${reportCategory}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Render Chart based on type
    const renderChart = () => {
        const isComparison = comparisonEnabled && reportCategory === 'financial';

        if (chartType === 'bar') {
            return (
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                        cursor={{ fill: '#F1F5F9' }}
                        formatter={(value: any) => formatCurrency(value, currency)}
                    />
                    {isComparison && <Legend />}
                    {isComparison ? (
                        <>
                            {selectedMetrics.includes('revenue') && <Bar dataKey="revenue" fill="#0D9488" radius={[4, 4, 0, 0]} />}
                            {selectedMetrics.includes('expenses') && <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />}
                            {selectedMetrics.includes('profit') && <Bar dataKey="profit" fill="#10B981" radius={[4, 4, 0, 0]} />}
                        </>
                    ) : (
                        <Bar dataKey="value" fill="#0D9488" radius={[4, 4, 0, 0]} />
                    )}
                </BarChart>
            );
        } else if (chartType === 'line') {
            return (
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                        formatter={(value: any) => formatCurrency(value, currency)}
                    />
                    {isComparison && <Legend />}
                    {isComparison ? (
                        <>
                            {selectedMetrics.includes('revenue') && <Line type="monotone" dataKey="revenue" stroke="#0D9488" strokeWidth={3} dot={{ r: 4 }} />}
                            {selectedMetrics.includes('expenses') && <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} />}
                            {selectedMetrics.includes('profit') && <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />}
                        </>
                    ) : (
                        <Line type="monotone" dataKey="value" stroke="#0D9488" strokeWidth={3} dot={{ r: 4 }} />
                    )}
                </LineChart>
            );
        } else if (chartType === 'area') {
            return (
                <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                        formatter={(value: any) => formatCurrency(value, currency)}
                    />
                    {isComparison && <Legend />}
                    {isComparison ? (
                        <>
                            {selectedMetrics.includes('revenue') && <Area type="monotone" dataKey="revenue" fill="#0D9488" stroke="#0D9488" fillOpacity={0.6} />}
                            {selectedMetrics.includes('expenses') && <Area type="monotone" dataKey="expenses" fill="#EF4444" stroke="#EF4444" fillOpacity={0.6} />}
                            {selectedMetrics.includes('profit') && <Area type="monotone" dataKey="profit" fill="#10B981" stroke="#10B981" fillOpacity={0.6} />}
                        </>
                    ) : (
                        <Area type="monotone" dataKey="value" fill="#0D9488" stroke="#0D9488" fillOpacity={0.6} />
                    )}
                </AreaChart>
            );
        } else {
            // Pie Chart
            return (
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => {
                        if (typeof value === 'number') {
                            return reportCategory === 'clients' ? value : formatCurrency(value, currency);
                        }
                        return value;
                    }} />
                </PieChart>
            );
        }
    };

    const toggleMetric = (metric: string) => {
        if (selectedMetrics.includes(metric)) {
            setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
        } else {
            setSelectedMetrics([...selectedMetrics, metric]);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-black mb-2">Reports & Analytics</h2>
                        <p className="text-indigo-100">Generate comprehensive insights with interactive visualizations</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={exportToPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 font-bold text-sm shadow-lg transition-all"
                        >
                            <FileText className="w-4 h-4" /> Export PDF
                        </button>
                        <button
                            onClick={exportToWord}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 font-bold text-sm shadow-lg transition-all"
                        >
                            <FileSpreadsheet className="w-4 h-4" /> Export Word
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-black text-slate-800">Report Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Date Range */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Start Date</label>
                        <input
                            type="date"
                            className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">End Date</label>
                        <input
                            type="date"
                            className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>

                    {/* Report Category */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category</label>
                        <select
                            className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
                            value={reportCategory}
                            onChange={e => setReportCategory(e.target.value as ReportCategory)}
                        >
                            <option value="financial">Financial Overview</option>
                            <option value="inventory">Inventory Analysis</option>
                            <option value="staff">Staff Performance</option>
                            <option value="clients">Client Distribution</option>
                            <option value="services">Service Performance</option>
                        </select>
                    </div>

                    {/* Chart Type */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Chart Type</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setChartType('bar')}
                                className={`flex-1 p-2 rounded-lg border-2 transition-all ${chartType === 'bar' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 hover:border-indigo-300'}`}
                                title="Bar Chart"
                            >
                                <BarChart3 className="w-5 h-5 mx-auto" />
                            </button>
                            <button
                                onClick={() => setChartType('line')}
                                className={`flex-1 p-2 rounded-lg border-2 transition-all ${chartType === 'line' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 hover:border-indigo-300'}`}
                                title="Line Chart"
                            >
                                <Activity className="w-5 h-5 mx-auto" />
                            </button>
                            <button
                                onClick={() => setChartType('pie')}
                                className={`flex-1 p-2 rounded-lg border-2 transition-all ${chartType === 'pie' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 hover:border-indigo-300'}`}
                                title="Pie Chart"
                            >
                                <PieIcon className="w-5 h-5 mx-auto" />
                            </button>
                            <button
                                onClick={() => setChartType('area')}
                                className={`flex-1 p-2 rounded-lg border-2 transition-all ${chartType === 'area' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 hover:border-indigo-300'}`}
                                title="Area Chart"
                            >
                                <TrendingUp className="w-5 h-5 mx-auto" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Comparison Toggle - Only for financial */}
                {reportCategory === 'financial' && (
                    <div className="border-t border-slate-100 pt-4 mt-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={comparisonEnabled}
                                    onChange={(e) => setComparisonEnabled(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-bold text-slate-700">Enable Trend Comparison</span>
                            </label>

                            {comparisonEnabled && (
                                <>
                                    <select
                                        value={comparisonPeriod}
                                        onChange={(e) => setComparisonPeriod(e.target.value as ComparisonPeriod)}
                                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium"
                                    >
                                        <option value="day">Daily</option>
                                        <option value="week">Weekly</option>
                                        <option value="month">Monthly</option>
                                    </select>

                                    <div className="flex gap-2">
                                        {['revenue', 'expenses', 'profit'].map(metric => (
                                            <button
                                                key={metric}
                                                onClick={() => toggleMetric(metric)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${selectedMetrics.includes(metric)
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {metric}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 rounded-xl text-green-600"><TrendingUp className="w-5 h-5" /></div>
                        <span className="text-slate-500 text-sm font-medium">Period Revenue</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800">{formatCurrency(totalRevenue, currency)}</h3>
                    <p className="text-xs text-slate-400 mt-1">{tenantInvoices.length + tenantSales.length} transactions</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-50 rounded-xl text-red-600"><DollarSign className="w-5 h-5" /></div>
                        <span className="text-slate-500 text-sm font-medium">Period Expenses</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800">{formatCurrency(totalExpenses, currency)}</h3>
                    <p className="text-xs text-slate-400 mt-1">{tenantExpenses.length} expense entries</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><DollarSign className="w-5 h-5" /></div>
                        <span className="text-slate-500 text-sm font-medium">Net Profit</span>
                    </div>
                    <h3 className={`text-2xl font-black ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(netProfit, currency)}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Margin: {profitMargin.toFixed(1)}%</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-50 rounded-xl text-orange-600"><Package className="w-5 h-5" /></div>
                        <span className="text-slate-500 text-sm font-medium">Inventory Health</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800">
                        {totalItems > 0 ? ((totalItems - lowStockCount) / totalItems * 100).toFixed(0) : 0}%
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{lowStockCount} items low stock</p>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" ref={chartRef}>
                <h3 className="font-black text-slate-800 mb-6 text-lg">
                    {reportCategory === 'financial' && comparisonEnabled && `${comparisonPeriod.charAt(0).toUpperCase() + comparisonPeriod.slice(1)} Trend - `}
                    {reportCategory.charAt(0).toUpperCase() + reportCategory.slice(1)} Visualization
                </h3>
                <div className="h-96 w-full" style={{ minHeight: '384px' }}>
                    <ResponsiveContainer width="100%" height="100%" minHeight={384}>
                        {renderChart()}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Data Table */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-black text-slate-800 mb-4">Detailed Breakdown</h3>
                <div className="overflow-x-auto">
                    {reportCategory === 'staff' && (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 font-bold text-slate-600">Staff Name</th>
                                    <th className="p-3 font-bold text-slate-600">Role</th>
                                    <th className="p-3 font-bold text-slate-600 text-right">Appointments</th>
                                    <th className="p-3 font-bold text-slate-600 text-right">Est. Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {staffPerformance.map((staff, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium text-slate-700">{staff.name}</td>
                                        <td className="p-3 text-slate-600">{staff.role.replace('_', ' ')}</td>
                                        <td className="p-3 font-bold text-right">{staff.appointments}</td>
                                        <td className="p-3 text-green-600 font-bold text-right">{formatCurrency(staff.revenue, currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {reportCategory === 'services' && (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 font-bold text-slate-600">Service Name</th>
                                    <th className="p-3 font-bold text-slate-600 text-right">Bookings</th>
                                    <th className="p-3 font-bold text-slate-600 text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {servicePerformance.map((service, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium text-slate-700">{service.name}</td>
                                        <td className="p-3 font-bold text-right">{service.count}</td>
                                        <td className="p-3 text-green-600 font-bold text-right">{formatCurrency(service.revenue, currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {reportCategory === 'inventory' && (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 font-bold text-slate-600">Category</th>
                                    <th className="p-3 font-bold text-slate-600 text-right">Est. Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {inventoryData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium text-slate-700">{item.name}</td>
                                        <td className="p-3 font-bold text-slate-800 text-right">{formatCurrency(item.value, currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {reportCategory === 'clients' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {clientData.map((item, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">{item.name}</p>
                                    <p className="text-2xl font-black text-slate-800">{item.value}</p>
                                    <p className="text-xs text-slate-400">
                                        {((item.value / tenantClients.length) * 100).toFixed(1)}% of total
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {reportCategory === 'financial' && !comparisonEnabled && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-600 font-medium">Total Invoices</span>
                                <span className="font-black text-slate-800">{tenantInvoices.length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-600 font-medium">POS Transactions</span>
                                <span className="font-black text-slate-800">{tenantSales.length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-600 font-medium">Avg Transaction Value</span>
                                <span className="font-black text-slate-800">
                                    {formatCurrency(
                                        totalRevenue > 0 ? totalRevenue / (tenantInvoices.length + tenantSales.length) : 0,
                                        currency
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-600 font-medium">Appointments Completed</span>
                                <span className="font-black text-slate-800">{tenantAppointments.filter(a => a.status === 'Completed').length}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};
