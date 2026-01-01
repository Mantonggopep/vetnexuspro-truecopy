
import React, { useState, useRef, useEffect } from 'react';
import { AppState, Client, UserRole, User, ChatMessage, PatientType, Patient } from '../types';
import { formatCurrency } from '../services/storage';
import { generateClientId } from '../utils/idGenerator';
import { Search, Plus, User as UserIcon, Trash2, Mail, Phone, MapPin, Building, ChevronLeft, ChevronRight, Send, RefreshCw, Key, Paperclip, Save, X, PawPrint, Check, CheckCircle2, Clock, MessageSquare, Calendar, FileText, Package, Bell, ArrowLeft } from 'lucide-react';
import { toTitleCase, toSentenceCase } from '../utils/textUtils';

interface Props {
    state: AppState;
    dispatch: (action: any) => void;
    initialClientId?: string | null;
    onClearInitialClient?: () => void;
}

const groupByDate = (messages: ChatMessage[]) => {
    const groups: Record<string, ChatMessage[]> = {};
    messages.forEach(msg => {
        const date = new Date(msg.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
    });
    return groups;
};

const TITLES = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof', 'Capt', 'Gen', 'Rev', 'Other'];

export const ClientManager: React.FC<Props> = ({ state, dispatch, initialClientId, onClearInitialClient }) => {
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'financials' | 'communication' | 'orders' | 'portal'>('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    const [showAddPatientModal, setShowAddPatientModal] = useState(false);
    const [patientForm, setPatientForm] = useState<Partial<Patient>>({ type: 'Single', status: 'Active' });

    const [chatMessage, setChatMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Portal Management
    const [newPortalPassword, setNewPortalPassword] = useState('');

    const [formData, setFormData] = useState<Partial<Client>>({ title: 'Mr' });

    const handleNewChat = () => {
        setSearchTerm('');
        setShowForm(false);
        setSelectedClient(null);
        setShowSearchDropdown(true);
    };

    const currentBranch = state.branches.find(b => b.id === state.currentBranchId);
    const currency = state.tenants.find(t => t.id === state.currentTenantId)?.currency || 'USD';

    const allClients = [...state.clients].reverse().filter(c => c.tenantId === state.currentTenantId);

    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [broadcastMsg, setBroadcastMsg] = useState('');

    const handleBroadcast = () => {
        if (!broadcastMsg.trim()) return;
        const targetClients = allClients.filter(c => c.portalEnabled);
        if (targetClients.length === 0) {
            alert("No clients have portal enabled.");
            return;
        }

        if (window.confirm(`Send this message to all ${targetClients.length} clients?`)) {
            targetClients.forEach(client => {
                const msg: ChatMessage = {
                    id: `msg_bcast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    clientId: client.id,
                    tenantId: state.currentTenantId,
                    sender: 'CLINIC',
                    senderName: state.currentUser?.name || 'Clinic Admin',
                    content: `[BROADCAST] ${broadcastMsg}`,
                    timestamp: new Date().toISOString(),
                };
                dispatch({ type: 'SEND_CHAT', payload: msg });
            });
            setBroadcastMsg('');
            setShowBroadcastModal(false);
            alert("Broadcast sent successfully!");
        }
    };
    const filteredClients = allClients.filter(c =>
        c.branchId === state.currentBranchId &&
        (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const last10Clients = allClients.slice(0, 10);

    // Chat Data for Selected Client
    const clientChats = state.chats
        .filter(c => c.clientId === selectedClient?.id)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    useEffect(() => {
        if (activeTab === 'communication' && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeTab, clientChats, selectedClient]);

    useEffect(() => {
        if (initialClientId) {
            const client = state.clients.find(c => c.id === initialClientId);
            if (client) {
                setSelectedClient(client);
                setActiveTab('communication');
                if (onClearInitialClient) onClearInitialClient();
            }
        }
    }, [initialClientId, state.clients]);

    const getClientColor = (clientId: string) => {
        const colors = ['bg-slate-50', 'bg-red-50', 'bg-orange-50', 'bg-amber-50', 'bg-green-50', 'bg-emerald-50', 'bg-teal-50', 'bg-cyan-50', 'bg-sky-50', 'bg-blue-50', 'bg-indigo-50', 'bg-violet-50', 'bg-purple-50', 'bg-fuchsia-50', 'bg-pink-50', 'bg-rose-50'];
        let hash = 0;
        for (let i = 0; i < clientId.length; i++) {
            hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const handleSaveClient = () => {
        if (!formData.name || !formData.email) {
            alert("Please fill in Name and Email.");
            return;
        }

        if (selectedClient && showForm) {
            // Edit logic placeholder
        } else {
            const currentTenant = state.tenants.find(t => t.id === state.currentTenantId);
            const newClient: Client = {
                id: currentTenant ? generateClientId(currentTenant, state.clients.length) : `c${Date.now()}`,
                title: formData.title || '',
                name: toTitleCase(formData.name!),
                email: formData.email!,
                phone: formData.phone || '',
                address: toSentenceCase(formData.address || ''),
                notes: toSentenceCase(formData.notes || ''),
                tenantId: state.currentTenantId,
                branchId: state.currentBranchId,
                portalEnabled: formData.portalEnabled || false,
                balance: 0
            };
            dispatch({ type: 'ADD_CLIENT', payload: newClient });

            if (newClient.portalEnabled) {
                createPortalUser(newClient);
            }
        }
        setShowForm(false);
        setFormData({ title: 'Mr' });
    };

    const createPortalUser = (client: Client, manualPassword?: string) => {
        const password = manualPassword || client.phone;
        if (!password && !manualPassword) {
            alert("Client phone number is required to auto-generate portal password.");
            return;
        }
        const existingUser = state.users.find(u => u.clientId === client.id);

        if (existingUser) {
            dispatch({ type: 'UPDATE_USER', payload: { ...existingUser, password } });
            alert(`Portal password updated for ${client.name}.`);
        } else {
            const newUser: User = {
                id: `u_${client.id}`,
                title: client.title,
                name: client.name,
                email: client.email,
                password: password,
                role: UserRole.PET_OWNER,
                tenantId: client.tenantId,
                clientId: client.id,
                active: true
            };
            dispatch({ type: 'REGISTER_PORTAL_USER', payload: newUser });
            alert(`Portal account created for ${client.name}. Password set to their phone number.`);
        }
        setNewPortalPassword('');
    };

    const handleUpdatePortalPassword = () => {
        if (!selectedClient || !newPortalPassword) return;
        createPortalUser(selectedClient, newPortalPassword);
    }

    const handleSavePatient = () => {
        if (!selectedClient || !patientForm.name || !patientForm.species) {
            alert("Patient Name and Species are required.");
            return;
        }

        const newPatient: Patient = {
            id: `p${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: toTitleCase(patientForm.name),
            type: (patientForm.type as any) || 'Single',
            species: toTitleCase(patientForm.species),
            breed: toTitleCase(patientForm.breed || 'Unknown'),
            sex: patientForm.sex || 'Unknown',
            age: patientForm.age || '0',
            identificationTag: patientForm.identificationTag || '',
            chipNumber: patientForm.chipNumber || '',
            ownerId: selectedClient.id,
            ownerName: selectedClient.name,
            tenantId: state.currentTenantId,
            branchId: state.currentBranchId,
            status: 'Active',
            notes: [],
            attachments: [],
            reminders: []
        };

        dispatch({ type: 'ADD_PATIENT', payload: newPatient });
        setShowAddPatientModal(false);
        setPatientForm({ type: 'Single', status: 'Active' });
        alert(`${newPatient.name} registered successfully!`);
    };

    const handleDelete = () => {
        if (!selectedClient) return;
        if (selectedClient.balance > 0) {
            alert("Cannot delete client with outstanding financial balance.");
            return;
        }
        const reason = prompt("Enter reason for deletion (Required for Audit Log):");
        if (reason) {
            dispatch({ type: 'DELETE_CLIENT', payload: { clientId: selectedClient.id, reason } });
            setSelectedClient(null);
        }
    };

    const handleSendChat = () => {
        if (!selectedClient || !chatMessage.trim()) return;
        const msg: ChatMessage = {
            id: `msg${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            clientId: selectedClient.id,
            tenantId: state.currentTenantId,
            sender: 'CLINIC',
            senderName: state.currentUser?.name || 'Staff',
            content: chatMessage,
            timestamp: new Date().toISOString()
        };
        dispatch({ type: 'SEND_CHAT', payload: msg });
        setChatMessage('');
    };

    const getClientFinancials = () => {
        if (!selectedClient) return [];
        const invoices = state.invoices.filter(i => i.clientId === selectedClient.id).map(i => ({
            type: 'INVOICE',
            id: i.id,
            date: i.date,
            amount: i.total,
            status: i.status,
            details: `${i.items.length} items`
        }));
        const sales = state.sales.filter(s => s.clientId === selectedClient.id).map(s => ({
            type: 'POS SALE',
            id: s.id,
            date: s.date,
            amount: s.total,
            status: s.status,
            details: 'Over Counter'
        }));
        return [...invoices, ...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const financials = getClientFinancials();

    useEffect(() => {
        if (selectedClient && activeTab === 'communication') {
            const unread = state.chats.filter(c => c.clientId === selectedClient.id && c.sender === 'CLIENT' && !c.isRead);
            unread.forEach(m => {
                dispatch({ type: 'UPDATE_CHAT', payload: { ...m, isRead: true, readAt: new Date().toISOString() } });
            });
        }
    }, [selectedClient, activeTab, state.chats, dispatch]);

    // Portal User Info
    const portalUser = selectedClient ? state.users.find(u => u.clientId === selectedClient.id) : null;

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 relative">
            <div className={`w-full md:w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col ${selectedClient || showForm ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-700">Clients</h2>
                            <p className="text-xs text-slate-500 flex items-center gap-1"><Building className="w-3 h-3" /> {currentBranch?.name}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleNewChat} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 shadow-sm" title="New Message">
                                <MessageSquare className="w-5 h-5" />
                            </button>
                            <button onClick={() => { setShowForm(true); setFormData({ title: 'Mr' }); setSelectedClient(null); }} className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm" title="Add Client">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 neo-input"
                            placeholder="Search clients..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onFocus={() => setShowSearchDropdown(true)}
                            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                        />
                        {showSearchDropdown && (
                            <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-20 mt-1 max-h-60 overflow-y-auto">
                                <p className="text-[10px] font-bold text-slate-400 uppercase px-3 py-2 bg-slate-50">Recent Clients</p>
                                {last10Clients.map(c => (
                                    <div
                                        key={c.id}
                                        className="px-3 py-2 hover:bg-teal-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0"
                                        onClick={() => { setSelectedClient(c); setSearchTerm(''); }}
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">{c.title} {c.name}</p>
                                            <p className="text-xs text-slate-400">{c.email}</p>
                                        </div>
                                        <ChevronRight className="w-3 h-3 text-slate-300" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredClients.map(client => (
                        <div
                            key={client.id}
                            onClick={() => { setSelectedClient(client); setShowForm(false); setActiveTab('overview'); setNewPortalPassword(''); }}
                            className={`p-3 rounded-lg cursor-pointer border-l-4 transition-all ${selectedClient?.id === client.id ? 'bg-teal-50 border-teal-500 shadow-sm' : 'border-transparent hover:bg-slate-50'
                                }`}
                        >
                            <div className="flex justify-between">
                                <h3 className="font-medium text-slate-700">{client.title} {client.name}</h3>
                                {client.balance > 0 && <span className="text-xs text-rose-500 font-bold">${client.balance}</span>}
                            </div>
                            <p className="text-xs text-slate-400 truncate">{client.email}</p>
                        </div>
                    ))}
                    {filteredClients.length === 0 && <p className="text-center text-sm text-slate-400 py-6">No clients found.</p>}
                </div>
            </div>

            <div className={`flex-1 rounded-xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden transition-colors duration-500 ${selectedClient && !showForm ? getClientColor(selectedClient.id) : 'bg-white'} ${!selectedClient && !showForm ? 'hidden md:flex' : 'flex'}`}>

                {(selectedClient || showForm) && (
                    <div className="md:hidden p-2 bg-slate-100 border-b border-slate-200 flex items-center">
                        <button onClick={() => { setSelectedClient(null); setShowForm(false); }} className="flex items-center gap-1 text-slate-600 font-medium">
                            <ChevronLeft className="w-5 h-5" /> Back to List
                        </button>
                    </div>
                )}

                {showForm ? (
                    <div className="p-8 animate-fade-in overflow-y-auto bg-white h-full">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedClient ? 'Edit Client' : 'Add New Client'}</h2>
                        <p className="text-sm text-slate-500 mb-6">Registering to branch: <strong>{currentBranch?.name}</strong></p>

                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-2">Title</label>
                                <select
                                    className="w-full p-2.5 neo-input bg-white font-semibold text-slate-700"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                >
                                    {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-2">Full Name</label>
                                <input className="w-full p-2.5 neo-input font-semibold text-slate-800" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-2">Email</label>
                                <input className="w-full p-2.5 neo-input font-semibold text-slate-800" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-2">Phone</label>
                                <input className="w-full p-2.5 neo-input font-semibold text-slate-800" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+1..." />
                            </div>
                            <div className="col-span-4">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-2">Address</label>
                                <input className="w-full p-2.5 neo-input font-semibold text-slate-800" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Street, City..." />
                            </div>
                            <div className="col-span-4">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-2">Notes</label>
                                <textarea className="w-full p-2.5 neo-input font-medium text-slate-700" rows={2} value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Optional client notes..." />
                            </div>
                            <div className="col-span-4 flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <input type="checkbox" id="portal" checked={formData.portalEnabled || false} onChange={e => setFormData({ ...formData, portalEnabled: e.target.checked })} className="w-4 h-4 text-teal-600 rounded" />
                                <div>
                                    <label htmlFor="portal" className="text-sm font-bold text-slate-700">Create login portal?</label>
                                    <p className="text-xs text-slate-500">Client will use their phone number as password.</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex gap-4">
                            <button onClick={handleSaveClient} className="px-10 py-3 bg-slate-800 text-white rounded-2xl hover:bg-slate-900 font-bold shadow-lg active:scale-95 transition-all text-sm uppercase tracking-wider">Save Client</button>
                            <button onClick={() => setShowForm(false)} className="px-6 py-3 text-slate-400 hover:text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest transition-colors">Cancel</button>
                        </div>
                    </div>
                ) : selectedClient ? (
                    <>
                        <div className="p-6 bg-white/60 backdrop-blur-sm border-b border-slate-200 flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">{selectedClient.title} {selectedClient.name}</h1>
                                <div className="flex gap-4 mt-2 text-sm text-slate-600">
                                    <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {selectedClient.email}</span>
                                    <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {selectedClient.phone}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleDelete} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-red-50" title="Delete Client"><Trash2 className="w-5 h-5 text-red-500" /></button>
                            </div>
                        </div>

                        <div className="flex border-b border-slate-200 px-6 bg-white/40 overflow-x-auto no-scrollbar">
                            {['overview', 'patients', 'financials', 'communication', 'orders', 'portal'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'overview' && (
                                <div className="space-y-4">
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Client Details</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><p className="text-slate-500">Address</p><p className="font-medium text-slate-800">{selectedClient.address}</p></div>
                                            <div><p className="text-slate-500">Balance</p><p className={`font-medium ${selectedClient.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(selectedClient.balance, currency)}</p></div>
                                            <div className="col-span-2"><p className="text-slate-500">Notes</p><p className="font-medium text-slate-800">{selectedClient.notes || 'No notes available.'}</p></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'patients' && (
                                <div className="space-y-4">
                                    <div className="flex justify-end">
                                        <button onClick={() => setShowAddPatientModal(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm text-sm font-bold">
                                            <Plus className="w-4 h-4" /> Add Patient
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {state.patients.filter(p => p.ownerId === selectedClient.id).map(p => (
                                            <div key={p.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center gap-4">
                                                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">{p.name?.[0] || '?'}</div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{p.name}</h4>
                                                    <p className="text-sm text-slate-500">{p.species} • {p.breed}</p>
                                                    {p.chipNumber && <p className="text-xs text-slate-400 mt-1">Chip: {p.chipNumber}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'financials' && (
                                <div className="space-y-4">
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Transaction History</h3>
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    <th className="pb-2">Date</th>
                                                    <th className="pb-2">Type</th>
                                                    <th className="pb-2">Details</th>
                                                    <th className="pb-2 text-right">Amount</th>
                                                    <th className="pb-2 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {financials.map(item => (
                                                    <tr key={item.id} className="hover:bg-slate-50">
                                                        <td className="py-2 text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                                                        <td className="py-2"><span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded">{item.type}</span></td>
                                                        <td className="py-2 text-slate-600">{item.details}</td>
                                                        <td className="py-2 text-right font-bold text-slate-700">{formatCurrency(item.amount, currency)}</td>
                                                        <td className="py-2 text-center">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.status === 'PAID' || item.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {financials.length === 0 && (
                                                    <tr><td colSpan={5} className="py-8 text-center text-slate-400">No financial records found.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'communication' && (
                                <div className="flex flex-col h-[600px] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center font-black">
                                                {selectedClient?.name?.[0] || '?'}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 text-sm">{selectedClient?.name}</h4>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Portal Active</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowBroadcastModal(true)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all text-[10px] font-black uppercase tracking-widest"
                                            >
                                                <Bell className="w-3.5 h-3.5" /> Broadcast
                                            </button>
                                            <button onClick={() => setSelectedClient(null)} className="p-2 text-slate-400 hover:text-slate-600 lg:hidden"><ArrowLeft /></button>
                                        </div>
                                    </div>
                                    <div
                                        className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC]"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4zm40 40c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4zM24 80c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm60-30c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z' fill='%23000' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E")` }}
                                    >
                                        {(() => {
                                            const sessions: Record<string, ChatMessage[]> = {};
                                            clientChats.forEach(msg => {
                                                const sId = msg.sessionId || 'legacy';
                                                if (!sessions[sId]) sessions[sId] = [];
                                                sessions[sId].push(msg);
                                            });

                                            return Object.entries(sessions).map(([sessionId, messages]) => {
                                                const groups = groupByDate(messages);
                                                return (
                                                    <div key={sessionId} className="space-y-8 mb-12">
                                                        {/* Session Header */}
                                                        <div className="flex flex-col items-center">
                                                            <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-full shadow-lg">
                                                                <MessageSquare className="w-3.5 h-3.5" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">
                                                                    {sessionId === 'legacy' ? 'Historic Records' : `Chat Session #${sessionId.slice(-6)}`}
                                                                </span>
                                                            </div>
                                                            {messages[0] && (
                                                                <span className="text-[9px] font-bold text-slate-400 mt-2 uppercase">
                                                                    {new Date(messages[0].timestamp).toLocaleDateString()} {new Date(messages[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {Object.entries(groups).map(([date, msgs]) => (
                                                            <div key={date} className="space-y-6">
                                                                <div className="flex justify-center my-4">
                                                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-200">{date}</span>
                                                                </div>
                                                                {msgs.map((msg: ChatMessage) => (
                                                                    <div key={msg.id} className={`flex ${msg.sender === 'CLINIC' ? 'justify-end' : 'justify-start'} mb-1`}>
                                                                        <div className={`max-w-[75%] space-y-1`}>
                                                                            <div className={`p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.sender === 'CLINIC' ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                                                                                {msg.content.startsWith('MULTIMEDIA|') ? (
                                                                                    <div className="space-y-2">
                                                                                        {(() => {
                                                                                            const parts = msg.content.split('|');
                                                                                            const name = parts[1];
                                                                                            const mime = parts[2];
                                                                                            const base64 = parts.slice(3).join('|');
                                                                                            if (mime.startsWith('image/')) return <img src={base64} alt={name} className="max-w-full rounded-lg shadow-sm cursor-zoom-in" onClick={() => window.open(base64, '_blank')} />;
                                                                                            if (mime.startsWith('video/')) return <video src={base64} controls className="max-w-full rounded-lg" />;
                                                                                            return (
                                                                                                <a href={base64} download={name} className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 group">
                                                                                                    <div className="p-2 bg-teal-100 text-teal-600 rounded-lg group-hover:scale-110 transition-transform">
                                                                                                        <FileText className="w-5 h-5" />
                                                                                                    </div>
                                                                                                    <div className="overflow-hidden">
                                                                                                        <p className="font-bold text-xs truncate text-slate-700">{name}</p>
                                                                                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Download File</p>
                                                                                                    </div>
                                                                                                </a>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                ) : (
                                                                                    <p>{msg.content}</p>
                                                                                )}
                                                                                {msg.tags && msg.tags.length > 0 && (
                                                                                    <div className="flex flex-wrap gap-1 mt-3">
                                                                                        {msg.tags.map(tag => (
                                                                                            <span key={tag} className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${msg.sender === 'CLINIC' ? 'bg-black/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                                                                #{tag}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className={`flex items-center gap-2 px-1 ${msg.sender === 'CLINIC' ? 'justify-end' : 'justify-start'}`}>
                                                                                <span className="text-[9px] font-bold text-slate-400">
                                                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                </span>
                                                                                {msg.sender === 'CLINIC' && (
                                                                                    <div className="flex items-center gap-1">
                                                                                        {msg.isRead ? (
                                                                                            <div className="flex -space-x-1.5">
                                                                                                <Check className="w-3.5 h-3.5 text-teal-500" />
                                                                                                <Check className="w-3.5 h-3.5 text-teal-500" />
                                                                                            </div>
                                                                                        ) : (
                                                                                            <Check className="w-3.5 h-3.5 text-slate-300" />
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            });
                                        })()}
                                        {clientChats.length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center py-20 opacity-30">
                                                <MessageSquare className="w-16 h-16 mb-4" />
                                                <p className="font-black uppercase tracking-widest text-xs">Start the conversation</p>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>
                                    <div className="p-4 border-t border-slate-100 flex gap-3 bg-white">
                                        <label className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all cursor-pointer">
                                            <Paperclip className="w-5 h-5" />
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file && selectedClient) {
                                                        const maxSize = 10 * 1024 * 1024;
                                                        if (file.size > maxSize) { alert('File size must be less than 10MB'); e.target.value = ''; return; }
                                                        const reader = new FileReader();
                                                        reader.onload = (ev) => {
                                                            const base64 = ev.target?.result as string;
                                                            const lastMsg = clientChats[clientChats.length - 1];
                                                            const msg: ChatMessage = {
                                                                id: `msg${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                                                clientId: selectedClient.id,
                                                                tenantId: state.currentTenantId,
                                                                sender: 'CLINIC',
                                                                senderName: state.currentUser?.name || 'Staff',
                                                                content: `MULTIMEDIA|${file.name}|${file.type}|${base64}`,
                                                                timestamp: new Date().toISOString(),
                                                                sessionId: lastMsg?.sessionId
                                                            };
                                                            dispatch({ type: 'SEND_CHAT', payload: msg });
                                                            e.target.value = '';
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                        <input
                                            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                                            placeholder="Write your message..."
                                            value={chatMessage}
                                            onChange={e => setChatMessage(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                        />
                                        <button
                                            onClick={handleSendChat}
                                            disabled={!chatMessage.trim()}
                                            className="px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'orders' && (
                                <div className="space-y-4">
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Client Orders</h3>
                                        <div className="space-y-4">
                                            {state.orders.filter(o => o.clientId === selectedClient.id).length > 0 ? (
                                                state.orders.filter(o => o.clientId === selectedClient.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(order => (
                                                    <div key={order.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all flex justify-between items-center group">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-black text-slate-800">#{order.id.slice(-6).toUpperCase()}</span>
                                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-600' :
                                                                    order.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                                                                        order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-600' :
                                                                            'bg-amber-100 text-amber-600'
                                                                    }`}>{order.status}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-500">{new Date(order.date).toLocaleDateString()} • {order.items.length} items</p>
                                                        </div>
                                                        <div className="text-right flex items-center gap-4">
                                                            <div className="hidden group-hover:flex gap-2 animate-in fade-in slide-in-from-right-2">
                                                                <select
                                                                    className="text-[10px] font-bold bg-white border border-slate-200 rounded-md p-1"
                                                                    value={order.status}
                                                                    onChange={(e) => dispatch({ type: 'UPDATE_ORDER', payload: { ...order, status: e.target.value } })}
                                                                >
                                                                    <option value="PENDING">Pending</option>
                                                                    <option value="CONFIRMED">Confirmed</option>
                                                                    <option value="SHIPPED">Shipped</option>
                                                                    <option value="DELIVERED">Delivered</option>
                                                                    <option value="CANCELLED">Cancelled</option>
                                                                </select>
                                                            </div>
                                                            <span className="font-black text-slate-900">{formatCurrency(order.total, currency)}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-12 opacity-30">
                                                    <Package className="w-12 h-12 mx-auto mb-3" />
                                                    <p className="text-xs font-black uppercase tracking-widest">No orders found</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'portal' && (
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                                            <Key className="w-4 h-4" /> Client Portal Access
                                        </h3>

                                        {portalUser ? (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-700">
                                                        <UserIcon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-green-800">Account Active</p>
                                                        <p className="text-sm text-green-700">Username: <strong>{portalUser.email}</strong></p>
                                                    </div>
                                                </div>

                                                <div className="p-4 border border-slate-200 rounded-lg">
                                                    <h4 className="font-bold text-slate-700 mb-2 text-sm">Set New Password</h4>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            className="flex-1 p-2 border border-slate-200 rounded-lg text-sm"
                                                            placeholder="Enter new password"
                                                            value={newPortalPassword}
                                                            onChange={e => setNewPortalPassword(e.target.value)}
                                                        />
                                                        <button
                                                            onClick={handleUpdatePortalPassword}
                                                            disabled={!newPortalPassword}
                                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                                        >
                                                            <Save className="w-4 h-4" /> Update
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-2">Enter a password above to reset client credentials. Communicate this password securely to the client.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <p className="text-slate-500 mb-4">Client does not have portal access yet.</p>
                                                <button
                                                    onClick={() => createPortalUser(selectedClient)}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold flex items-center gap-2 mx-auto"
                                                >
                                                    <Key className="w-4 h-4" /> Create Account
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/30">
                        <UserIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Select a client to manage</p>
                    </div>
                )}
            </div>

            {showAddPatientModal && selectedClient && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 bg-teal-600 flex justify-between items-center text-white">
                            <div className="flex items-center gap-2">
                                <PawPrint className="w-5 h-5" />
                                <h3 className="font-bold">Register New Patient</h3>
                            </div>
                            <button onClick={() => setShowAddPatientModal(false)} className="hover:bg-teal-500 p-1 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Patient Name</label>
                                <input
                                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors"
                                    placeholder="e.g. Buddy"
                                    value={patientForm.name || ''}
                                    onChange={e => setPatientForm({ ...patientForm, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Species</label>
                                    <input
                                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors"
                                        placeholder="e.g. Canine"
                                        value={patientForm.species || ''}
                                        onChange={e => setPatientForm({ ...patientForm, species: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Breed</label>
                                    <input
                                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors"
                                        placeholder="e.g. Golden Retriever"
                                        value={patientForm.breed || ''}
                                        onChange={e => setPatientForm({ ...patientForm, breed: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Sex</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50"
                                        value={patientForm.sex || ''}
                                        onChange={e => setPatientForm({ ...patientForm, sex: e.target.value })}
                                    >
                                        <option value="">Select Sex</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Neutered Male">Neutered Male</option>
                                        <option value="Spayed Female">Spayed Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Age (Years)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors"
                                        value={patientForm.age || ''}
                                        onChange={e => setPatientForm({ ...patientForm, age: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Microchip Number (Optional)</label>
                                <input
                                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors"
                                    value={patientForm.chipNumber || ''}
                                    onChange={e => setPatientForm({ ...patientForm, chipNumber: e.target.value })}
                                />
                            </div>
                            <button
                                onClick={handleSavePatient}
                                className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all active:scale-[0.98] mt-2"
                            >
                                Register Patient
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBroadcastModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800">Broadcast Message</h3>
                            <button onClick={() => setShowBroadcastModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <p className="text-xs font-medium text-slate-500 mb-4 leading-relaxed">This message will be sent individualy to all clients who have portal access enabled.</p>
                        <textarea
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-32 resize-none"
                            placeholder="Type your announcement..."
                            value={broadcastMsg}
                            onChange={e => setBroadcastMsg(e.target.value)}
                        ></textarea>
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setShowBroadcastModal(false)} className="flex-1 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest">Cancel</button>
                            <button onClick={handleBroadcast} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Send Broadcast</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientManager;
