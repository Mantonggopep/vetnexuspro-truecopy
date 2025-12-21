import React, { useState } from 'react';
import { AppState, Sale, Invoice, InvoiceStatus } from '../types';
import { formatCurrency } from '../services/storage';
import { Search, Filter, Calendar, DollarSign, FileText, Receipt, Download, Eye, ChevronDown, X, Printer } from 'lucide-react';
import { DocumentTemplate } from '../components/DocumentTemplate';

interface Props {
    state: AppState;
    dispatch: (action: any) => void;
}

type FilterType = 'All' | 'Sales' | 'Invoices';
type DateRange = 'All' | 'Today' | 'Week' | 'Month' | 'Custom';

export const SalesHistory: React.FC<Props> = ({ state, dispatch }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('All');
    const [dateRange, setDateRange] = useState<DateRange>('All');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<Sale | Invoice | null>(null);

    const currentTenant = state.tenants.find(t => t.id === (state.currentTenantId || state.currentUser?.tenantId));
    const currency = currentTenant?.currency || 'NGN';

    // Combine sales and invoices
    const allRecords: (Sale | Invoice)[] = [
        ...state.sales.filter(s => s.tenantId === state.currentTenantId && (s.branchId === state.currentBranchId || !s.branchId)).map(s => ({ ...s, recordType: 'Sale' as const })),
        ...state.invoices.filter(i => i.tenantId === state.currentTenantId && (i.branchId === state.currentBranchId || !i.branchId)).map(i => ({ ...i, recordType: 'Invoice' as const }))
    ];

    // Apply filters
    const filteredRecords = allRecords.filter(record => {
        // Type filter
        if (filterType !== 'All') {
            if (filterType === 'Sales' && !('paymentMethod' in record)) return false;
            if (filterType === 'Invoices' && 'paymentMethod' in record) return false;
        }

        // Search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const clientName = 'clientName' in record ? record.clientName : '';
            const id = record.id.toLowerCase();
            if (!clientName.toLowerCase().includes(searchLower) && !id.includes(searchLower)) {
                return false;
            }
        }

        // Date range filter
        const recordDate = new Date(record.date);
        const now = new Date();

        if (dateRange === 'Today') {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (recordDate < today) return false;
        } else if (dateRange === 'Week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            if (recordDate < weekAgo) return false;
        } else if (dateRange === 'Month') {
            const monthAgo = new Date(now);
            monthAgo.setMonth(now.getMonth() - 1);
            if (recordDate < monthAgo) return false;
        } else if (dateRange === 'Custom' && customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (recordDate < start || recordDate > end) return false;
        }

        // Amount filter
        if (minAmount && record.total < parseFloat(minAmount)) return false;
        if (maxAmount && record.total > parseFloat(maxAmount)) return false;

        return true;
    });

    const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'client' | 'amount'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    const handleSort = (key: 'date' | 'client' | 'amount') => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Sort logic
    const sortedRecords = filteredRecords.sort((a, b) => {
        const direction = sortConfig.direction === 'asc' ? 1 : -1;

        switch (sortConfig.key) {
            case 'date':
                return (new Date(a.date).getTime() - new Date(b.date).getTime()) * direction;
            case 'amount':
                return (a.total - b.total) * direction;
            case 'client':
                const clientA = 'clientName' in a ? a.clientName : '';
                const clientB = 'clientName' in b ? b.clientName : '';
                return clientA.localeCompare(clientB) * direction;
            default:
                return 0;
        }
    });

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig.key !== column) return <ChevronDown className="w-3 h-3 opacity-30" />;
        return <ChevronDown className={`w-3 h-3 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />;
    };

    // Calculate totals
    const totalSales = sortedRecords.filter(r => 'paymentMethod' in r).reduce((sum, r) => sum + r.total, 0);
    const totalInvoices = sortedRecords.filter(r => !('paymentMethod' in r)).reduce((sum, r) => sum + r.total, 0);
    const grandTotal = sortedRecords.reduce((sum, r) => sum + r.total, 0);

    const isSale = (record: Sale | Invoice): record is Sale => 'paymentMethod' in record;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header with Stats */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                <h1 className="text-3xl font-black mb-6">Transaction History</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <Receipt className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Total Sales</p>
                                <p className="text-2xl font-black">{formatCurrency(totalSales, currency)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Total Invoices</p>
                                <p className="text-2xl font-black">{formatCurrency(totalInvoices, currency)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Grand Total</p>
                                <p className="text-2xl font-black">{formatCurrency(grandTotal, currency)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by client name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    {/* Type Filter */}
                    <div className="flex gap-2">
                        {(['All', 'Sales', 'Invoices'] as FilterType[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-3 rounded-xl font-bold text-sm transition-all ${filterType === type
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    {/* Advanced Filters Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
                    >
                        <Filter className="w-5 h-5" />
                        Filters
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-4">
                        {/* Date Range */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                                Date Range
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {(['All', 'Today', 'Week', 'Month', 'Custom'] as DateRange[]).map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => setDateRange(range)}
                                        className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${dateRange === range
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
                                            }`}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>
                            {dateRange === 'Custom' && (
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Amount Range */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                                Amount Range
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Min Amount</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={minAmount}
                                        onChange={(e) => setMinAmount(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Max Amount</label>
                                    <input
                                        type="number"
                                        placeholder="∞"
                                        value={maxAmount}
                                        onChange={(e) => setMaxAmount(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Results Count */}
            <div className="flex justify-between items-center px-4">
                <p className="text-sm font-bold text-slate-600">
                    Showing {sortedRecords.length} {sortedRecords.length === 1 ? 'record' : 'records'}
                </p>
            </div>

            {/* Records List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {sortedRecords.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Type</th>
                                    <th className="p-4 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">ID</th>
                                    <th
                                        className="p-4 text-left font-bold text-slate-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('date')}
                                    >
                                        <div className="flex items-center gap-1">Date <SortIcon column="date" /></div>
                                    </th>
                                    <th
                                        className="p-4 text-left font-bold text-slate-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('client')}
                                    >
                                        <div className="flex items-center gap-1">Client <SortIcon column="client" /></div>
                                    </th>
                                    <th className="p-4 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Items</th>
                                    <th
                                        className="p-4 text-right font-bold text-slate-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('amount')}
                                    >
                                        <div className="flex items-center justify-end gap-1">Amount <SortIcon column="amount" /></div>
                                    </th>
                                    <th className="p-4 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-center font-bold text-slate-600 text-xs uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedRecords.map((record) => {
                                    const isSaleRecord = isSale(record);
                                    return (
                                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${isSaleRecord
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {isSaleRecord ? (
                                                        <span className="flex items-center gap-1">
                                                            <Receipt className="w-3 h-3" /> Sale
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="w-3 h-3" /> Invoice
                                                        </span>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-mono text-sm text-slate-600">
                                                    #{record.id.slice(-8).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">
                                                        {new Date(record.date).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {new Date(record.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm font-bold text-slate-700">
                                                    {'clientName' in record ? record.clientName : 'N/A'}
                                                </p>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm text-slate-600 font-bold">
                                                    {record.items.length} items
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="text-lg font-black text-slate-800">
                                                    {formatCurrency(record.total, currency)}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {isSaleRecord ? (
                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700">
                                                        PAID
                                                    </span>
                                                ) : (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${record.status === 'PAID'
                                                        ? 'bg-green-50 text-green-700'
                                                        : record.status === 'DRAFT'
                                                            ? 'bg-amber-50 text-amber-700'
                                                            : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {record.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => setSelectedRecord(record)}
                                                    className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-all"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <FileText className="w-20 h-20 mb-4 opacity-20" />
                        <p className="text-lg font-bold">No records found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 print:p-0">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in print:shadow-none print:max-h-none print:w-full print:rounded-none">

                        {/* Modal Header - Screen Only */}
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 print:hidden">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                Transaction Details
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600 flex items-center gap-2 text-xs font-bold"
                                >
                                    <Download className="w-4 h-4" /> Download PDF
                                </button>
                                <button
                                    onClick={() => setSelectedRecord(null)}
                                    className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto flex-1 bg-slate-100/50 print:overflow-visible flex justify-center py-8" id="print-area">
                            {currentTenant && (
                                <DocumentTemplate
                                    document={selectedRecord}
                                    tenant={currentTenant}
                                    type={isSale(selectedRecord) ? 'RECEIPT' : 'INVOICE'}
                                />
                            )}
                        </div>

                        {/* Actions Footer - Screen Only */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 print:hidden">
                            {!isSale(selectedRecord) && (
                                <>
                                    {(selectedRecord as any).status !== 'VOIDED' && (selectedRecord as any).status !== 'PAID' && (
                                        <button
                                            onClick={() => {
                                                if (confirm('Are you sure you want to void this invoice?')) {
                                                    const { recordType, ...cleanRecord } = selectedRecord as any;
                                                    dispatch({
                                                        type: 'UPDATE_INVOICE',
                                                        payload: { ...cleanRecord, status: 'VOIDED', total: 0 }
                                                    });
                                                    setSelectedRecord({ ...selectedRecord, status: 'VOIDED' } as any);
                                                }
                                            }}
                                            className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-bold text-sm transition-colors"
                                        >
                                            Void Invoice
                                        </button>
                                    )}
                                    {(selectedRecord as any).status === 'DRAFT' && (
                                        <button
                                            onClick={() => {
                                                const { recordType, ...cleanRecord } = selectedRecord as any;
                                                dispatch({
                                                    type: 'UPDATE_INVOICE',
                                                    payload: { ...cleanRecord, status: 'PAID' }
                                                });
                                                setSelectedRecord({ ...selectedRecord, status: 'PAID' } as any);
                                            }}
                                            className="px-6 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95"
                                        >
                                            Mark as Paid
                                        </button>
                                    )}
                                </>
                            )}
                            <button
                                onClick={() => window.print()}
                                className="px-6 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg font-bold text-sm shadow-md transition-all flex items-center gap-2"
                            >
                                <Printer className="w-4 h-4" /> Print / Download
                            </button>
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="px-6 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-bold text-sm shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
