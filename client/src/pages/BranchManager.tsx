
import React, { useState } from 'react';
import { AppState, Branch, User, UserRole } from '../types';
import { Building, Plus, Edit2, CheckCircle, XCircle, MapPin, Phone, ArrowLeft, UserPlus, Mail, Lock } from 'lucide-react';

interface Props {
  state: AppState;
  dispatch: (action: any) => void;
  onNavigate: (view: string) => void;
}

export const BranchManager: React.FC<Props> = ({ state, dispatch, onNavigate }) => {
  const [showForm, setShowForm] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  
  const [formData, setFormData] = useState<Partial<Branch>>({ active: true });
  const [adminData, setAdminData] = useState({ title: 'Dr', name: '', email: '', password: '' });

  const branches = state.branches.filter(b => b.tenantId === state.currentTenantId);

  const handleSave = () => {
    if (!formData.name || !formData.address) {
        alert("Branch Name and Address are required.");
        return;
    }

    if (!selectedBranch && (!adminData.name || !adminData.email || !adminData.password)) {
        alert("Please provide Admin details for the new branch.");
        return;
    }

    const branchId = selectedBranch ? selectedBranch.id : `b${Date.now()}`;

    const branch: Branch = {
        id: branchId,
        tenantId: state.currentTenantId,
        name: formData.name!,
        address: formData.address!,
        phone: formData.phone || '',
        active: formData.active !== undefined ? formData.active : true
    };

    if (selectedBranch) {
        dispatch({ type: 'UPDATE_BRANCH', payload: branch });
        alert("Branch updated.");
    } else {
        dispatch({ type: 'ADD_BRANCH', payload: branch });
        
        const newAdmin: User = {
            id: `u${Date.now()}`,
            title: adminData.title,
            name: adminData.name,
            email: adminData.email,
            password: adminData.password,
            role: UserRole.ADMIN,
            tenantId: state.currentTenantId,
            branchId: branchId,
            active: true,
            joinedDate: new Date().toISOString()
        };
        dispatch({ type: 'ADD_USER', payload: newAdmin });
        alert(`Branch created with Manager: ${adminData.name}`);
    }

    setShowForm(false);
    setSelectedBranch(null);
    setFormData({ active: true });
    setAdminData({ title: 'Dr', name: '', email: '', password: '' });
  };

  const handleEdit = (branch: Branch) => {
      setSelectedBranch(branch);
      setFormData(branch);
      setShowForm(true);
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-3">
                <button onClick={() => onNavigate('settings')} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Building className="w-6 h-6 text-teal-600" /> Branches
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500">Manage clinic locations.</p>
                </div>
            </div>
            <button onClick={() => { setSelectedBranch(null); setFormData({active:true}); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm font-medium text-sm">
                <Plus className="w-4 h-4" /> <span className="hidden md:inline">Add Branch</span>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.map(branch => (
                    <div key={branch.id} className={`border rounded-xl p-6 transition-all ${branch.active ? 'border-slate-200 bg-white shadow-sm hover:shadow-md' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                                <Building className="w-6 h-6" />
                            </div>
                            <div className="flex gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${branch.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {branch.active ? 'Active' : 'Inactive'}
                                </span>
                                <button onClick={() => handleEdit(branch)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-1">{branch.name}</h3>
                        <p className="text-xs text-slate-400 font-mono mb-4">ID: {branch.id}</p>
                        
                        <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-400" /> {branch.address}
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-400" /> {branch.phone || 'N/A'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {showForm && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
                    <h2 className="text-xl font-bold text-slate-800 mb-6">{selectedBranch ? 'Edit Branch' : 'Add New Branch'}</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider mb-2">Branch Details</h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name</label>
                                <input className="w-full p-2 border border-slate-200 rounded-lg" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Northside Clinic" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                <input className="w-full p-2 border border-slate-200 rounded-lg" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="123 Street Name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                <input className="w-full p-2 border border-slate-200 rounded-lg" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 234 567 890" />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="w-4 h-4 text-teal-600 rounded" />
                                <label htmlFor="active" className="text-sm text-slate-700">Branch is operational</label>
                            </div>
                        </div>

                        {!selectedBranch && (
                            <div className="space-y-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <h3 className="font-bold text-indigo-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Assign Manager</h3>
                                <div className="flex gap-2">
                                    <select 
                                        className="w-20 p-2 border border-indigo-200 rounded-lg bg-white"
                                        value={adminData.title}
                                        onChange={e => setAdminData({...adminData, title: e.target.value})}
                                    >
                                        {['Dr', 'Mr', 'Mrs'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <input className="flex-1 p-2 border border-indigo-200 rounded-lg" placeholder="Admin Name" value={adminData.name} onChange={e => setAdminData({...adminData, name: e.target.value})} />
                                </div>
                                <div>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 absolute left-3 top-3 text-indigo-400" />
                                        <input className="w-full pl-9 p-2 border border-indigo-200 rounded-lg" placeholder="Email Address" value={adminData.email} onChange={e => setAdminData({...adminData, email: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 absolute left-3 top-3 text-indigo-400" />
                                        <input type="password" className="w-full pl-9 p-2 border border-indigo-200 rounded-lg" placeholder="Password" value={adminData.password} onChange={e => setAdminData({...adminData, password: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-sm">
                            {selectedBranch ? 'Update Branch' : 'Create Branch & Admin'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
