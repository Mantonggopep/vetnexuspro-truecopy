
import React, { useState, useEffect } from 'react';
import { AppState, User, UserRole } from '../types';
import { UserPlus, Edit2, Shield, Search, CheckCircle, XCircle, Building, ArrowLeft, Lock } from 'lucide-react';
import { toTitleCase } from '../utils/textUtils';

interface Props {
    state: AppState;
    dispatch: (action: any) => void;
    onNavigate: (view: string) => void;
}

export const StaffManager: React.FC<Props> = ({ state, dispatch, onNavigate }) => {
    const [showForm, setShowForm] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<Partial<User>>({ role: UserRole.VET, title: 'Dr' });
    const [searchTerm, setSearchTerm] = useState('');

    const branches = state.branches.filter(b => b.tenantId === state.currentTenantId);

    const staffMembers = state.users.filter(u =>
        u.tenantId === state.currentTenantId &&
        u.role !== UserRole.PET_OWNER &&
        u.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSaveUser = () => {
        if (!formData.name || !formData.email || !formData.role) {
            alert("Name, Email and Role are required.");
            return;
        }

        // If creating new, password is required. If editing, it's optional.
        if (!selectedUser && !formData.password) {
            alert("Password is required for new users.");
            return;
        }

        const userPayload: User = {
            id: selectedUser ? selectedUser.id : `u${Date.now()}`,
            title: formData.title || 'Dr',
            name: toTitleCase(formData.name!),
            email: formData.email!,
            role: (formData.roles && formData.roles.length > 0) ? formData.roles[0] : (formData.role as UserRole),
            roles: formData.roles || [formData.role as UserRole],
            password: formData.password ? formData.password : (selectedUser?.password || 'password123'),
            tenantId: state.currentTenantId,
            branchId: (formData.roles || [formData.role]).includes(UserRole.PARENT_ADMIN) ? undefined : (formData.branchId || state.currentBranchId),
            active: formData.active !== undefined ? formData.active : true,
            joinedDate: selectedUser ? selectedUser.joinedDate : new Date().toISOString()
        };

        if (selectedUser) {
            dispatch({ type: 'UPDATE_USER', payload: userPayload });
        } else {
            dispatch({ type: 'ADD_USER', payload: userPayload });
        }

        setShowForm(false);
        setSelectedUser(null);
        setFormData({ role: UserRole.VET, title: 'Dr', roles: [UserRole.VET] });
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setFormData({
            title: user.title,
            name: user.name,
            email: user.email,
            role: user.role,
            roles: user.roles || [user.role],
            branchId: user.branchId,
            active: user.active
        });
        setShowForm(true);
    };

    const toggleStatus = (user: User) => {
        dispatch({ type: 'UPDATE_USER', payload: { ...user, active: !user.active } });
    };

    const getBranchName = (branchId?: string) => {
        if (!branchId) return 'All Branches';
        return branches.find(b => b.id === branchId)?.name || 'Unknown';
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <button onClick={() => onNavigate('settings')} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Staff Management</h2>
                        <p className="text-sm text-slate-500">Manage access, roles, and branch assignments.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                            placeholder="Search staff..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={() => { setSelectedUser(null); setFormData({ role: UserRole.VET, title: 'Dr', roles: [UserRole.VET] }); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm font-medium">
                        <UserPlus className="w-4 h-4" /> Add Staff
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {staffMembers.map(user => (
                        <div key={user.id} className={`border rounded-xl p-6 transition-all ${user.active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                                    {user.name?.[0] || '?'}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(user)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => toggleStatus(user)} className={`p-1.5 rounded hover:bg-slate-100 ${user.active ? 'text-green-500' : 'text-slate-400'}`}>
                                        {user.active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-slate-800">{user.title} {user.name}</h3>
                            <p className="text-sm text-slate-500 mb-4">{user.email}</p>

                            <div className="flex flex-wrap gap-2 mb-4">
                                {(user.roles || [user.role]).map((r, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] rounded font-semibold border border-indigo-100 flex items-center gap-1">
                                        <Shield className="w-3 h-3" /> {r}
                                    </span>
                                ))}
                                <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] rounded font-semibold border border-amber-100 flex items-center gap-1">
                                    <Building className="w-3 h-3" /> {getBranchName(user.branchId)}
                                </span>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">Account Status</span>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${user.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>{user.active ? 'Operational' : 'Restricted'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add/Edit Staff Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-6">{selectedUser ? 'Edit Staff Member' : 'Register New Staff Member'}</h2>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-1/3">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                    <select
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    >
                                        {['Dr', 'Mr', 'Mrs', 'Miss', 'Ms'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="w-2/3">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                    <input
                                        className="w-full p-2 border border-slate-200 rounded-lg"
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                    value={formData.email || ''}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{selectedUser ? 'New Password (Optional)' : 'Initial Password'}</label>
                                <div className="relative">
                                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="password"
                                        className="w-full pl-9 p-2 border border-slate-200 rounded-lg"
                                        value={formData.password || ''}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder={selectedUser ? "Leave blank to keep current" : "Set temporary password"}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Roles (Assign one or more)</label>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        {[
                                            { val: UserRole.VET, label: 'Veterinarian' },
                                            { val: UserRole.NURSE, label: 'Nurse' },
                                            { val: UserRole.RECEPTION, label: 'Receptionist' },
                                            { val: UserRole.ADMIN, label: 'Branch Manager' },
                                            { val: UserRole.PARENT_ADMIN, label: 'Clinic Admin' }
                                        ].map(r => (
                                            <label key={r.val} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer group border border-transparent hover:border-slate-200">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                                                    checked={(formData.roles || [formData.role]).includes(r.val as UserRole)}
                                                    onChange={e => {
                                                        const currentRoles = formData.roles || [formData.role as UserRole];
                                                        let newRoles: UserRole[];
                                                        if (e.target.checked) {
                                                            newRoles = [...currentRoles, r.val as UserRole];
                                                        } else {
                                                            newRoles = currentRoles.filter(role => role !== r.val);
                                                        }
                                                        // Ensure at least one role is selected or default back to currentformData.role
                                                        if (newRoles.length === 0) newRoles = [r.val as UserRole];

                                                        setFormData({
                                                            ...formData,
                                                            roles: newRoles,
                                                            role: newRoles[0] // Update primary role for compatibility
                                                        });
                                                    }}
                                                />
                                                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{r.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                                    <select
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                        value={formData.branchId || state.currentBranchId}
                                        onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                                    >
                                        <option value="">All Branches / Main</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-3">
                            <button onClick={() => { setShowForm(false); setSelectedUser(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button onClick={handleSaveUser} className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-sm">{selectedUser ? 'Update Staff' : 'Save Staff'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
