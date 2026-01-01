
import React, { useState, useEffect } from 'react';
import { AppState, User, ChatMessage, Appointment, Patient, Invoice, InvoiceStatus, Service, Order, OrderItem, InventoryItem, Sale } from '../types';
import { DocumentTemplate } from '../components/DocumentTemplate';
import {
    LogOut, PawPrint, MessageSquare, CreditCard, Send,
    Paperclip, ClipboardList, Search, Settings, Lock,
    Save, Calendar, Plus, X, Activity, FileText, ChevronRight,
    Stethoscope, Clock, CheckCircle2, AlertCircle, Bell, Check, MapPin, ShieldAlert, ShoppingBag, ArrowLeft, Package, Mic, Printer, Truck
} from 'lucide-react';
import { backend } from '../services/api';
import { formatCurrency } from '../services/storage';

interface Props {
    state: AppState;
    user: User;
    onLogout: () => void;
    onSendMessage: (content: string) => void;
    dispatch: (action: any) => void;
}

export const ClientPortal: React.FC<Props> = ({ state, user, onLogout, onSendMessage, dispatch }) => {
    const [view, setView] = useState<'dashboard' | 'chat' | 'finance' | 'services' | 'settings' | 'records' | 'shop' | 'checkout'>('dashboard');
    const [msgText, setMsgText] = useState('');
    const [serviceSearch, setServiceSearch] = useState('');
    const [shopSearch, setShopSearch] = useState('');
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [checkoutStep, setCheckoutStep] = useState<'address' | 'delivery' | 'payment' | 'confirm'>('address');
    const [address, setAddress] = useState({ name: user.name, phone: '', street: '', city: '' });
    const [deliveryOption, setDeliveryOption] = useState<'pickup' | 'delivery'>('pickup');
    const [distanceKm, setDistanceKm] = useState(5);

    // Appointment Request State
    const [reqDate, setReqDate] = useState('');
    const [reqReason, setReqReason] = useState('Consultation');
    const [reqPatient, setReqPatient] = useState('');

    const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [printRecord, setPrintRecord] = useState<Sale | Invoice | null>(null);

    const client = state.clients.find(c => c.id === user.clientId);
    const myPatients = state.patients.filter(p => p.ownerId === client?.id);
    const myInvoices = state.invoices.filter(i => i.clientId === client?.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const myChat = state.chats.filter(c => c.clientId === client?.id).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Filter active/pending appointments
    const myAppointments = state.appointments
        .filter(a => a.clientId === client?.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const myConsultations = state.consultations
        .filter(c => myPatients.some(p => p.id === c.patientId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const publicServices = state.services
        .filter(s => s.tenantId === state.currentTenantId && s.visibleToClient && s.isActive)
        .filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()) || s.category.toLowerCase().includes(serviceSearch.toLowerCase()))
        .sort((a, b) => a.category.localeCompare(b.category));

    const shopItems = state.inventory
        .filter(i => i.tenantId === (user.tenantId || state.currentTenantId) && i.visibleToClient)
        .filter(i => {
            const search = shopSearch.toLowerCase();
            return (i.name?.toLowerCase().includes(search) || i.category?.toLowerCase().includes(search));
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    const spotlightItems = state.inventory
        .filter(i => i.tenantId === (user.tenantId || state.currentTenantId) && i.visibleToClient)
        .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
        .slice(0, 6);

    const addToCart = (item: InventoryItem) => {
        setCart(prev => {
            const existing = prev.find(c => c.itemId === item.id);
            if (existing) {
                return prev.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * (item.clientPrice || 0) } : c);
            }
            return [...prev, {
                itemId: item.id,
                itemName: item.name,
                quantity: 1,
                price: item.clientPrice || 0,
                total: item.clientPrice || 0
            }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(c => c.itemId !== itemId));
    };

    const updateCartQty = (itemId: string, qty: number) => {
        if (qty <= 0) return removeFromCart(itemId);
        setCart(prev => prev.map(c => c.itemId === itemId ? { ...c, quantity: qty, total: qty * c.price } : c));
    };

    const cartTotal = cart.reduce((acc, c) => acc + c.total, 0);

    const currentTenant = state.tenants.find(t => t.id === (user.tenantId || state.currentTenantId));
    const currency = currentTenant?.currency || 'NGN';
    const clinicName = currentTenant?.name || 'Veterinary Clinic';

    const deliveryConfig = currentTenant?.deliveryConfig;
    let deliveryFee = 0;
    if (deliveryOption === 'delivery' && deliveryConfig?.active) {
        if (deliveryConfig.freeDeliveryThreshold && cartTotal >= deliveryConfig.freeDeliveryThreshold) {
            deliveryFee = 0;
        } else {
            deliveryFee = (deliveryConfig.baseFee || 0) + (distanceKm * (deliveryConfig.amountPerKm || 0));
        }
    }

    const grandTotal = cartTotal + deliveryFee;

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) return alert("Geolocation not supported");
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            const branch = state.branches.find(b => b.id === (client?.branchId || state.currentBranchId));
            if (branch?.latitude && branch?.longitude) {
                const dist = calculateDistance(latitude, longitude, branch.latitude, branch.longitude);
                setDistanceKm(Math.round(dist * 10) / 10 || 1);
                alert(`Location tagged! Distance to clinic: ${Math.round(dist * 10) / 10} KM`);
            } else {
                alert("Clinic coordinates not set. Using default 5KM.");
                setDistanceKm(5);
            }
        }, () => alert("Permission denied or location unavailable"));
    };

    const handlePlaceOrder = () => {
        const order: Order = {
            id: `ord_${Date.now()}`,
            clientId: client!.id,
            clientName: client!.name,
            items: cart,
            total: grandTotal,
            deliveryFee: deliveryFee,
            status: 'PENDING',
            date: new Date().toISOString(),
            tenantId: state.currentTenantId,
            branchId: state.currentBranchId,
            shippingAddress: deliveryOption === 'delivery' ? `${address.street}, ${address.city}` : 'Store Pickup',
            phoneNumber: address.phone,
            paymentMethod: 'Cash on Delivery'
        };
        dispatch({ type: 'PLACE_ORDER', payload: order });
        setCart([]);
        setView('dashboard');
        alert("Order placed successfully! We will contact you shortly.");
    };

    useEffect(() => {
        if (client && view === 'chat') {
            const unread = state.chats.filter(c => c.clientId === client.id && c.sender === 'CLINIC' && !c.isRead);
            unread.forEach(m => {
                dispatch({ type: 'UPDATE_CHAT', payload: { ...m, isRead: true, readAt: new Date().toISOString() } });
            });
        }
    }, [client, view, state.chats, dispatch]);

    if (!client) return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-slate-600 font-medium">Error loading client profile.</p>
            <button onClick={onLogout} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg">Go Back</button>
        </div>
    );

    const handleSend = () => {
        if (!msgText.trim()) return;
        onSendMessage(msgText);
        setMsgText('');
    };

    const handleRequestAppointment = async () => {
        if (!reqDate || !reqPatient) {
            alert("Please select a date and a pet.");
            return;
        }

        const patient = myPatients.find(p => p.id === reqPatient);

        const newApt: Appointment = {
            id: `req_${Date.now()}`,
            clientId: client?.id || '',
            clientName: client?.name || user.name,
            patientId: patient?.id || '',
            patientName: patient?.name || 'Unknown',
            date: new Date(reqDate).toISOString(),
            visitType: reqReason,
            assignedStaffId: '',
            assignedStaffName: 'Pending Approval',
            status: 'Pending' as any,
            reminderChannels: ['Email', 'App Chat'],
            tenantId: user.tenantId,
            branchId: user.branchId || client?.branchId || ''
        };

        try {
            dispatch({ type: 'ADD_APPOINTMENT', payload: newApt });
            alert("Appointment request sent successfully! Waiting for clinic approval.");
            setShowRequestForm(false);
            setReqDate('');
        } catch (e) {
            alert("Failed to send request. Please try again or use chat.");
        }
    };

    const handleChangePassword = () => {
        if (!passData.new || !passData.confirm) {
            alert("All fields are required.");
            return;
        }
        if (passData.new !== passData.confirm) {
            alert("New passwords do not match.");
            return;
        }
        if (passData.new.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        const updatedUser = { ...user, password: passData.new };
        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        alert("Password updated successfully!");
        setPassData({ current: '', new: '', confirm: '' });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-emerald-100 text-emerald-700';
            case 'DRAFT': return 'bg-slate-100 text-slate-600';
            case 'Scheduled': return 'bg-indigo-100 text-indigo-700';
            case 'Pending': return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const invTypeGuard = (record: Sale | Invoice): record is Sale => {
        return (record as Sale).paymentMethod !== undefined;
    };

    return (
        <div className="min-h-screen bg-[#F0F2F5] font-sans text-slate-900 overflow-hidden flex flex-col">
            {/* Gold Blending Border Glow - Subtle and Effortless */}
            <div className="fixed inset-0 pointer-events-none gold-blend-border gold-blend-glow opacity-30 z-50 rounded-none border-none"></div>
            {/* Premium Header - Zero Bezel Feel */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100/50 h-16 flex items-center justify-between px-4 lg:px-6 z-30 sticky top-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
                        <PawPrint className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="font-black text-base tracking-tight text-slate-900">{clinicName}</span>
                        <span className="text-[9px] block font-bold text-teal-600 uppercase tracking-widest -mt-0.5">Pet Owner Portal</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-400 relative transition-all active:scale-95 group">
                            <Bell className="w-5 h-5 group-hover:text-teal-500" />
                            {state.notifications.some(n => !n.isRead) && (
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                            )}
                        </button>
                        {isNotifOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                                        <button onClick={() => dispatch({ type: 'CLEAR_NOTIFICATIONS' })} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-rose-500">Clear All</button>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {state.notifications.length === 0 && <div className="p-8 text-center text-slate-400 text-xs font-medium">No new notifications</div>}
                                        {state.notifications.map(n => (
                                            <div
                                                key={n.id}
                                                onClick={() => {
                                                    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: n.id });
                                                    if (n.type === 'CHAT') setView('chat');
                                                    setIsNotifOpen(false);
                                                }}
                                                className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 ${!n.isRead ? 'bg-indigo-50/10' : ''}`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.type === 'CHAT' ? 'bg-teal-100 text-teal-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                    {n.type === 'CHAT' ? <MessageSquare className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[13px] font-bold text-slate-800">{n.title}</p>
                                                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{n.message}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                                {!n.isRead && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0"></div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="hidden md:block text-right">
                        <p className="text-xs font-bold text-slate-800">{client.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Verified Owner</p>
                    </div>
                    <button onClick={onLogout} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar removed - navigation now via dashboard cards */}

                {/* Dynamic Content Area with 3-Layer Background */}
                <main className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-10 animate-fade-in relative">
                    {/* Layer 1: Teal - Bottom Layer */}
                    <div className="fixed inset-0 bg-teal-50/40 -z-10"></div>

                    {/* Layer 2: Rose Gold - Middle Layer */}
                    <div className="fixed inset-0 bg-[#E8C4B8]/20 -z-10"></div>

                    {/* Layer 3: Lavender - Top Layer */}
                    <div className="fixed inset-0 bg-purple-50/30 -z-10"></div>

                    {/* Decorative Blur Circles for Depth */}
                    <div className="fixed top-20 right-20 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl -z-10"></div>
                    <div className="fixed bottom-20 left-20 w-96 h-96 bg-rose-200/20 rounded-full blur-3xl -z-10"></div>
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-100/15 rounded-full blur-3xl -z-10"></div>

                    {/* Back to Dashboard Button - Shows on all views except dashboard */}
                    {view !== 'dashboard' && (
                        <div className="mb-6">
                            <button
                                onClick={() => setView('dashboard')}
                                className="group flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-md hover:bg-white border-2 border-slate-200 hover:border-teal-300 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-600 group-hover:text-teal-600 transition-colors group-hover:-translate-x-1 transition-transform duration-300" />
                                <span className="font-black text-sm text-slate-700 group-hover:text-teal-700 uppercase tracking-wider">Back to Dashboard</span>
                            </button>
                        </div>
                    )}

                    {view === 'dashboard' && (
                        <div className="max-w-6xl mx-auto space-y-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                                <div>
                                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">Welcome, {client.name?.split(' ')[0] || 'Guest'}</h2>
                                    <p className="text-slate-500 font-bold text-lg mt-3">You have <span className="text-teal-600">{myPatients.length} pets</span> in our care family.</p>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => setShowRequestForm(true)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2.5 px-8 py-4.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
                                    >
                                        <Calendar className="w-4 h-4" /> Book Appointment
                                    </button>
                                </div>
                            </div>

                            {/* Navigation Cards Grid - 3D reference style */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-5 mb-10">
                                {/* Pets Card */}
                                <button
                                    onClick={() => setView('records')}
                                    className="group relative clay-card bg-clay-blue p-5 text-white flex items-center justify-between"
                                >
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="text-3xl font-black clay-text-3d">{myPatients.length}</span>
                                        <span className="font-bold text-[10px] uppercase tracking-wider opacity-80">My Pets</span>
                                    </div>
                                    <div className="absolute -top-4 -left-2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center rotate-[-12deg] clay-icon group-hover:rotate-0 transition-all duration-500 border border-white/30">
                                        <PawPrint className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="text-right flex flex-col">
                                        <span className="text-[9px] font-black uppercase opacity-60">Active</span>
                                        <ChevronRight className="w-4 h-4 ml-auto opacity-40 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </button>

                                {/* Schedule Card */}
                                <button
                                    onClick={() => setShowRequestForm(true)}
                                    className="group relative clay-card bg-clay-purple p-5 text-white flex items-center justify-between"
                                >
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="text-3xl font-black clay-text-3d">Book</span>
                                        <span className="font-bold text-[10px] uppercase tracking-wider opacity-80">Schedule</span>
                                    </div>
                                    <div className="absolute -top-4 -left-2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center rotate-[-12deg] clay-icon group-hover:rotate-0 transition-all duration-500 border border-white/30">
                                        <Calendar className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-black uppercase opacity-60">Visit</span>
                                        <ChevronRight className="w-4 h-4 ml-auto opacity-40 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </button>

                                {/* Chat Card */}
                                <button
                                    onClick={() => setView('chat')}
                                    className="group relative clay-card bg-clay-cyan p-5 text-white flex items-center justify-between shadow-[0_15px_30px_rgba(8,145,178,0.3)]"
                                >
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="text-3xl font-black clay-text-3d">{myChat.filter(c => !c.isRead && c.sender === 'CLINIC').length || 'Live'}</span>
                                        <span className="font-bold text-[10px] uppercase tracking-wider opacity-80">Chat</span>
                                    </div>
                                    <div className="absolute -top-4 -left-2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center rotate-[-12deg] clay-icon group-hover:rotate-0 transition-all duration-500 border border-white/30">
                                        <MessageSquare className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-black uppercase opacity-60">Clinic</span>
                                        <ChevronRight className="w-4 h-4 ml-auto opacity-40 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </button>

                                {/* Records Card */}
                                <button
                                    onClick={() => setView('records')}
                                    className="group relative clay-card bg-clay-yellow p-5 text-white flex items-center justify-between shadow-[0_15px_30px_rgba(202,138,4,0.3)]"
                                >
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="text-3xl font-black clay-text-3d">Med</span>
                                        <span className="font-bold text-[10px] uppercase tracking-wider opacity-80">Records</span>
                                    </div>
                                    <div className="absolute -top-4 -left-2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center rotate-[-12deg] clay-icon group-hover:rotate-0 transition-all duration-500 border border-white/30">
                                        <FileText className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-black uppercase opacity-60">History</span>
                                        <ChevronRight className="w-4 h-4 ml-auto opacity-40 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </button>

                                {/* Billing Card */}
                                <button
                                    onClick={() => setView('finance')}
                                    className="group relative clay-card bg-clay-rose p-5 text-white flex items-center justify-between"
                                >
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="text-3xl font-black clay-text-3d">{myInvoices.filter(i => i.status !== 'PAID').length || '0'}</span>
                                        <span className="font-bold text-[10px] uppercase tracking-wider opacity-80">Invoices</span>
                                    </div>
                                    <div className="absolute -top-4 -left-2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center rotate-[-12deg] clay-icon group-hover:rotate-0 transition-all duration-500 border border-white/30">
                                        <CreditCard className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-black uppercase opacity-60">Pending</span>
                                        <ChevronRight className="w-4 h-4 ml-auto opacity-40 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </button>

                                {/* Shop Card */}
                                <button
                                    onClick={() => setView('shop')}
                                    className="group relative clay-card bg-clay-orange p-5 text-white flex items-center justify-between"
                                >
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="text-3xl font-black clay-text-3d">{cart.length || 'Visit'}</span>
                                        <span className="font-bold text-[10px] uppercase tracking-wider opacity-80">Clinic Store</span>
                                    </div>
                                    <div className="absolute -top-4 -left-2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center rotate-[-12deg] clay-icon group-hover:rotate-0 transition-all duration-500 border border-white/30 relative">
                                        <ShoppingBag className="w-7 h-7 text-white" />
                                        {cart.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border border-white shadow-lg">{cart.length}</span>}
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-black uppercase opacity-60">Store</span>
                                        <ChevronRight className="w-4 h-4 ml-auto opacity-40 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </button>

                                {/* Services Card */}
                                <button
                                    onClick={() => setView('services')}
                                    className="group relative clay-card bg-clay-emerald p-5 text-white flex items-center justify-between shadow-[0_15px_30px_rgba(5,150,105,0.3)]"
                                >
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="text-3xl font-black clay-text-3d">Care</span>
                                        <span className="font-bold text-[10px] uppercase tracking-wider opacity-80">Services</span>
                                    </div>
                                    <div className="absolute -top-4 -left-2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center rotate-[-12deg] clay-icon group-hover:rotate-0 transition-all duration-500 border border-white/30">
                                        <Stethoscope className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-black uppercase opacity-60">Options</span>
                                        <ChevronRight className="w-4 h-4 ml-auto opacity-40 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </button>

                                {/* Settings Card */}
                                <button
                                    onClick={() => setView('settings')}
                                    className="group relative clay-card bg-clay-violet p-5 text-white flex items-center justify-between shadow-[0_15px_30px_rgba(124,58,237,0.3)]"
                                >
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="text-3xl font-black clay-text-3d">User</span>
                                        <span className="font-bold text-[10px] uppercase tracking-wider opacity-80">Settings</span>
                                    </div>
                                    <div className="absolute -top-4 -left-2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center rotate-[-12deg] clay-icon group-hover:rotate-0 transition-all duration-500 border border-white/30">
                                        <Settings className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-black uppercase opacity-60">Profile</span>
                                        <ChevronRight className="w-4 h-4 ml-auto opacity-40 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Pets List - Left Column (50%) */}
                                <div className="lg:col-span-6 space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">The Pet Family</h3>
                                        <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-2 py-1 rounded">Update Daily</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-6">
                                        {myPatients.map(p => (
                                            <div key={p.id} onClick={() => setSelectedPatientId(selectedPatientId === p.id ? null : p.id)} className={`neumorphic-node rounded-[40px] p-6 pb-2 transition-all cursor-pointer group flex flex-col ${selectedPatientId === p.id ? 'gold-blend-border gold-blend-glow scale-[1.02]' : ''}`}>
                                                <div className="p-6 pb-2">
                                                    <div className="flex items-center gap-6">
                                                        <div className="neumorphic-circle-container flex-shrink-0 text-teal-600 text-3xl font-black group-hover:scale-105 transition-transform duration-500">
                                                            {p.name?.[0] || '?'}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="font-black text-xl text-slate-900 tracking-tight">{p.name}</h4>
                                                                <span className="text-[8px] font-black bg-teal-50 text-teal-600 px-2 py-1 rounded-full uppercase tracking-tighter">{p.status}</span>
                                                            </div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mt-0.5">{p.species} • {p.breed}</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                                        <div className="neumorphic-pill p-3 border border-white/50">
                                                            <span className="text-[8px] font-black text-slate-400 block uppercase tracking-wide ml-2">Age</span>
                                                            <span className="text-xs font-black text-slate-800 ml-2">{p.age}</span>
                                                        </div>
                                                        <div className="neumorphic-pill p-3 border border-white/50">
                                                            <span className="text-[8px] font-black text-emerald-600 block uppercase tracking-wide ml-2">Condition</span>
                                                            <span className="text-xs font-black text-emerald-600 ml-2">Healthy</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {selectedPatientId === p.id && (
                                                    <div className="px-6 pb-6 pt-4 animate-in slide-in-from-top-4 duration-300">
                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-sky-500" /> Latest Health Note</h5>
                                                        {p.notes.length > 0 ? (
                                                            <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100/50">
                                                                <p className="text-xs text-slate-700 leading-relaxed font-medium italic">"{p.notes[p.notes.length - 1].content.substring(0, 100)}..."</p>
                                                                <p className="text-[10px] font-black text-sky-600 mt-2 uppercase tracking-wide">— {new Date(p.notes[p.notes.length - 1].date).toLocaleDateString()}</p>
                                                            </div>
                                                        ) : <p className="text-xs text-slate-400 italic font-medium">No medical history shared yet.</p>}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {myPatients.length === 0 && (
                                            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-50 flex flex-col items-center">
                                                <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center text-teal-200 mb-6 scale-110">
                                                    <PawPrint className="w-12 h-12" />
                                                </div>
                                                <h3 className="text-xl font-black text-slate-800">Your pet family is waiting</h3>
                                                <p className="text-slate-400 font-medium">Register your pets with the clinic to start tracking their care.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Billing Health - Middle Column (25%) */}
                                <div className="lg:col-span-3 space-y-6">
                                    <div className="neumorphic-node bg-slate-900 p-8 text-white relative overflow-hidden h-full flex flex-col justify-between rounded-[40px] border border-white/5 shadow-2xl">
                                        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
                                        <div>
                                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Billing Health
                                            </h3>
                                            {myInvoices.filter(i => i.status !== 'PAID').length > 0 ? (
                                                <div className="space-y-4">
                                                    {myInvoices.filter(i => i.status !== 'PAID').slice(0, 1).map(inv => (
                                                        <div key={inv.id} className="relative z-10">
                                                            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Outstanding Amount</p>
                                                            <h4 className="text-3xl font-black text-white tracking-tighter mt-1">{formatCurrency(inv.total, currency)}</h4>
                                                            <button onClick={() => setView('finance')} className="w-full mt-6 py-3.5 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Clear Balance</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center py-6 relative z-10 h-full justify-center">
                                                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                                                        <Check className="w-6 h-6" />
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">All Clear</p>
                                                    <p className="text-[10px] text-white/40 font-bold mt-1 text-center">No pending payments</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Scheduled Visits - Right Column (25%) */}
                                <div className="lg:col-span-3 space-y-6">
                                    <div className="neumorphic-node p-8 overflow-hidden relative group h-full rounded-[40px] border border-white/50">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <Calendar className="w-20 h-20 text-indigo-900" />
                                        </div>
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2 relative z-10">
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div> Scheduled Visits
                                        </h3>
                                        <div className="space-y-4 relative z-10">
                                            {myAppointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled').length > 0 ? (
                                                myAppointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled').slice(0, 3).map(apt => (
                                                    <div key={apt.id} className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/50 hover:bg-white transition-all">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{new Date(apt.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                            <span className={`text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter ${getStatusColor(apt.status)}`}>{apt.status}</span>
                                                        </div>
                                                        <p className="font-black text-slate-800 text-sm">{apt.visitType}</p>
                                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1.5 flex items-center gap-1.5"><PawPrint className="w-3 h-3" /> {apt.patientName}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8">
                                                    <p className="text-xs text-slate-400 font-bold italic">No upcoming appointments.</p>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => setShowRequestForm(true)} className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/20 md:hidden">
                                            New Request
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Store Essentials - Full Width Spotlight */}
                            <div className="lg:col-span-12 space-y-6 mt-8">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinic Store Spotlight</h3>
                                    <button onClick={() => setView('shop')} className="text-[10px] font-black text-teal-600 uppercase tracking-widest hover:underline">View All Products</button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {spotlightItems.map((item: any) => (
                                        <div key={item.id} className="bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group cursor-pointer" onClick={() => { setView('shop'); setShopSearch(item.name); }}>
                                            <div className="aspect-square bg-slate-50 rounded-2xl mb-2 flex items-center justify-center group-hover:bg-teal-50 transition-colors overflow-hidden">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                ) : (
                                                    <Package className="w-6 h-6 text-slate-200 group-hover:text-teal-200 transition-colors" />
                                                )}
                                            </div>
                                            <h4 className="text-[10px] font-black text-slate-800 truncate mb-0.5">{item.name}</h4>
                                            <p className="text-[11px] font-black text-teal-600">{formatCurrency(item.clientPrice || 0, currency)}</p>
                                        </div>
                                    ))}
                                    {spotlightItems.length === 0 && (
                                        <div className="col-span-full py-12 text-center bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No spotlight items today</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'shop' && (
                        <div className="max-w-6xl mx-auto space-y-8 pb-32 md:pb-8 animate-in slide-in-from-bottom-6 duration-500">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Clinic Store</h2>
                                    <p className="text-slate-500 font-medium text-lg mt-1">Premium supplies for your beloved pets.</p>
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-80 group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-teal-600 transition-colors" />
                                        <input
                                            className="w-full pl-12 pr-4 py-[1.125rem] bg-white border border-slate-200 rounded-[1.75rem] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-medium text-slate-800 shadow-sm"
                                            placeholder="Search food, toys, meds..."
                                            value={shopSearch}
                                            onChange={e => setShopSearch(e.target.value)}
                                        />
                                    </div>
                                    <button onClick={() => setView('checkout')} className="p-[1.125rem] bg-slate-900 text-white rounded-[1.75rem] relative hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20">
                                        <ShoppingBag className="w-6 h-6" />
                                        {cart.length > 0 && <span className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-rose-500 text-white text-[11px] font-black flex items-center justify-center rounded-full border-[3px] border-white shadow-lg">{cart.length}</span>}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                                {shopItems.map(item => (
                                    <div key={item.id} className="bg-white rounded-xl border border-slate-100 p-1.5 shadow-sm hover:shadow-lg hover:border-teal-100 transition-all group overflow-hidden">
                                        <div className="aspect-square bg-slate-50 rounded-lg mb-2 flex items-center justify-center relative overflow-hidden group-hover:bg-teal-50 transition-colors duration-500">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            ) : (
                                                <Package className="w-6 h-6 text-slate-200 group-hover:scale-125 group-hover:text-teal-200 transition-all duration-700" />
                                            )}
                                            <div className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-md text-teal-600 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest shadow-sm border border-slate-50">{item.category}</div>
                                        </div>
                                        <div className="px-1.5 pb-1.5">
                                            <h4 className="font-black text-slate-800 text-[11px] mb-0.5 truncate group-hover:text-teal-700 transition-colors leading-tight">{item.name}</h4>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.unit}</p>
                                            <div className="flex items-center justify-between mt-auto">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900 tracking-tight leading-none">{formatCurrency(item.clientPrice || 0, currency)}</span>
                                                    <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">In Stock</span>
                                                </div>
                                                <button
                                                    onClick={() => addToCart(item)}
                                                    className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center hover:bg-teal-700 transition-all active:scale-90 shadow-lg shadow-teal-600/30 group-hover:rotate-12"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {shopItems.length === 0 && (
                                    <div className="col-span-full py-16 text-center">
                                        <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mx-auto mb-6 scale-110">
                                            <Search className="w-12 h-12" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-800">No products found</h3>
                                        <p className="text-slate-400 font-medium text-lg mt-2">Try searching for something else or browse categories.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {view === 'checkout' && (
                        <div className="max-w-6xl mx-auto pb-32">
                            <div className="flex items-center gap-4 mb-10">
                                <button onClick={() => setView('shop')} className="p-4 bg-white border border-slate-100 rounded-[1.25rem] text-slate-400 hover:text-slate-800 transition-all shadow-sm hover:scale-110 active:scale-90"><ChevronRight className="w-6 h-6 rotate-180" /></button>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Checkout</h2>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Checkout Steps */}
                                    <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 mb-8">
                                        {[
                                            { id: 'address', label: 'Address', icon: MapPin },
                                            { id: 'delivery', label: 'Delivery', icon: Package },
                                            { id: 'payment', label: 'Payment', icon: CreditCard },
                                            { id: 'confirm', label: 'Confirm', icon: Check }
                                        ].map((step, idx) => (
                                            <div key={step.id} className="flex flex-col items-center gap-3 flex-1 relative">
                                                <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center z-10 transition-all duration-500 ${checkoutStep === step.id ? 'bg-teal-600 text-white ring-[6px] ring-teal-50 scale-110' : idx < ['address', 'delivery', 'payment', 'confirm'].indexOf(checkoutStep) ? 'bg-teal-100 text-teal-600' : 'bg-slate-50 text-slate-400'}`}>
                                                    <step.icon className="w-6 h-6" />
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${checkoutStep === step.id ? 'text-teal-600' : 'text-slate-400'}`}>{step.label}</span>
                                                {idx < 3 && <div className={`absolute top-7 left-[calc(50%+30px)] w-[calc(100%-60px)] h-[3px] rounded-full ${idx < ['address', 'delivery', 'payment', 'confirm'].indexOf(checkoutStep) ? 'bg-teal-100' : 'bg-slate-50'}`}></div>}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden p-10">
                                        {checkoutStep === 'address' && (
                                            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                                                <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                                                    <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center"><MapPin className="w-6 h-6" /></div>
                                                    <div>
                                                        <h3 className="text-2xl font-black text-slate-800">Where to ship?</h3>
                                                        <p className="text-slate-400 text-sm font-medium">Please enter your accurate delivery details.</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="col-span-2">
                                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Full Name</label>
                                                        <input className="w-full p-5 bg-white border border-slate-100 rounded-[1.5rem] font-black text-slate-800 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all" value={address.name} onChange={e => setAddress({ ...address, name: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Phone Number</label>
                                                        <input className="w-full p-5 bg-white border border-slate-100 rounded-[1.5rem] font-black text-slate-800 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all placeholder:text-slate-200" value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })} placeholder="080 123 4567" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">City</label>
                                                        <input className="w-full p-5 bg-white border border-slate-100 rounded-[1.5rem] font-black text-slate-800 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all placeholder:text-slate-200" value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} placeholder="Lagos" />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <div className="flex justify-between items-center mb-2 ml-1">
                                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Street Address</label>
                                                            <button
                                                                onClick={handleGetLocation}
                                                                className="flex items-center gap-1.5 text-[10px] font-black text-teal-600 hover:text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl transition-all active:scale-95"
                                                            >
                                                                <MapPin className="w-3 h-3" /> Get Accurate Location
                                                            </button>
                                                        </div>
                                                        <textarea className="w-full p-5 bg-slate-50/50 border border-slate-100 rounded-[1.5rem] font-black text-slate-800 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all h-32 placeholder:text-slate-200" value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} placeholder="House number, street name, and neighborhood..." />
                                                    </div>
                                                </div>
                                                <button onClick={() => setCheckoutStep('delivery')} disabled={!address.phone || !address.street} className="w-full py-6 bg-slate-900 text-white rounded-[1.75rem] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 shadow-2xl shadow-slate-900/10 text-sm">Next Step: Delivery</button>
                                            </div>
                                        )}

                                        {checkoutStep === 'delivery' && (
                                            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                                                <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                                                    <div className="w-12 h-12 bg-teal-50 text-teal-500 rounded-2xl flex items-center justify-center"><Package className="w-6 h-6" /></div>
                                                    <div>
                                                        <h3 className="text-2xl font-black text-slate-800">Shipment Speed</h3>
                                                        <p className="text-slate-400 text-sm font-medium">How quickly do you need your items?</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div
                                                        onClick={() => setDeliveryOption('pickup')}
                                                        className={`p-8 border-2 rounded-[2.5rem] flex justify-between items-center cursor-pointer transition-all active:scale-[0.98] ${deliveryOption === 'pickup' ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-50 border-slate-50'}`}
                                                    >
                                                        <div className="flex items-center gap-6">
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${deliveryOption === 'pickup' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}><ShoppingBag className="w-6 h-6" /></div>
                                                            <div>
                                                                <p className={`font-black text-xl tracking-tight ${deliveryOption === 'pickup' ? 'text-white' : 'text-slate-800'}`}>Store Pickup</p>
                                                                <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${deliveryOption === 'pickup' ? 'text-white/60' : 'text-slate-400'}`}>Collect directly from the clinic</p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-xl font-black tracking-tighter ${deliveryOption === 'pickup' ? 'text-white' : 'text-slate-900'}`}>FREE</span>
                                                    </div>

                                                    {deliveryConfig?.active && (
                                                        <div
                                                            onClick={() => setDeliveryOption('delivery')}
                                                            className={`p-8 border-2 rounded-[2.5rem] flex flex-col gap-6 cursor-pointer transition-all active:scale-[0.98] ${deliveryOption === 'delivery' ? 'bg-teal-600 border-teal-600 shadow-xl shadow-teal-600/20' : 'bg-slate-50 border-slate-50'}`}
                                                        >
                                                            <div className="flex justify-between items-center w-full">
                                                                <div className="flex items-center gap-6">
                                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${deliveryOption === 'delivery' ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-600'}`}><Truck className="w-6 h-6" /></div>
                                                                    <div>
                                                                        <p className={`font-black text-xl tracking-tight ${deliveryOption === 'delivery' ? 'text-white' : 'text-slate-800'}`}>Home Delivery</p>
                                                                        <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${deliveryOption === 'delivery' ? 'text-white/60' : 'text-slate-400'}`}>Direct to your doorstep</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className={`text-2xl font-black tracking-tighter block ${deliveryOption === 'delivery' ? 'text-white' : 'text-slate-900'}`}>{deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee, currency)}</span>
                                                                    {deliveryOption === 'delivery' && deliveryFee === 0 && <span className="text-[8px] font-black text-white/60 uppercase">Threshold Met</span>}
                                                                </div>
                                                            </div>

                                                            {deliveryOption === 'delivery' && (
                                                                <div className="bg-white/10 p-6 rounded-[1.5rem] space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                                                    <div className="flex justify-between items-center">
                                                                        <label className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none">Estimate Distance</label>
                                                                        <span className="text-white font-black text-sm leading-none bg-black/20 px-3 py-1.5 rounded-full border border-white/10">{distanceKm} KM</span>
                                                                    </div>
                                                                    <input
                                                                        type="range" min="1" max="50"
                                                                        value={distanceKm}
                                                                        onChange={(e) => setDistanceKm(Number(e.target.value))}
                                                                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                                                                    />
                                                                    <div className="flex justify-between text-[8px] font-black text-white/20 uppercase tracking-widest px-1">
                                                                        <span>Local Range</span>
                                                                        <span>Ext Region</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-4 pt-4">
                                                    <button onClick={() => setCheckoutStep('address')} className="flex-1 py-6 bg-slate-100 text-slate-600 rounded-[1.75rem] font-black uppercase tracking-widest text-xs">Back</button>
                                                    <button onClick={() => setCheckoutStep('payment')} className="flex-[2] py-6 bg-slate-900 text-white rounded-[1.75rem] font-black uppercase tracking-widest text-xs">Continue to Payment</button>
                                                </div>
                                            </div>
                                        )}

                                        {checkoutStep === 'payment' && (
                                            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                                                <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                                                    <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center"><CreditCard className="w-6 h-6" /></div>
                                                    <div>
                                                        <h3 className="text-2xl font-black text-slate-800">Payment Gateway</h3>
                                                        <p className="text-slate-400 text-sm font-medium">Securely pay for your order.</p>
                                                    </div>
                                                </div>
                                                <div className="p-10 border-4 border-dashed border-teal-100 rounded-[3rem] text-center bg-teal-50 flex flex-col items-center">
                                                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-teal-600 mb-6 shadow-xl shadow-teal-600/10">
                                                        <ShieldAlert className="w-10 h-10" />
                                                    </div>
                                                    <h4 className="text-2xl font-black text-teal-900">Cash on Delivery</h4>
                                                    <p className="text-teal-700 font-medium text-lg mt-2 max-w-[280px]">No need to pay now! Just have your cash or card ready when our courier arrives.</p>
                                                </div>
                                                <div className="flex gap-4 pt-4">
                                                    <button onClick={() => setCheckoutStep('delivery')} className="flex-1 py-6 bg-slate-100 text-slate-600 rounded-[1.75rem] font-black uppercase tracking-widest text-xs">Back</button>
                                                    <button onClick={() => setCheckoutStep('confirm')} className="flex-[2] py-6 bg-slate-900 text-white rounded-[1.75rem] font-black uppercase tracking-widest text-xs">Review Order</button>
                                                </div>
                                            </div>
                                        )}

                                        {checkoutStep === 'confirm' && (
                                            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                                                <div className="text-center py-10">
                                                    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 scale-[1.2] shadow-xl shadow-emerald-500/10 border-4 border-white">
                                                        <Check className="w-12 h-12" />
                                                    </div>
                                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">One last look!</h3>
                                                    <p className="text-slate-500 font-medium text-lg mt-2">Please review your order carefully before placing it.</p>
                                                </div>
                                                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white space-y-4 shadow-2xl shadow-slate-900/20">
                                                    <div className="flex justify-between items-center opacity-70">
                                                        <span className="font-bold text-xs uppercase tracking-widest">Recipient</span>
                                                        <span className="font-black text-sm">{address.name}</span>
                                                    </div>
                                                    <div className="flex justify-between items-start opacity-70 border-t border-white/5 pt-4">
                                                        <span className="font-bold text-xs uppercase tracking-widest">Destination</span>
                                                        <span className="font-black text-sm text-right max-w-[200px]">{address.street}, {address.city}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center border-t border-white/10 pt-6 mt-4">
                                                        <span className="font-black text-lg uppercase tracking-widest">Grand Total</span>
                                                        <span className="text-3xl font-black text-emerald-400 tracking-tighter">{formatCurrency(grandTotal, currency)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 pt-4">
                                                    <button onClick={() => setCheckoutStep('payment')} className="flex-1 py-6 bg-slate-100 text-slate-600 rounded-[1.75rem] font-black uppercase tracking-widest text-xs transition-all active:scale-95">Go Back</button>
                                                    <button onClick={handlePlaceOrder} className="flex-[3] py-6 bg-teal-600 text-white rounded-[1.75rem] font-black uppercase tracking-widest text-sm shadow-2xl shadow-teal-600/30 hover:bg-teal-700 transition-all scale-[1.05] active:scale-95 hover:rotate-1">Place Order Now</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Order Summary Vertical Scroll Area */}
                                <div className="space-y-8">
                                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-10 sticky top-24 overflow-hidden">
                                        <div className="flex items-center justify-between mb-10">
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Bag Summary</h3>
                                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black">{cart.length} ITEMS</span>
                                        </div>
                                        <div className="space-y-8 mb-10 max-h-[400px] overflow-y-auto px-2 custom-scrollbar">
                                            {cart.map(item => (
                                                <div key={item.itemId} className="flex items-center gap-5 group animate-in fade-in slide-in-from-right-4 duration-300">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-[1.25rem] flex items-center justify-center text-slate-200 group-hover:bg-teal-50 group-hover:text-teal-200 transition-all duration-500 border border-slate-100">
                                                        <Package className="w-8 h-8" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-slate-800 truncate text-sm mb-1">{item.itemName}</p>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                                                <button onClick={() => updateCartQty(item.itemId, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all font-black">-</button>
                                                                <span className="text-[11px] font-black text-slate-900 w-6 text-center">{item.quantity}</span>
                                                                <button onClick={() => updateCartQty(item.itemId, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-teal-600 transition-all font-black">+</button>
                                                            </div>
                                                            <button onClick={() => removeFromCart(item.itemId)} className="text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-rose-500 transition-colors">Trash</button>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-slate-900 text-base tracking-tighter">{formatCurrency(item.total, currency)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {cart.length === 0 && (
                                                <div className="text-center py-20 opacity-30">
                                                    <ShoppingBag className="w-16 h-16 mx-auto mb-4" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">Bag is empty</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-5 pt-8 border-t-2 border-slate-50 border-dashed">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Subtotal</span>
                                                <span className="text-slate-800 font-black tracking-tight">{formatCurrency(cartTotal, currency)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Logistics ({deliveryOption === 'pickup' ? 'PICKUP' : `${distanceKm}KM`})</span>
                                                <span className={`font-black flex items-center gap-1.5 ${deliveryFee === 0 ? 'text-emerald-500' : 'text-slate-700'}`}>{deliveryFee === 0 ? <><Check className="w-3 h-3" /> FREE</> : formatCurrency(deliveryFee, currency)}</span>
                                            </div>
                                            <div className="pt-6 mt-4 border-t-2 border-slate-50">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-black text-xl text-slate-900 tracking-tight">Total</span>
                                                    <div className="text-right">
                                                        <span className="block text-3xl font-black text-slate-900 tracking-tighter leading-none">{formatCurrency(grandTotal, currency)}</span>
                                                        <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-2 block">{currentTenant?.currency === 'NGN' ? 'NIGERIAN NAIRA' : currentTenant?.currency || 'NGN'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {view === 'chat' && (
                        <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-[#efeae2] rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden relative">
                            {/* Header */}
                            <div className="px-6 py-4 bg-[#f0f2f5] border-b border-slate-200 flex justify-between items-center z-10 sticky top-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                                        <MessageSquare className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Clinic Concierge</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">Medical Team Online</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Messages area */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-95">
                                {(() => {
                                    const sessions: Record<string, ChatMessage[]> = {};
                                    myChat.forEach(msg => {
                                        const sId = msg.sessionId || 'legacy';
                                        if (!sessions[sId]) sessions[sId] = [];
                                        sessions[sId].push(msg);
                                    });

                                    return Object.entries(sessions).map(([sessionId, messages]) => (
                                        <div key={sessionId} className="space-y-4 mb-10">
                                            {/* Session Marker */}
                                            <div className="flex flex-col items-center mb-8">
                                                <div className="flex items-center gap-3 px-6 py-2 bg-slate-900/5 backdrop-blur-md rounded-full border border-slate-200 shadow-sm">
                                                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></div>
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
                                                        {sessionId === 'legacy' ? 'Old Conversation' : `Session #${sessionId.slice(-6)}`}
                                                    </span>
                                                </div>
                                                {messages[0] && (
                                                    <span className="text-[8px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                                                        Started on {new Date(messages[0].timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>

                                            {(() => {
                                                const groups: Record<string, ChatMessage[]> = {};
                                                messages.forEach(msg => {
                                                    const date = new Date(msg.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                                    if (!groups[date]) groups[date] = [];
                                                    groups[date].push(msg);
                                                });
                                                return Object.entries(groups).map(([date, msgs]) => (
                                                    <div key={date} className="space-y-4">
                                                        <div className="flex justify-center my-4">
                                                            <span className="px-3 py-1 bg-white/60 backdrop-blur-md rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-widest shadow-sm border border-white/50">{date}</span>
                                                        </div>
                                                        {msgs.map((msg: ChatMessage) => (
                                                            <div key={msg.id} className={`flex ${msg.sender === 'CLIENT' ? 'justify-end' : 'justify-start'} mb-1`}>
                                                                <div className={`max-w-[85%] sm:max-w-[100%] p-2 px-3 rounded-lg shadow-sm relative text-sm ${msg.sender === 'CLIENT'
                                                                    ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                                                                    : 'bg-white text-slate-900 rounded-tl-none'
                                                                    }`}>
                                                                    {msg.content.startsWith('MULTIMEDIA|') ? (
                                                                        <div className="space-y-2 py-1">
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
                                                                                            <p className="font-bold text-xs truncate">{name}</p>
                                                                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Download File</p>
                                                                                        </div>
                                                                                    </a>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                                    )}
                                                                    <div className="flex justify-end items-center gap-1 mt-1">
                                                                        <span className="text-[10px] text-slate-500 min-w-[50px] text-right">
                                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                        {msg.sender === 'CLIENT' && (
                                                                            <div className="flex items-center">
                                                                                {msg.isRead ? (
                                                                                    <div className="flex -space-x-1.5">
                                                                                        <Check className="w-3.5 h-3.5 text-blue-500" />
                                                                                        <Check className="w-3.5 h-3.5 text-blue-500" />
                                                                                    </div>
                                                                                ) : (
                                                                                    <Check className="w-3.5 h-3.5 text-slate-400" />
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {msg.tags && msg.tags.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1 mt-2 mb-1">
                                                                            {msg.tags.map(tag => (
                                                                                <span key={tag} className="px-2 py-0.5 bg-slate-900/5 text-[8px] font-black text-slate-500 rounded-md border border-slate-200/50 uppercase tracking-tighter shadow-inner">
                                                                                    #{tag}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    ));
                                })()}
                                {myChat.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                                        <span className="bg-[#e1f3fb] text-slate-600 px-4 py-2 rounded-lg shadow-sm text-xs mt-4">
                                            Feel free to ask us anything about your pet's health.
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Input area */}
                            < div className="p-2 sm:p-3 bg-[#f0f2f5] flex items-end gap-2" >
                                <label
                                    htmlFor="chat-file-upload"
                                    className="p-3 text-slate-500 hover:text-slate-600 rounded-full cursor-pointer transition-colors">
                                    <Paperclip className="w-6 h-6" />
                                    <input
                                        type="file"
                                        id="chat-file-upload"
                                        className="hidden"
                                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                                        onChange={(e) => {
                                            // Existing file logic preserved
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const maxSize = 10 * 1024 * 1024;
                                                if (file.size > maxSize) { alert('File size must be less than 10MB'); e.target.value = ''; return; }
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    const base64 = ev.target?.result as string;
                                                    onSendMessage(`MULTIMEDIA|${file.name}|${file.type}|${base64}`);
                                                    e.target.value = '';
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>
                                <input
                                    className="flex-1 py-3 px-4 bg-white border border-transparent focus:border-white rounded-lg focus:outline-none focus:ring-0 text-sm shadow-sm"
                                    placeholder="Type a message"
                                    value={msgText}
                                    onChange={e => setMsgText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                />
                                {
                                    msgText.trim() ? (
                                        <button
                                            onClick={handleSend}
                                            className="p-3 bg-[#00a884] text-white rounded-full hover:bg-[#008f6f] shadow-md transition-all active:scale-95 flex-shrink-0"
                                        >
                                            <Send className="w-5 h-5 fill-current" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => alert("Voice notes coming soon!")}
                                            className="p-3 bg-[#00a884] text-white rounded-full hover:bg-[#008f6f] shadow-md transition-all active:scale-95 flex-shrink-0"
                                        >
                                            <Mic className="w-5 h-5" />
                                        </button>
                                    )
                                }
                            </div>
                        </div>
                    )}

                    {view === 'finance' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Financial Overview</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {myInvoices.map(inv => (
                                    <div key={inv.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center group hover:border-teal-200 transition-all">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoice #{inv.id.slice(-6)}</p>
                                            <h4 className="font-black text-xl text-slate-800">{formatCurrency(inv.total, currency)}</h4>
                                            <p className="text-xs text-slate-500 mt-1 font-medium italic">{new Date(inv.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-tighter uppercase ${getStatusColor(inv.status)}`}>{inv.status}</span>
                                            {inv.status !== 'PAID' && (
                                                <button className="block mt-4 text-xs font-black text-teal-600 hover:text-teal-700 bg-teal-50 px-4 py-2 rounded-xl transition-all">Pay Now</button>
                                            )}
                                            <button
                                                onClick={() => setPrintRecord(inv)}
                                                className="flex items-center gap-1 mt-2 text-[10px] font-black text-slate-400 hover:text-teal-600 uppercase tracking-widest transition-colors ml-auto"
                                            >
                                                <Printer className="w-3 h-3" /> Get Receipt
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {myInvoices.length === 0 && <div className="text-center py-20 bg-white rounded-3xl border border-dashed text-slate-300 font-bold uppercase tracking-widest">No invoices generated.</div>}
                        </div>
                    )}

                    {view === 'services' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Our Services & Pricing</h2>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <input
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                        placeholder="Search treatments..."
                                        value={serviceSearch}
                                        onChange={e => setServiceSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {publicServices.map(s => (
                                    <div key={s.id} className="clay-card bg-white p-5 flex flex-col group transition-all border border-slate-50 shadow-slate-100/50">
                                        <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg w-fit mb-3 uppercase tracking-widest">{s.category}</span>
                                        <h4 className="font-bold text-slate-800 flex-1">{s.name}</h4>
                                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                            <span className="text-lg font-black text-slate-900">{formatCurrency(s.priceClient || 0, currency)}</span>
                                            <button onClick={() => { setReqReason(s.name); setShowRequestForm(true); }} className="p-2 text-teal-500 hover:bg-teal-50 rounded-xl transition-all active:scale-95"><ChevronRight /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {publicServices.length === 0 && <div className="text-center py-20 bg-white rounded-3xl border border-dashed text-slate-300 font-bold uppercase tracking-widest">No services found.</div>}
                        </div>
                    )}

                    {view === 'records' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pet Medical History</h2>
                            <div className="space-y-4">
                                {myConsultations.map(c => (
                                    <div key={c.id} className="clay-card bg-white p-6 transition-all border border-slate-50 shadow-slate-100/50">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">{new Date(c.date).toLocaleDateString()}</span>
                                                <h4 className="font-black text-xl text-slate-800">{c.patientName}</h4>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{c.vetName}</p>
                                            </div>
                                            <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">Consultation</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-slate-50/50 rounded-2xl">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assessment</p>
                                                <p className="text-sm text-slate-700 font-medium">{c.assessment}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan / Recommendations</p>
                                                <p className="text-sm text-slate-700 font-medium">{c.plan}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {myConsultations.length === 0 && <div className="text-center py-20 bg-white rounded-3xl border border-dashed text-slate-300 font-bold uppercase tracking-widest">No medical records found.</div>}
                            </div>
                        </div>
                    )}

                    {view === 'settings' && (
                        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
                            <h2 className="text-2xl font-black text-slate-800">Account Security</h2>

                            <div className="clay-card bg-white p-8 shadow-slate-100/50">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                                        <Lock className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-slate-800">Change Password</h3>
                                        <p className="text-xs font-medium text-slate-400">Password must be at least 6 characters long.</p>
                                    </div>
                                </div>

                                <div className="space-y-5 max-w-sm">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                                        <input
                                            type="password"
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                                            value={passData.new}
                                            onChange={e => setPassData({ ...passData, new: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                                        <input
                                            type="password"
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                                            value={passData.confirm}
                                            onChange={e => setPassData({ ...passData, confirm: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        onClick={handleChangePassword}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-black tracking-wider uppercase shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-slate-800"
                                    >
                                        <Save className="w-4 h-4" /> Save Changes
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 bg-rose-50 rounded-[40px] border border-rose-100">
                                <h4 className="font-black text-rose-800 text-lg mb-2">Need help?</h4>
                                <p className="text-rose-600 text-sm font-medium leading-relaxed">If you're having trouble accessing your account or need to update your contact details, please contact our support team at <span className="underline font-bold">support@vetnexus.app</span></p>
                            </div>
                        </div>
                    )}

                </main>

                {showRequestForm && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                        <div className="clay-card bg-white w-full max-w-sm p-8 shadow-2xl shadow-slate-900/40">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-xl text-slate-800 tracking-tight">New Appointment</h3>
                                <button onClick={() => setShowRequestForm(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Patient</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl bg-white font-bold text-slate-700"
                                        value={reqPatient}
                                        onChange={e => setReqPatient(e.target.value)}
                                    >
                                        <option value="">-- Choose Pet --</option>
                                        {myPatients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Visit</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl bg-white font-bold text-slate-700"
                                        value={reqReason}
                                        onChange={e => setReqReason(e.target.value)}
                                    >
                                        <option value="Consultation">General Consultation</option>
                                        <option value="Vaccination">Vaccination</option>
                                        <option value="Grooming">Grooming</option>
                                        <option value="Surgery">Surgery</option>
                                        <option value="Dental">Dental Care</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preferred Time</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700"
                                        value={reqDate}
                                        onChange={e => setReqDate(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleRequestAppointment}
                                    disabled={!reqPatient || !reqDate}
                                    className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    Send for Approval
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Print Preview Modal */}
            {printRecord && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-black text-slate-800">Document Preview</h3>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => window.print()}
                                    className="px-6 py-2 bg-teal-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-teal-600/20 active:scale-95 transition-all"
                                >
                                    Print / Download
                                </button>
                                <button
                                    onClick={() => setPrintRecord(null)}
                                    className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-rose-500 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 bg-slate-100/50 flex justify-center">
                            <DocumentTemplate
                                document={printRecord}
                                tenant={currentTenant!}
                                type={invTypeGuard(printRecord) ? 'RECEIPT' : 'INVOICE'}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
