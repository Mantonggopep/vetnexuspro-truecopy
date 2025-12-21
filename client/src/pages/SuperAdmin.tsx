import React, { useState } from 'react';
import { AppState, Tenant, PlanTier, User, UserRole } from '../types';
import { getPlanFeatures } from '../services/storage';
import { backend } from '../services/api';
import {
    Server, Database, Activity, Search, Shield, MoreVertical,
    CheckCircle, XCircle, Power, Edit3, Globe, DollarSign, Plus, X, Users, GitBranch, Cpu, HardDrive
} from 'lucide-react';
import { toTitleCase } from '../utils/textUtils';

interface Props {
    state: AppState;
    dispatch: (action: any) => void;
}

const COUNTRY_DATA: Record<string, { currency: string, timezone: string }> = {
    // Africa
    "Nigeria": { currency: "NGN", timezone: "Africa/Lagos" },
    "Egypt": { currency: "EGP", timezone: "Africa/Cairo" },
    "South Africa": { currency: "ZAR", timezone: "Africa/Johannesburg" },
    "Algeria": { currency: "DZD", timezone: "Africa/Algiers" },
    "Morocco": { currency: "MAD", timezone: "Africa/Casablanca" },
    "Ethiopia": { currency: "ETB", timezone: "Africa/Addis_Ababa" },
    "Kenya": { currency: "KES", timezone: "Africa/Nairobi" },
    "Angola": { currency: "AOA", timezone: "Africa/Luanda" },
    "Ghana": { currency: "GHS", timezone: "Africa/Accra" },
    "Tanzania": { currency: "TZS", timezone: "Africa/Dar_es_Salaam" },
    "Côte d'Ivoire": { currency: "XOF", timezone: "Africa/Abidjan" },
    "DR Congo": { currency: "CDF", timezone: "Africa/Kinshasa" },
    "Cameroon": { currency: "XAF", timezone: "Africa/Douala" },
    "Tunisia": { currency: "TND", timezone: "Africa/Tunis" },
    "Uganda": { currency: "UGX", timezone: "Africa/Kampala" },
    "Sudan": { currency: "SDG", timezone: "Africa/Khartoum" },
    "Libya": { currency: "LYD", timezone: "Africa/Tripoli" },
    "Zimbabwe": { currency: "USD", timezone: "Africa/Harare" },
    "Senegal": { currency: "XOF", timezone: "Africa/Dakar" },
    "Zambia": { currency: "ZMW", timezone: "Africa/Lusaka" },
    "Mali": { currency: "XOF", timezone: "Africa/Bamako" },
    "Burkina Faso": { currency: "XOF", timezone: "Africa/Ouagadougou" },
    "Madagascar": { currency: "MGA", timezone: "Indian/Antananarivo" },
    "Mozambique": { currency: "MZN", timezone: "Africa/Maputo" },
    "Botswana": { currency: "BWP", timezone: "Africa/Gaborone" },
    "Rwanda": { currency: "RWF", timezone: "Africa/Kigali" },

    // Europe
    "United Kingdom": { currency: "GBP", timezone: "Europe/London" },
    "Germany": { currency: "EUR", timezone: "Europe/Berlin" },
    "France": { currency: "EUR", timezone: "Europe/Paris" },
    "Italy": { currency: "EUR", timezone: "Europe/Rome" },
    "Spain": { currency: "EUR", timezone: "Europe/Madrid" },
    "Netherlands": { currency: "EUR", timezone: "Europe/Amsterdam" },
    "Switzerland": { currency: "CHF", timezone: "Europe/Zurich" },
    "Sweden": { currency: "SEK", timezone: "Europe/Stockholm" },
    "Belgium": { currency: "EUR", timezone: "Europe/Brussels" },

    // Other Western
    "United States": { currency: "USD", timezone: "America/New_York" },
    "Australia": { currency: "AUD", timezone: "Australia/Sydney" },
    "Canada": { currency: "CAD", timezone: "America/Toronto" },
};

export const SuperAdmin: React.FC<Props> = ({ state, dispatch }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

    const [formData, setFormData] = useState({
        clinicName: '',
        clinicType: 'Companion',
        country: 'United States',
        timezone: 'America/New_York',
        currency: 'USD',
        adminTitle: 'Dr',
        adminName: '',
        adminEmail: '',
        adminPhone: '',
        adminPassword: '',
        confirmPassword: '',
        plan: PlanTier.STANDARD
    });

    const filteredTenants = state.tenants.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggleStatus = (tenant: Tenant) => {
        const newStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        if (confirm(`Are you sure you want to set ${tenant.name} to ${newStatus}?`)) {
            dispatch({ type: 'UPDATE_TENANT', payload: { id: tenant.id, status: newStatus } });
            if (selectedTenant?.id === tenant.id) {
                setSelectedTenant({ ...tenant, status: newStatus });
            }
        }
    };

    const handleChangePlan = (tenantId: string, newPlan: PlanTier) => {
        if (confirm(`Change plan to ${newPlan}?`)) {
            dispatch({ type: 'UPDATE_TENANT', payload: { id: tenantId, plan: newPlan } });
            if (selectedTenant?.id === tenantId) {
                setSelectedTenant({ ...selectedTenant, plan: newPlan });
            }
        }
    };

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const country = e.target.value;
        const data = COUNTRY_DATA[country];
        if (data) {
            setFormData(prev => ({
                ...prev,
                country,
                currency: data.currency,
                timezone: data.timezone
            }));
        } else {
            setFormData(prev => ({ ...prev, country }));
        }
    };



    // ... existing imports ...

    // ... inside component ...

    const handleCreateTenant = async () => {
        if (!formData.clinicName || !formData.adminEmail || !formData.adminPassword) {
            alert("Please fill in all required fields.");
            return;
        }
        if (formData.adminPassword !== formData.confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        const tenantId = `t${Date.now()}`;
        const newTenant: Tenant = {
            id: tenantId,
            name: toTitleCase(formData.clinicName),
            address: 'Main St (Default)',
            type: formData.clinicType as any,
            country: formData.country,
            timezone: formData.timezone,
            currency: formData.currency,
            plan: formData.plan,
            status: 'ACTIVE',
            storageUsed: 0,
            ramUsage: 0,
            features: getPlanFeatures(formData.plan)
        };

        const newAdmin: User = {
            id: `u${Date.now()}`,
            title: formData.adminTitle,
            name: toTitleCase(formData.adminName),
            email: formData.adminEmail,
            password: formData.adminPassword,
            role: UserRole.PARENT_ADMIN,
            tenantId: tenantId,
            active: true,
            joinedDate: new Date().toISOString()
        };

        try {
            // Call backend to persist
            const response = await backend.registerTenant({ tenant: newTenant, admin: newAdmin });

            // Dispatch with full response (including the created branch)
            dispatch({
                type: 'REGISTER_TENANT',
                payload: {
                    tenant: response.tenant,
                    admin: response.admin,
                    branch: response.branch
                }
            });

            alert(`Clinic "${newTenant.name}" created successfully.`);
            setShowCreateForm(false);
            setFormData({
                clinicName: '',
                clinicType: 'Companion',
                country: 'United States',
                timezone: 'America/New_York',
                currency: 'USD',
                adminTitle: 'Dr',
                adminName: '',
                adminEmail: '',
                adminPhone: '',
                adminPassword: '',
                confirmPassword: '',
                plan: PlanTier.STANDARD
            });
        } catch (e: any) {
            alert("Failed to create tenant: " + e.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
            <div className="bg-slate-900 text-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-teal-400" />
                    <h1 className="text-lg font-bold">VET NEXUS <span className="text-teal-400 font-light">SuperAdmin</span></h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-xs text-slate-400">
                        System Status: <span className="text-green-400 font-bold">OPERATIONAL</span>
                    </div>
                    <button onClick={() => dispatch({ type: 'LOGOUT' })} className="text-xs bg-slate-800 px-3 py-1 rounded hover:bg-slate-700">Logout</button>
                </div>
            </div>

            <div className="p-8 max-w-7xl mx-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600"><Server className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Active Clinics</p>
                            <h3 className="text-2xl font-bold text-slate-800">{state.tenants.filter(t => t.status === 'ACTIVE').length} <span className="text-sm font-normal text-slate-400">/ {state.tenants.length}</span></h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-teal-50 rounded-lg text-teal-600"><Database className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Total Records</p>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {(state.patients.length + state.invoices.length + state.logs.length).toLocaleString()}
                            </h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-amber-50 rounded-lg text-amber-600"><Activity className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">System Load</p>
                            <h3 className="text-2xl font-bold text-slate-800">12%</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-800">Tenant Management</h2>
                        <div className="flex gap-4">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <input
                                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64"
                                    placeholder="Find clinic..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm font-medium"
                            >
                                <Plus className="w-4 h-4" /> Create Tenant
                            </button>
                        </div>
                    </div>

                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold">
                            <tr>
                                <th className="p-4">Clinic Name</th>
                                <th className="p-4">Location</th>
                                <th className="p-4">Plan Tier</th>
                                <th className="p-4">Users</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTenants.map(tenant => (
                                <tr
                                    key={tenant.id}
                                    className="hover:bg-slate-50 cursor-pointer"
                                    onClick={() => setSelectedTenant(tenant)}
                                >
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{tenant.name}</div>
                                        <div className="text-xs text-slate-400">{tenant.id}</div>
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        <div className="flex items-center gap-1"><Globe className="w-3 h-3" /> {tenant.country}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${tenant.plan === 'PREMIUM' ? 'bg-indigo-100 text-indigo-700' :
                                            tenant.plan === 'STANDARD' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                                            }`}>{tenant.plan}</span>
                                    </td>
                                    <td className="p-4 font-mono text-slate-600">
                                        {state.users.filter(u => u.tenantId === tenant.id).length}
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {tenant.status === 'ACTIVE' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                            {tenant.status || 'ACTIVE'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">View Metrics</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedTenant && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold">{selectedTenant.name}</h2>
                                <span className="text-xs bg-slate-700 px-2 py-1 rounded">{selectedTenant.id}</span>
                            </div>
                            <button onClick={() => setSelectedTenant(null)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                    <h3 className="text-sm font-semibold text-slate-500 mb-4 flex items-center gap-2"><HardDrive className="w-4 h-4" /> Storage Usage</h3>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-2xl font-bold text-slate-800">{selectedTenant.storageUsed || 0} <span className="text-sm text-slate-400">GB</span></span>
                                        <span className="text-sm text-slate-500">of 500 GB</span>
                                    </div>
                                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-teal-500" style={{ width: `${((selectedTenant.storageUsed || 0) / 500) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                    <h3 className="text-sm font-semibold text-slate-500 mb-4 flex items-center gap-2"><Cpu className="w-4 h-4" /> RAM Load</h3>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-2xl font-bold text-slate-800">{selectedTenant.ramUsage || 0} <span className="text-sm text-slate-400">%</span></span>
                                        <span className="text-sm text-slate-500">Average Load</span>
                                    </div>
                                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                        <div className={`h-full ${(selectedTenant.ramUsage || 0) > 80 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${selectedTenant.ramUsage || 0}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="p-4 border border-slate-200 rounded-xl flex flex-col justify-center items-center text-center">
                                    <Users className="w-8 h-8 text-slate-400 mb-2" />
                                    <h4 className="text-2xl font-bold text-slate-800">{state.users.filter(u => u.tenantId === selectedTenant.id).length}</h4>
                                    <span className="text-xs text-slate-500 font-semibold">Total Users</span>
                                </div>
                                <div className="p-4 border border-slate-200 rounded-xl flex flex-col justify-center items-center text-center">
                                    <GitBranch className="w-8 h-8 text-slate-400 mb-2" />
                                    <h4 className="text-2xl font-bold text-slate-800">{state.branches.filter(b => b.tenantId === selectedTenant.id).length}</h4>
                                    <span className="text-xs text-slate-500 uppercase font-bold">Branches</span>
                                </div>
                                <div className="p-4 border border-slate-200 rounded-xl flex flex-col justify-center items-center text-center bg-indigo-50 border-indigo-100">
                                    <span className="text-sm font-bold text-indigo-600 mb-1 uppercase">Subscription</span>
                                    <select
                                        className="bg-white border border-indigo-200 text-indigo-900 font-bold text-sm rounded px-2 py-1 focus:outline-none"
                                        value={selectedTenant.plan}
                                        onChange={(e) => handleChangePlan(selectedTenant.id, e.target.value as PlanTier)}
                                    >
                                        <option value="STARTER">Starter</option>
                                        <option value="STANDARD">Standard</option>
                                        <option value="PREMIUM">Premium</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-red-50 border border-red-200 p-6 rounded-xl">
                                <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2"><Shield className="w-4 h-4" /> Administrative Actions</h3>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-red-700">Suspend access to this tenant. All users will be locked out immediately.</p>
                                    <button
                                        onClick={() => handleToggleStatus(selectedTenant)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors ${selectedTenant.status === 'ACTIVE'
                                            ? 'bg-white text-red-600 border border-red-200 hover:bg-red-100'
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                            }`}
                                    >
                                        {selectedTenant.status === 'ACTIVE' ? 'Suspend Tenant' : 'Reactivate Tenant'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCreateForm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-teal-400" /> Create New Tenant</h2>
                            <button onClick={() => setShowCreateForm(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Clinic Information</h3>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Clinic Name</label>
                                    <input
                                        className="w-full p-2 border border-slate-200 rounded-lg"
                                        value={formData.clinicName}
                                        onChange={e => setFormData({ ...formData, clinicName: e.target.value })}
                                        placeholder="e.g. Safari Vet Clinic"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Clinic Type</label>
                                    <select
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                        value={formData.clinicType}
                                        onChange={e => setFormData({ ...formData, clinicType: e.target.value })}
                                    >
                                        <option value="Companion">Companion Animal</option>
                                        <option value="Livestock">Livestock / Farm</option>
                                        <option value="Mixed">Mixed Practice</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                                    <select
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                        value={formData.country}
                                        onChange={handleCountryChange}
                                    >
                                        {Object.keys(COUNTRY_DATA).sort().map(country => (
                                            <option key={country} value={country}>{country}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency (Auto)</label>
                                    <input
                                        className="w-full p-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed"
                                        value={formData.currency}
                                        readOnly
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Subscription Plan</label>
                                    <select
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                        value={formData.plan}
                                        onChange={e => setFormData({ ...formData, plan: e.target.value as PlanTier })}
                                    >
                                        <option value="STARTER">Starter</option>
                                        <option value="STANDARD">Standard</option>
                                        <option value="PREMIUM">Premium</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2 mt-4">
                                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Administrator Account</h3>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                    <select
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                        value={formData.adminTitle}
                                        onChange={e => setFormData({ ...formData, adminTitle: e.target.value })}
                                    >
                                        {['Dr', 'Mr', 'Mrs', 'Miss', 'Ms', 'Prof', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                    <input
                                        className="w-full p-2 border border-slate-200 rounded-lg"
                                        value={formData.adminName}
                                        onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                                        placeholder="Admin User Name"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full p-2 border border-slate-200 rounded-lg"
                                        value={formData.adminEmail}
                                        onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                                        placeholder="admin@clinic.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        className="w-full p-2 border border-slate-200 rounded-lg"
                                        value={formData.adminPassword}
                                        onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                                    <input
                                        type="password"
                                        className="w-full p-2 border border-slate-200 rounded-lg"
                                        value={formData.confirmPassword}
                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button onClick={() => setShowCreateForm(false)} className="px-6 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">Cancel</button>
                            <button onClick={handleCreateTenant} className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-md">Create Tenant</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};