import React, { useState } from 'react';
import { AppState, Invoice, InvoiceItem, InvoiceStatus, Sale, SaleItem } from '../types';
import { formatCurrency } from '../services/storage';
import { Plus, Ban, Eye, FileText, Printer, X, Download } from 'lucide-react';
import { toSentenceCase } from '../utils/textUtils';
import { DocumentTemplate } from '../components/DocumentTemplate';

interface Props {
  state: AppState;
  dispatch: (action: any) => void;
}

export const Finance: React.FC<Props> = ({ state, dispatch }) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'sales'>('invoices');
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  // Detail Modal State
  const [selectedRecord, setSelectedRecord] = useState<Sale | Invoice | null>(null);
  const [printRecord, setPrintRecord] = useState<Sale | Invoice | null>(null);

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', cost: 0 }]);

  const currentTenant = state.tenants.find(t => t.id === (state.currentTenantId || state.currentUser?.tenantId));
  const currency = currentTenant?.currency || 'NGN';

  const tenantInvoices = state.invoices.filter(i => i.tenantId === state.currentTenantId);
  const tenantSales = state.sales.filter(s => s.tenantId === state.currentTenantId);

  const sortedInvoices = [...tenantInvoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedSales = [...tenantSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddItem = () => {
    setItems([...items, { description: '', cost: 0 }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => items.reduce((sum, item) => sum + Number(item.cost), 0);

  const createInvoice = () => {
    const patient = state.patients.find(p => p.id === selectedPatientId);
    if (!patient || calculateTotal() <= 0) return;

    const newInvoice: Invoice = {
      id: `inv${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      clientId: patient.ownerId,
      clientName: patient.ownerName,
      date: new Date().toISOString(),
      items: items
        .filter(i => i.description && i.cost)
        .map(i => ({ ...i, description: toSentenceCase(i.description) })),
      total: calculateTotal(),
      status: InvoiceStatus.PAID,
      tenantId: state.currentTenantId,
      branchId: state.currentBranchId
    };

    dispatch({ type: 'ADD_INVOICE', payload: newInvoice });
    setShowInvoiceForm(false);
    setItems([{ description: '', cost: 0 }]);
    setSelectedPatientId('');
  };

  const handleAdjustInvoice = (invoiceId: string) => {
    const reason = prompt("Enter reason for adjustment (Records cannot be deleted, only adjusted):");
    if (reason) {
      dispatch({ type: 'ADJUST_INVOICE', payload: { id: invoiceId, reason } });
    }
  };

  // Helper to determine if a record is a Sale (type guard)
  const isSale = (record: Sale | Invoice): record is Sale => {
    return (record as Sale).paymentMethod !== undefined;
  };

  // --- PRINT PREVIEW OVERLAY ---
  if (printRecord && currentTenant) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white overflow-y-auto animate-fade-in">
        {/* Controls - Hidden when printing */}
        <div className="fixed top-6 right-6 flex gap-4 print:hidden z-50">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-full shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2 transform hover:scale-105"
          >
            <Printer className="w-5 h-5" /> Print / Save as PDF
          </button>
          <button
            onClick={() => setPrintRecord(null)}
            className="px-6 py-3 bg-white text-slate-600 font-bold rounded-full shadow-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 transform hover:scale-105"
          >
            <X className="w-5 h-5" /> Close
          </button>
        </div>

        <div className="min-h-screen py-10 bg-slate-100 print:bg-white print:p-0">
          <DocumentTemplate
            document={printRecord}
            tenant={currentTenant}
            type={isSale(printRecord) ? 'RECEIPT' : 'INVOICE'}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Financial Records</h2>
          <p className="text-slate-500 text-sm">Strict audit trail enabled. Records cannot be deleted.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 text-sm font-bold rounded-md ${activeTab === 'invoices' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Invoices
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-4 py-2 text-sm font-bold rounded-md ${activeTab === 'sales' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              POS Sales
            </button>
          </div>
          {activeTab === 'invoices' && (
            <button
              onClick={() => setShowInvoiceForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Invoice
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {activeTab === 'invoices' ? (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-sm">Invoice ID</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Date</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Patient</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Amount</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedInvoices.map(invoice => (
                <tr key={invoice.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedRecord(invoice)}>
                  <td className="p-4 font-mono text-sm text-slate-500">#{invoice.id.toUpperCase()}</td>
                  <td className="p-4 text-slate-700">{new Date(invoice.date).toLocaleDateString()}</td>
                  <td className="p-4 font-medium text-slate-700">{invoice.patientName}</td>
                  <td className="p-4 font-bold text-slate-700">{formatCurrency(invoice.total, currency)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${invoice.status === InvoiceStatus.PAID ? 'bg-green-50 text-green-700 border-green-200' :
                      invoice.status === InvoiceStatus.ADJUSTED ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setSelectedRecord(invoice)} className="text-slate-400 hover:text-indigo-600"><Eye className="w-4 h-4" /></button>
                    {invoice.status === InvoiceStatus.PAID && (
                      <button
                        onClick={() => handleAdjustInvoice(invoice.id)}
                        className="text-amber-600 hover:text-amber-800 text-sm font-medium flex items-center gap-1"
                        title="Adjust/Void Invoice"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sortedInvoices.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400"><p>No invoices found.</p></td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-sm">Sale ID</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Date</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Client</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Items</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Total</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Method</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSales.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedRecord(sale)}>
                  <td className="p-4 font-mono text-sm text-slate-500">#{sale.id.slice(-6).toUpperCase()}</td>
                  <td className="p-4 text-slate-700">{new Date(sale.date).toLocaleString()}</td>
                  <td className="p-4 font-medium text-slate-700">{sale.clientName}</td>
                  <td className="p-4 text-sm text-slate-600">{sale.items.length} items ({sale.items.map(i => i.itemName).join(', ').slice(0, 20)}...)</td>
                  <td className="p-4 font-bold text-slate-700">{formatCurrency(sale.total, currency)}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400 hover:text-indigo-600" onClick={(e) => { e.stopPropagation(); setSelectedRecord(sale); }}>
                    <Eye className="w-4 h-4" />
                  </td>
                </tr>
              ))}
              {sortedSales.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400"><p>No sales records found.</p></td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {isSale(selectedRecord) ? 'Sales Receipt' : 'Invoice Detail'}
                </h2>
                <p className="text-xs text-slate-500 font-mono">ID: {selectedRecord.id}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100/50 flex justify-center">
              {currentTenant && (
                <DocumentTemplate
                  document={selectedRecord}
                  tenant={currentTenant}
                  type={isSale(selectedRecord) ? 'RECEIPT' : 'INVOICE'}
                />
              )}
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setPrintRecord(selectedRecord)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print / Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {showInvoiceForm && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Create New Invoice</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Patient</label>
                <select
                  className="w-full p-2 border border-slate-200 rounded-lg"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                >
                  <option value="">-- Choose Patient --</option>
                  {state.patients.filter(p => p.tenantId === state.currentTenantId).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.ownerName})</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Line Items</label>
                  <button onClick={handleAddItem} className="text-sm text-teal-600 hover:underline">+ Add Item</button>
                </div>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Description (e.g. Vaccination)"
                        className="flex-1 p-2 border border-slate-200 rounded-lg"
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Cost"
                        className="w-24 p-2 border border-slate-200 rounded-lg text-right"
                        value={item.cost}
                        onChange={(e) => updateItem(idx, 'cost', parseFloat(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <span className="font-bold text-slate-700">Total</span>
                <span className="text-2xl font-bold text-teal-600">{formatCurrency(calculateTotal(), currency)}</span>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setShowInvoiceForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
              <button onClick={createInvoice} disabled={!selectedPatientId || calculateTotal() === 0} className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">Finalize Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
