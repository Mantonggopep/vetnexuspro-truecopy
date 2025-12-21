
import React, { useState } from 'react';
import { AppState, Expense, Budget, ExpenseCategory } from '../types';
import { DollarSign, Plus, Trash2, PieChart, Printer, AlertTriangle, ArrowLeft, X } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../services/storage';
import { toSentenceCase } from '../utils/textUtils';

interface Props {
    state: AppState;
    dispatch: (action: any) => void;
    onNavigate: (view: string) => void;
}

const CATEGORIES: ExpenseCategory[] = ['Supplies', 'Salaries', 'Rent', 'Utilities', 'Equipment', 'Marketing', 'Other'];

export const ExpenseManager: React.FC<Props> = ({ state, dispatch, onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'expenses' | 'budgets'>('expenses');
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState<Partial<Expense>>({ category: 'Supplies', date: new Date().toISOString().split('T')[0] });

    const tenantExpenses = state.expenses.filter(e => e.tenantId === state.currentTenantId);
    const tenantBudgets = state.budgets.filter(b => b.tenantId === state.currentTenantId);

    const currentTenant = state.tenants.find(t => t.id === (state.currentTenantId || state.currentUser?.tenantId));
    const currency = currentTenant?.currency || 'NGN';

    const handleSaveExpense = () => {
        if (!formData.amount || !formData.description) {
            alert("Description and amount are required.");
            return;
        }

        const newExpense: Expense = {
            id: `exp${Date.now()}`,
            category: formData.category || 'Other',
            description: toSentenceCase(formData.description),
            amount: Number(formData.amount),
            date: new Date(formData.date!).toISOString(),
            paidBy: state.currentUser?.name || 'Unknown',
            paymentMethod: formData.paymentMethod || 'Cash',
            notes: formData.notes,
            tenantId: state.currentTenantId,
            branchId: state.currentBranchId
        };

        dispatch({ type: 'ADD_EXPENSE', payload: newExpense });
        setShowAddForm(false);
        setFormData({ category: 'Supplies', date: new Date().toISOString().split('T')[0], description: '', amount: 0 });
    };

    const handleUpdateBudget = (category: string, limit: number) => {
        dispatch({
            type: 'UPDATE_BUDGET',
            payload: {
                id: `bud_${category}`,
                category,
                monthlyLimit: limit,
                tenantId: state.currentTenantId
            }
        });
    };

    const getCategoryTotal = (category: string) => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        return tenantExpenses
            .filter(e => e.category === category && new Date(e.date).getMonth() === currentMonth && new Date(e.date).getFullYear() === currentYear)
            .reduce((sum, e) => sum + e.amount, 0);
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <button onClick={() => onNavigate('settings')} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('expenses')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'expenses' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                            Expenses
                        </button>
                        <button
                            onClick={() => setActiveTab('budgets')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'budgets' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                            Budgets & Alerts
                        </button>
                    </div>
                </div>
                {activeTab === 'expenses' && (
                    <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm font-black uppercase text-xs tracking-widest transition-all active:scale-95">
                        <Plus className="w-4 h-4" /> Add Expense
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {activeTab === 'expenses' ? (
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Date</th>
                                    <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Description</th>
                                    <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Category</th>
                                    <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Method</th>
                                    <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Amount</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {tenantExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                                    <tr key={exp.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="p-4 text-slate-500 font-medium">{new Date(exp.date).toLocaleDateString()}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-700">{exp.description}</div>
                                            {exp.notes && <div className="text-[10px] text-slate-400 truncate max-w-xs">{exp.notes}</div>}
                                        </td>
                                        <td className="p-4"><span className="px-2.5 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-tight text-slate-600">{exp.category}</span></td>
                                        <td className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">{exp.paymentMethod || 'Cash'}</td>
                                        <td className="p-4 text-right font-black text-slate-800 text-base">{formatCurrency(exp.amount, currency)}</td>
                                        <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => dispatch({ type: 'DELETE_EXPENSE', payload: exp.id })}
                                                className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {tenantExpenses.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center opacity-30 font-bold text-slate-400">No expenses recorded yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {CATEGORIES.map(cat => {
                            const budget = tenantBudgets.find(b => b.category === cat);
                            const spent = getCategoryTotal(cat);
                            const limit = budget?.monthlyLimit || 0;
                            const percent = limit > 0 ? (spent / limit) * 100 : 0;
                            const isOver = spent > limit && limit > 0;

                            return (
                                <div key={cat} className="p-6 border border-slate-100 rounded-[2rem] bg-white shadow-xl shadow-slate-200/20 group hover:-translate-y-1 transition-all duration-300">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">{cat}</h3>
                                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">Limit</span>
                                            <input
                                                type="number"
                                                className="w-24 bg-transparent text-right text-xs font-black text-indigo-600 focus:outline-none"
                                                value={limit}
                                                onChange={(e) => handleUpdateBudget(cat, Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-4 p-0.5 shadow-inner">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-gradient-to-r from-rose-500 to-pink-500' : percent > 80 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-teal-400 to-emerald-500 shadow-[0_0_12px_rgba(20,184,166,0.3)]'}`}
                                            style={{ width: `${Math.min(percent, 100)}%` }}
                                        ></div>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Current Spending</p>
                                            <p className={`text-lg font-black ${isOver ? 'text-rose-600' : 'text-slate-800'}`}>{formatCurrency(spent, currency)}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${isOver ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>{percent.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Expense Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 space-y-8 animate-in zoom-in-95 duration-300 border border-white/40">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add Expense</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Transaction Journal</p>
                            </div>
                            <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-slate-100 rounded-2xl transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                                    <select
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23CBD5E1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22/%3E%3C/svg%3E')] bg-[length:12px_12px] bg-[right_1rem_center] bg-no-repeat"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Name</label>
                                <input
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold placeholder:slate-300 focus:bg-white focus:ring-2 focus:ring-teal-100 transition-all"
                                    placeholder="e.g. Monthly Rent Payment"
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount ({getCurrencySymbol(currency)})</label>
                                    <input
                                        type="number"
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black text-slate-800"
                                        value={formData.amount || ''}
                                        onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                                    <select
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23CBD5E1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22/%3E%3C/svg%3E')] bg-[length:12px_12px] bg-[right_1rem_center] bg-no-repeat"
                                        value={formData.paymentMethod || 'Cash'}
                                        onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Card">Card</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Internal Notes</label>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold h-24 resize-none"
                                    placeholder="Add any additional details..."
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-2">
                            <button onClick={() => setShowAddForm(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                            <button onClick={handleSaveExpense} className="flex-[2] py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95">Complete Entry</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
