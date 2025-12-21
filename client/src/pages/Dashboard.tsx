import React from 'react';
import { AppState } from '../types';
import { formatCurrency } from '../services/storage';
import {
    Calendar, Package, TrendingUp, Users, Heart,
    ShoppingCart, TestTube, ChevronRight, Stethoscope,
    Search, Bell, Download, History, Settings, MessageSquare
} from 'lucide-react';

interface Props {
    state: AppState;
    onNavigate: (view: string) => void;
    onToggleNotifications?: () => void;
    onNavigateToClient?: (clientId: string) => void;
}

export const Dashboard: React.FC<Props> = ({ state, onNavigate, onToggleNotifications, onNavigateToClient }) => {
    const currentTenant = state.tenants.find(t => t.id === (state.currentTenantId || state.currentUser?.tenantId));
    const currency = currentTenant?.currency || 'NGN';

    const today = new Date().toDateString();

    // Metrics
    const todayAppts = state.appointments.filter(a =>
        a.tenantId === state.currentTenantId &&
        (a.branchId === state.currentBranchId || !a.branchId) &&
        new Date(a.date).toDateString() === today
    );

    const totalPatients = state.patients.filter(p => p.tenantId === state.currentTenantId && p.branchId === state.currentBranchId).length;
    const totalClients = state.clients.filter(c => c.tenantId === state.currentTenantId && c.branchId === state.currentBranchId).length;

    const dailyInvoices = state.invoices.filter(i =>
        i.tenantId === state.currentTenantId &&
        i.branchId === state.currentBranchId &&
        new Date(i.date).toDateString() === today &&
        i.status === 'PAID'
    );

    const dailySales = state.sales.filter(s =>
        s.tenantId === state.currentTenantId &&
        s.branchId === state.currentBranchId &&
        new Date(s.date).toDateString() === today
    );

    const dailyRevenue = dailyInvoices.reduce((sum, i) => sum + i.total, 0) + dailySales.reduce((sum, s) => sum + s.total, 0);

    // 2. Invoices paid today (including sales)
    const invoicesPaidToday = dailyInvoices.length + dailySales.length;

    // 3. Pending Appointments
    const pendingAppointments = state.appointments.filter(a =>
        a.tenantId === state.currentTenantId &&
        (a.branchId === state.currentBranchId || !a.branchId) &&
        a.status === 'Pending'
    ).length;

    // 4. Portal Active Clients
    const portalActiveClients = state.clients.filter(c =>
        c.tenantId === state.currentTenantId &&
        (c.branchId === state.currentBranchId || !c.branchId) &&
        c.portalEnabled
    ).length;

    // Quick Access Items
    const quickAccessItems = [
        { icon: Stethoscope, label: 'Patients', color: 'text-pink-500', bg: 'bg-pink-50', view: 'patients' },
        { icon: Users, label: 'Clients', color: 'text-teal-600', bg: 'bg-teal-50', view: 'clients' },
        { icon: Calendar, label: 'Schedule', color: 'text-indigo-500', bg: 'bg-indigo-50', view: 'schedule' },
        { icon: ShoppingCart, label: 'POS', color: 'text-orange-500', bg: 'bg-orange-50', view: 'pos' },
        { icon: History, label: 'History', color: 'text-blue-600', bg: 'bg-blue-50', view: 'sales-history' },
        { icon: Package, label: 'Stock', color: 'text-purple-500', bg: 'bg-purple-50', view: 'inventory' },
        { icon: TestTube, label: 'Labs', color: 'text-emerald-500', bg: 'bg-emerald-50', view: 'labs' },
        { icon: Download, label: 'Reports', color: 'text-amber-500', bg: 'bg-amber-50', view: 'reports' },
        { icon: Settings, label: 'Settings', color: 'text-slate-500', bg: 'bg-slate-50', view: 'settings' },
    ];

    // Calculate new patients this month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const newPatientsThisMonth = state.patients.filter(p => {
        // Extract timestamp from ID (format: p1234567890_xxxxx)
        const timestampMatch = p.id.match(/p(\d+)/);
        if (!timestampMatch) return false;
        const patientDate = new Date(parseInt(timestampMatch[1]));
        return p.tenantId === state.currentTenantId &&
            p.branchId === state.currentBranchId &&
            patientDate.getMonth() === currentMonth &&
            patientDate.getFullYear() === currentYear;
    }).length;

    // Status Cards Configuration - Weather/Scenic Style (Refined Size)
    const statsCards = [
        {
            title: "Total Patients",
            value: totalPatients.toString(),
            label: `+${newPatientsThisMonth} New this Month`,
            icon: Users,
            gradient: "from-amber-400 to-orange-500", // Orange/Sun
            type: "sunny",
            metric: "34°"
        },
        {
            title: "Today's Revenue",
            value: formatCurrency(dailyRevenue, currency),
            label: `${invoicesPaidToday} Invoices Paid`,
            icon: TrendingUp,
            gradient: "from-lime-400 to-emerald-500", // Green/Nature
            type: "nature",
            metric: "26°"
        },
        {
            title: "Appointments",
            value: todayAppts.length.toString(),
            label: `${pendingAppointments} Pending Actions`,
            icon: Calendar,
            gradient: "from-fuchsia-500 to-violet-600", // Purple/Evening
            type: "evening",
            metric: "12°"
        },
        {
            title: "Active Clients",
            value: totalClients.toString(),
            label: `${portalActiveClients} Portal Users`,
            icon: Heart,
            gradient: "from-sky-500 to-blue-700", // Blue/Night
            type: "night",
            metric: "-7°"
        }
    ];

    const [activeTab, setActiveTab] = React.useState<'patients' | 'appointments' | 'messages'>('patients');

    // Smart Message Grouping
    const groupedMessages = React.useMemo(() => {
        const clientLatest: Record<string, { msg: any, count: number }> = {};

        // Only look at messages for this tenant/branch context
        state.chats
            .filter(c => c.tenantId === state.currentTenantId)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .forEach(m => {
                if (!clientLatest[m.clientId]) {
                    clientLatest[m.clientId] = { msg: m, count: 0 };
                } else {
                    clientLatest[m.clientId].msg = m;
                }
                if (m.sender === 'CLIENT' && !m.isRead) {
                    clientLatest[m.clientId].count++;
                }
            });

        return Object.values(clientLatest)
            .sort((a, b) => new Date(b.msg.timestamp).getTime() - new Date(a.msg.timestamp).getTime());
    }, [state.chats, state.currentTenantId]);

    return (
        <div className="min-h-screen bg-[#FDFEFE] font-sans relative overflow-hidden flex flex-col">
            {/* Premium Gold Blending Background - Multi-layered glow */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-200/15 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-200/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-orange-100/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full gold-blend-glow opacity-30 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto w-full space-y-8 p-4 sm:p-6 lg:p-10 relative z-10 flex-1">
                <div className="bg-white/60 backdrop-blur-3xl rounded-[3.5rem] p-8 lg:p-14 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-white/40 space-y-12">

                    {/* Header (Updated Format) */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-amber-800 to-slate-900 bg-clip-text text-transparent tracking-tight">{currentTenant?.name || 'Clinic'} Dashboard</h1>
                            <p className="text-slate-500 text-sm font-medium">Welcome back, {state.currentUser?.title || ''} {state.currentUser?.name}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex items-center bg-white rounded-xl px-3 py-2 shadow-sm border border-slate-200">
                                <Search className="w-4 h-4 text-slate-400 mr-2" />
                                <input placeholder="Search..." className="bg-transparent border-none outline-none text-sm text-slate-600 w-48" />
                            </div>
                            <button
                                onClick={onToggleNotifications}
                                className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors relative"
                            >
                                <Bell className="w-5 h-5" />
                                {state.notifications.some(n => !n.isRead) && (
                                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Top Cards - "Weather Widget" Style - Compact */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {statsCards.map((card, idx) => (
                            <div key={idx} className={`relative overflow-hidden rounded-[24px] h-[110px] p-4 text-white shadow-lg bg-gradient-to-br ${card.gradient} group hover:-translate-y-1 transition-transform duration-300`}>

                                {/* Decorative Background Elements based on Type */}
                                {card.type === 'sunny' && (
                                    <>
                                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-yellow-300 rounded-full blur-xl opacity-80"></div>
                                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-yellow-200 rounded-full blur-md opacity-90"></div>
                                    </>
                                )}
                                {card.type === 'nature' && (
                                    <>
                                        <div className="absolute right-0 bottom-0 w-24 h-16 bg-emerald-700/20 rounded-tl-full blur-md"></div>
                                        <div className="absolute left-10 bottom-0 w-16 h-12 bg-lime-300/20 rounded-tr-full blur-sm"></div>
                                        <div className="absolute right-8 bottom-4 w-3 h-8 bg-emerald-800/30"></div>
                                        <div className="absolute right-5 bottom-8 w-10 h-10 rounded-full bg-emerald-300/40 blur-sm"></div>
                                    </>
                                )}
                                {card.type === 'evening' && (
                                    <>
                                        <div className="absolute right-6 top-3 w-12 h-12 bg-amber-200 rounded-full blur-xl opacity-90"></div>
                                        <div className="absolute right-10 top-8 w-16 h-6 bg-white/30 rounded-full blur-md"></div>
                                        <div className="absolute left-20 top-4 w-12 h-4 bg-white/20 rounded-full blur-md"></div>
                                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-purple-900/20 clip-path-polygon"></div>
                                    </>
                                )}
                                {card.type === 'night' && (
                                    <>
                                        <div className="absolute right-6 top-4 w-8 h-8 rounded-full bg-slate-200 blur-sm shadow-[0_0_15px_rgba(255,255,255,0.8)]"></div>
                                        <div className="absolute top-8 left-12 w-1 h-1 bg-white rounded-full opacity-80"></div>
                                        <div className="absolute top-4 right-20 w-1.5 h-1.5 bg-white rounded-full opacity-60"></div>
                                        <div className="absolute bottom-6 left-8 w-1 h-1 bg-white rounded-full opacity-70"></div>
                                        <div className="absolute bottom-[-10px] right-[-10px] w-20 h-20 bg-blue-900/30 rotate-45 transform"></div>
                                    </>
                                )}

                                {/* Content */}
                                <div className="relative z-10 flex flex-col justify-between h-full">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-3xl font-light tracking-tight">{card.value}</h3>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-0.5">{card.title}</p>
                                        </div>
                                        <p className="text-xs font-medium opacity-90">{card.label}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Access Grid - Premium Soft UI / Neumorphism */}
                    <div className="bg-gradient-to-br from-purple-50/50 via-white to-blue-50/30 p-8 rounded-[32px] border border-white/60 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/30 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <h2 className="text-lg font-black text-slate-700 mb-6 px-1 tracking-tight relative z-10">Quick Actions</h2>
                        <div className="grid grid-cols-3 sm:grid-cols-9 gap-4 sm:gap-5 justify-items-center relative z-10">
                            {quickAccessItems.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onNavigate(item.view)}
                                    className="flex flex-col items-center gap-3 group w-full"
                                >
                                    {/* Soft UI Button Container */}
                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 flex items-center justify-center shadow-[-8px_-8px_16px_#ffffff,_8px_8px_16px_#cbd5e1] hover:shadow-[-6px_-6px_12px_#ffffff,_6px_6px_12px_#cbd5e1] active:shadow-[inset_4px_4px_8px_#cbd5e1,inset_-4px_-4px_8px_#ffffff] transition-all duration-300 transform group-hover:-translate-y-1">

                                        {/* Inner Surface - Gradient for slight convexity */}
                                        <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-[#ffffff] to-[#f1f5f9]"></div>

                                        {/* Icon */}
                                        <div className="relative z-10 flex items-center justify-center">
                                            <item.icon className={`w-7 h-7 sm:w-8 sm:h-8 ${item.color} drop-shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`} />
                                        </div>
                                    </div>

                                    <span className="text-[11px] font-bold text-slate-500 tracking-wide group-hover:text-indigo-600 transition-colors">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lower Content: Tabbed Records Section */}
                    <div className="bg-gradient-to-br from-blue-50/40 via-white to-cyan-50/30 rounded-[3.5rem] p-8 border border-white/60 shadow-sm overflow-hidden relative">
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-100/20 rounded-full blur-3xl -mb-32 -mr-32"></div>

                        {/* Tab Navigation */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 relative z-10">
                            <div className="flex p-1 bg-slate-100/50 backdrop-blur-md rounded-2xl border border-slate-200/50">
                                {[
                                    { id: 'patients', label: 'Recent Patients' },
                                    { id: 'appointments', label: 'Schedule' },
                                    { id: 'messages', label: 'Messages' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                                            ? 'bg-white text-slate-800 shadow-md ring-1 ring-slate-200'
                                            : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {tab.label}
                                        {tab.id === 'messages' && groupedMessages.some(g => g.count > 0) && (
                                            <span className="ml-2 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] rounded-full animate-pulse">
                                                {groupedMessages.reduce((a, b) => a + b.count, 0)}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => onNavigate(activeTab)} className="text-xs font-bold text-indigo-600 hover:bg-white/60 px-4 py-2 rounded-xl transition-all border border-slate-200/50 backdrop-blur-sm shadow-sm bg-white/30">
                                View all {activeTab}
                            </button>
                        </div>

                        {/* List Content */}
                        <div className="relative z-10 min-h-[400px]">
                            {activeTab === 'patients' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {state.patients.filter(p => p.tenantId === state.currentTenantId && (p.branchId === state.currentBranchId || !p.branchId)).slice(0, 10).map((patient, idx) => (
                                        <div key={idx} className="flex items-center gap-5 p-4 rounded-3xl bg-white/50 border border-white hover:bg-white hover:shadow-xl hover:shadow-slate-200/20 transition-all duration-300 group cursor-pointer">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg ring-1 ring-slate-100 shadow-sm group-hover:scale-110 transition-transform">
                                                {patient.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-base font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{patient.name}</h4>
                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{patient.species} • {patient.breed || 'Unknown'}</p>
                                            </div>
                                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${patient.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                                                {patient.status}
                                            </div>
                                        </div>
                                    ))}
                                    {state.patients.length === 0 && (
                                        <div className="col-span-2 text-center py-20 bg-white/40 rounded-3xl border border-dashed border-slate-200">
                                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
                                            <p className="text-sm font-bold text-slate-400">No patients registered yet</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'appointments' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {state.appointments
                                        .filter(a => a.tenantId === state.currentTenantId && (a.branchId === state.currentBranchId || !a.branchId))
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .slice(0, 10)
                                        .map((appt, idx) => (
                                            <div key={idx} className="flex items-center gap-5 p-4 rounded-3xl bg-white/50 border border-white hover:bg-white hover:shadow-xl hover:shadow-slate-200/20 transition-all duration-300 group cursor-pointer">
                                                <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform ${appt.status === 'Scheduled' ? 'bg-gradient-to-br from-emerald-400 to-teal-500' :
                                                    appt.status === 'Pending' ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                                                    }`}>
                                                    <span className="text-xs font-bold opacity-80 uppercase">{new Date(appt.date).toLocaleString('default', { month: 'short' })}</span>
                                                    <span className="text-xl font-black">{new Date(appt.date).getDate()}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-base font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{appt.patientName}</h4>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{new Date(appt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {appt.visitType}</p>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        ))}
                                    {state.appointments.length === 0 && (
                                        <div className="col-span-2 text-center py-20 bg-white/40 rounded-3xl border border-dashed border-slate-200">
                                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
                                            <p className="text-sm font-bold text-slate-400">No appointments scheduled</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'messages' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {groupedMessages.slice(0, 10).map((g, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-5 p-4 rounded-3xl bg-white/50 border border-white hover:bg-white hover:shadow-xl hover:shadow-slate-200/20 transition-all duration-300 group cursor-pointer"
                                            onClick={() => onNavigateToClient?.(g.msg.clientId)}
                                        >
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-50 to-rose-50 flex items-center justify-center text-rose-600 font-black text-lg ring-1 ring-slate-100 shadow-sm group-hover:scale-110 transition-transform relative">
                                                {g.msg.senderName.charAt(0)}
                                                {g.count > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold shadow-md ring-2 ring-white">
                                                        {g.count}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <h4 className="text-base font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{g.msg.senderName}</h4>
                                                    <span className="text-[10px] font-bold text-slate-400">{new Date(g.msg.timestamp).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 font-medium truncate italic">
                                                    {g.msg.content.startsWith('MULTIMEDIA|') ? 'Sent an attachment' : g.msg.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {groupedMessages.length === 0 && (
                                        <div className="col-span-2 text-center py-20 bg-white/40 rounded-3xl border border-dashed border-slate-200">
                                            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
                                            <p className="text-sm font-bold text-slate-400">No messages yet</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
