
import React, { useState } from 'react';
import { AppState, Service, ServiceCategory } from '../types';
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, DollarSign, Printer, AlertCircle } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../services/storage';
import { toTitleCase, toSentenceCase } from '../utils/textUtils';

interface Props {
    state: AppState;
    dispatch: (action: any) => void;
}

const CATEGORIES: ServiceCategory[] = [
    'Treatment', 'Prophylaxis', 'Surgery', 'Diagnostics', 'Consultation', 'Laboratory', 'Grooming', 'Boarding', 'Other'
];

export const ServiceManager: React.FC<Props> = ({ state, dispatch }) => {
    const [showForm, setShowForm] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const currentTenant = state.tenants.find(t => t.id === (state.currentTenantId || state.currentUser?.tenantId));
    const currency = currentTenant?.currency || 'NGN';

    const [formData, setFormData] = useState<Partial<Service>>({
        category: 'Treatment',
        visibleToClient: true,
        isActive: true,
        costInternal: 0,
        priceClient: 0
    });

    const services = state.services
        .filter(s => s.tenantId === state.currentTenantId)
        .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.category.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => b.usageCount - a.usageCount);

    const calculateProfit = (price: number, cost: number) => {
        return price - cost;
    };

    const handleCreateNew = () => {
        setSelectedService(null);
        setFormData({
            category: 'Treatment',
            visibleToClient: true,
            isActive: true,
            costInternal: 0,
            priceClient: 0,
            usageCount: 0
        });
        setShowForm(true);
    };

    const handleEdit = (service: Service) => {
        setSelectedService(service);
        setFormData(service);
        setShowForm(true);
    };

    const handleSave = () => {
        if (!formData.name || formData.priceClient === undefined) {
            alert("Service name and client price are required.");
            return;
        }

        if ((formData.priceClient || 0) < (formData.costInternal || 0)) {
            if (!confirm("Warning: Client price is lower than internal cost. This service will generate a loss. Continue?")) {
                return;
            }
        }

        const profit = calculateProfit(Number(formData.priceClient), Number(formData.costInternal));

        const service: Service = {
            id: selectedService ? selectedService.id : `srv${Date.now()}`,
            name: toTitleCase(formData.name),
            category: formData.category as ServiceCategory,
            description: toSentenceCase(formData.description || ''),
            costInternal: Number(formData.costInternal),
            priceClient: Number(formData.priceClient),
            profit: profit,
            visibleToClient: formData.visibleToClient || false,
            isActive: formData.isActive !== undefined ? formData.isActive : true,
            usageCount: selectedService ? selectedService.usageCount : 0,
            tenantId: state.currentTenantId
        };

        if (selectedService) {
            dispatch({ type: 'UPDATE_SERVICE', payload: service });
        } else {
            dispatch({ type: 'ADD_SERVICE', payload: service });
        }
        setShowForm(false);
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this service?")) {
            dispatch({ type: 'DELETE_SERVICE', payload: { serviceId: id } });
        }
    };

    const printPriceList = () => {
        window.print();
    };

    return (
        <div className="h-[calc(100vh-100px)] flex gap-6">
            <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${showForm ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Services & Pricing</h2>
                            <p className="text-sm text-slate-500">Manage clinic procedures, pricing, and profitability.</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={printPriceList} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">
                                <Printer className="w-4 h-4" /> Print List
                            </button>
                            <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold shadow-sm">
                                <Plus className="w-4 h-4" /> Add Service
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="Search by name or category..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                            <tr>
                                <th className="p-4 font-semibold text-slate-600">Service Name</th>
                                <th className="p-4 font-semibold text-slate-600">Category</th>
                                <th className="p-4 font-semibold text-slate-600 text-right">Client Price</th>
                                <th className="p-4 font-semibold text-slate-600 text-right">Profit</th>
                                <th className="p-4 font-semibold text-slate-600 text-center">Portal</th>
                                <th className="p-4 font-semibold text-slate-600 text-center">Status</th>
                                <th className="p-4 font-semibold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {services.map(srv => (
                                <tr key={srv.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium text-slate-700">
                                        {srv.name}
                                        {srv.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{srv.description}</p>}
                                    </td>
                                    <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">{srv.category}</span></td>
                                    <td className="p-4 text-right font-bold text-slate-800">{formatCurrency(srv.priceClient, currency)}</td>
                                    <td className="p-4 text-right">
                                        <span className={`font-medium ${srv.profit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {formatCurrency(srv.profit, currency)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {srv.visibleToClient ? <CheckCircle className="w-4 h-4 text-teal-500 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${srv.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {srv.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button onClick={() => handleEdit(srv)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(srv.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                            {services.length === 0 && (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No services found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showForm && (
                <div className="w-full md:w-96 bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col animate-fade-in h-full">
                    <div className="p-6 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-bold text-lg text-slate-800">{selectedService ? 'Edit Service' : 'New Service'}</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Service Name *</label>
                            <input
                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Vaccination"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                            <select
                                className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value as ServiceCategory })}
                            >
                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Internal Cost</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-slate-400">{getCurrencySymbol(currency)}</span>
                                    <input
                                        type="number"
                                        className="w-full pl-6 p-2 border border-slate-200 rounded-lg"
                                        value={formData.costInternal}
                                        onChange={e => setFormData({ ...formData, costInternal: Number(e.target.value) })}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Drugs, labor, overhead</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Client Price *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-slate-400">{getCurrencySymbol(currency)}</span>
                                    <input
                                        type="number"
                                        className="w-full pl-6 p-2 border border-slate-200 rounded-lg font-bold text-slate-800"
                                        value={formData.priceClient}
                                        onChange={e => setFormData({ ...formData, priceClient: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={`p-4 rounded-lg border ${(formData.priceClient || 0) < (formData.costInternal || 0) ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                            }`}>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-600">Estimated Profit</span>
                                <span className={`text-lg font-bold ${(formData.priceClient || 0) < (formData.costInternal || 0) ? 'text-red-700' : 'text-green-700'
                                    }`}>
                                    {formatCurrency(((formData.priceClient || 0) - (formData.costInternal || 0)), currency)}
                                </span>
                            </div>
                            {(formData.priceClient || 0) < (formData.costInternal || 0) && (
                                <div className="flex items-center gap-1 text-xs text-red-600 mt-2 font-medium">
                                    <AlertCircle className="w-3 h-3" /> Warning: Negative Margin
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                            <textarea
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                rows={3}
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Visible in client portal if enabled..."
                            />
                        </div>

                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            <label className="flex items-center justify-between cursor-pointer">
                                <span className="text-sm font-medium text-slate-700">Visible to Clients</span>
                                <div className="relative inline-block w-10 h-6 align-middle select-none transition duration-200 ease-in">
                                    <input type="checkbox" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                        checked={formData.visibleToClient}
                                        onChange={e => setFormData({ ...formData, visibleToClient: e.target.checked })}
                                    />
                                    <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.visibleToClient ? 'bg-teal-500' : 'bg-slate-300'}`}></label>
                                </div>
                            </label>
                            <label className="flex items-center justify-between cursor-pointer">
                                <span className="text-sm font-medium text-slate-700">Active Status</span>
                                <div className="relative inline-block w-10 h-6 align-middle select-none transition duration-200 ease-in">
                                    <input type="checkbox" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                        checked={formData.isActive}
                                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.isActive ? 'bg-green-500' : 'bg-slate-300'}`}></label>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-sm">Save Service</button>
                    </div>
                </div>
            )}
        </div>
    );
};
