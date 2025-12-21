
import React, { useState } from 'react';
import { AppState, Order, OrderItem, UserRole, Tenant } from '../types';
import { ShoppingBag, Package, Truck, CheckCircle, Clock, MapPin, Settings, Save, AlertCircle, Search, ChevronRight, User, Phone, Calendar, CreditCard, X, List, ExternalLink, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../services/storage';

interface Props {
    state: AppState;
    dispatch: (action: any) => void;
}

export const OrderManager: React.FC<Props> = ({ state, dispatch }) => {
    const [activeTab, setActiveTab] = useState<'orders' | 'config'>('orders');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const currentTenant = state.tenants.find(t => t.id === state.currentTenantId);
    const currency = currentTenant?.currency || 'NGN';

    // Delivery Config State
    const [deliveryActive, setDeliveryActive] = useState(currentTenant?.deliveryConfig?.active || false);
    const [baseFee, setBaseFee] = useState(currentTenant?.deliveryConfig?.baseFee || 0);
    const [amountPerKm, setAmountPerKm] = useState(currentTenant?.deliveryConfig?.amountPerKm || 0);
    const [freeThreshold, setFreeThreshold] = useState(currentTenant?.deliveryConfig?.freeDeliveryThreshold || 0);

    const filteredOrders = state.orders
        .filter(o => o.tenantId === state.currentTenantId)
        .filter(o =>
            o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.id.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const pendingOrders = filteredOrders.filter(o => o.status === 'PENDING');
    const recentOrders = filteredOrders.filter(o => o.status !== 'PENDING').slice(0, 10);

    const handleSaveConfig = () => {
        const updates: Partial<Tenant> = {
            id: state.currentTenantId,
            deliveryConfig: {
                active: deliveryActive,
                baseFee: Number(baseFee),
                amountPerKm: Number(amountPerKm),
                freeDeliveryThreshold: Number(freeThreshold)
            }
        };
        dispatch({ type: 'UPDATE_TENANT', payload: updates });
        alert("Delivery configuration updated!");
    };

    const updateOrderStatus = (orderId: string, status: Order['status']) => {
        const order = state.orders.find(o => o.id === orderId);
        if (order) {
            dispatch({
                type: 'UPDATE_ORDER',
                payload: { ...order, status }
            });
            if (selectedOrder?.id === orderId) {
                setSelectedOrder({ ...order, status });
            }
        }
    };

    const getStatusColor = (status: Order['status']) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'CONFIRMED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'SHIPPED': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'DELIVERED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'CANCELLED': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusIcon = (status: Order['status']) => {
        switch (status) {
            case 'PENDING': return Clock;
            case 'CONFIRMED': return Package;
            case 'SHIPPED': return Truck;
            case 'DELIVERED': return CheckCircle;
            case 'CANCELLED': return X;
            default: return List;
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-6 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Order Management</h1>
                        <p className="text-sm text-slate-500 font-medium">Manage client store orders and delivery settings</p>
                    </div>
                </div>

                <div className="flex bg-white/50 p-1.5 rounded-2xl border border-white/20 shadow-sm backdrop-blur-xl">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'config' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Delivery Config
                    </button>
                </div>
            </div>

            {activeTab === 'orders' ? (
                <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
                    {/* Left: Order List */}
                    <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by client or order ID..."
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            {/* Pending Orders Section */}
                            {pendingOrders.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                                        Needs Attention ({pendingOrders.length})
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {pendingOrders.map(order => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                active={selectedOrder?.id === order.id}
                                                onClick={() => setSelectedOrder(order)}
                                                currency={currency}
                                                getStatusColor={getStatusColor}
                                                getStatusIcon={getStatusIcon}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent/History Orders */}
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                                    Processed Orders
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {recentOrders.length > 0 ? recentOrders.map(order => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            active={selectedOrder?.id === order.id}
                                            onClick={() => setSelectedOrder(order)}
                                            currency={currency}
                                            getStatusColor={getStatusColor}
                                            getStatusIcon={getStatusIcon}
                                        />
                                    )) : (
                                        <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                            <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No processed orders found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Order Detail */}
                    <div className="w-full md:w-[400px] flex flex-col gap-6">
                        {selectedOrder ? (
                            <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h2 className="font-black text-slate-800 tracking-tight uppercase text-xs opacity-40">Order Details</h2>
                                        <h3 className="text-lg font-black text-slate-800">#{selectedOrder.id.slice(-8).toUpperCase()}</h3>
                                    </div>
                                    <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                    {/* Status Management */}
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Update Status</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as Order['status'][]).map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => updateOrderStatus(selectedOrder.id, s)}
                                                    className={`py-2.5 rounded-xl text-[10px] font-black tracking-widest border-2 transition-all ${selectedOrder.status === s ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Client Info */}
                                    <div className="bg-slate-50 rounded-3xl p-5 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Customer</p>
                                                <p className="font-black text-slate-800 leading-none">{selectedOrder.clientName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-teal-600 shadow-sm">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Shipping Address</p>
                                                <p className="font-bold text-slate-700 text-xs leading-relaxed">{selectedOrder.shippingAddress || 'Not specified'}</p>
                                            </div>
                                        </div>
                                        {selectedOrder.phoneNumber && (
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
                                                    <Phone className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Contact</p>
                                                    <p className="font-bold text-slate-700 text-xs">{selectedOrder.phoneNumber}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Items List */}
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Items Summary</label>
                                        <div className="space-y-3">
                                            {selectedOrder.items.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-400">
                                                            {item.quantity}x
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{item.itemName}</span>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-900">{formatCurrency(item.total, currency)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Financial Summary */}
                                    <div className="pt-6 border-t border-slate-100 space-y-2">
                                        <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                                            <span>Subtotal</span>
                                            <span>{formatCurrency(selectedOrder.total - (selectedOrder.deliveryFee || 0), currency)}</span>
                                        </div>
                                        {selectedOrder.deliveryFee !== undefined && selectedOrder.deliveryFee > 0 && (
                                            <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                                                <span>Logistics Fee</span>
                                                <span className="text-teal-600">+{formatCurrency(selectedOrder.deliveryFee, currency)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-end pt-2">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Paid</p>
                                                <p className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(selectedOrder.total, currency)}</p>
                                            </div>
                                            <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-emerald-100 flex items-center gap-2 mb-1">
                                                <CreditCard className="w-3 h-3" /> {selectedOrder.paymentMethod || 'PAID'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 border-t border-slate-100">
                                    <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2">
                                        <ExternalLink className="w-4 h-4" /> Print Logistics Label
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center p-8 text-center border-dashed">
                                <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                                    <ShoppingBag className="w-10 h-10 text-slate-200" />
                                </div>
                                <h3 className="text-lg font-black text-slate-800 mb-2">Select an Order</h3>
                                <p className="text-xs text-slate-400 font-medium max-w-[200px]">Click on any order on the left to view full details and manage fulfillment</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Delivery Config View */
                <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-8 overflow-y-auto custom-scrollbar">
                    <div className="max-w-2xl space-y-8">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Delivery Logistics Configuration</h2>
                            <p className="text-sm text-slate-500 font-medium">Define how delivery costs are calculated for your clients</p>
                        </div>

                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-[2.5rem] p-8 space-y-8">
                            {/* Toggle */}
                            <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-indigo-100 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 rounded-2xl ${deliveryActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 leading-none mb-1">Enable Client Delivery</h3>
                                        <p className="text-xs text-slate-500 font-medium">Toggle house-to-house delivery as a shipping option</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDeliveryActive(!deliveryActive)}
                                    className={`w-14 h-8 rounded-full relative transition-all ${deliveryActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${deliveryActive ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all ${!deliveryActive ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Base Delivery Fee</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">{currency}</span>
                                        <input
                                            type="number"
                                            className="w-full pl-14 pr-4 py-4 bg-white border border-slate-100 rounded-2xl font-black text-slate-800 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                            value={baseFee}
                                            onChange={(e) => setBaseFee(Number(e.target.value))}
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-medium pl-2">Default charge applied to all deliveries</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Amount Per Kilometer</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">{currency}</span>
                                        <input
                                            type="number"
                                            className="w-full pl-14 pr-4 py-4 bg-white border border-slate-100 rounded-2xl font-black text-slate-800 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                            value={amountPerKm}
                                            onChange={(e) => setAmountPerKm(Number(e.target.value))}
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-medium pl-2">Variable cost based on client distance</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Free Delivery Threshold</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">{currency}</span>
                                        <input
                                            type="number"
                                            className="w-full pl-14 pr-4 py-4 bg-white border border-slate-100 rounded-2xl font-black text-slate-800 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                            value={freeThreshold}
                                            onChange={(e) => setFreeThreshold(Number(e.target.value))}
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-medium pl-2">Orders above this value get free delivery (0 to disable)</p>
                                </div>

                                <div className="flex items-center gap-4 bg-amber-50 rounded-2xl p-4 border border-amber-100 self-end">
                                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                    <p className="text-[10px] text-amber-700 font-bold leading-tight">Delivery costs are automatically calculated during checkout in the Client Portal based on these values.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSaveConfig}
                                className="px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 active:scale-95 flex items-center gap-3"
                            >
                                <Save className="w-5 h-5" /> Update Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface CardProps {
    order: Order;
    active: boolean;
    onClick: () => void;
    currency: string;
    getStatusColor: (s: Order['status']) => string;
    getStatusIcon: (s: Order['status']) => any;
}

const OrderCard: React.FC<CardProps> = ({ order, active, onClick, currency, getStatusColor, getStatusIcon }) => {
    const StatusIcon = getStatusIcon(order.status);

    return (
        <div
            onClick={onClick}
            className={`group p-5 rounded-[2rem] border-2 cursor-pointer transition-all active:scale-[0.98] ${active ? 'bg-white border-indigo-600 shadow-2xl shadow-indigo-500/10' : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm'}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border flex items-center justify-center ${getStatusColor(order.status)}`}>
                        <StatusIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Order ID</p>
                        <h4 className="text-sm font-black text-slate-800">#{order.id.slice(-8).toUpperCase()}</h4>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                    <p className="text-lg font-black text-slate-900 tracking-tighter leading-none">{formatCurrency(order.total, currency)}</p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{order.clientName}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(order.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    <ChevronRight className={`w-4 h-4 transition-all ${active ? 'text-indigo-600 translate-x-1' : 'text-slate-200 group-hover:text-slate-400'}`} />
                </div>
            </div>
        </div>
    );
};
