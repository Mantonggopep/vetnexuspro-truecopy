
import React, { useState, useRef, useEffect } from 'react';
import { AppState, InventoryItem, Sale, SaleItem, PaymentMethod, Tenant, Invoice, InvoiceStatus } from '../types';
import { identifyProductFromImage } from '../services/geminiService';
import { toTitleCase } from '../utils/textUtils';
import { formatCurrency, getCurrencySymbol } from '../services/storage';
import { generateInvoiceId, generateReceiptId } from '../utils/idGenerator';
import { DocumentTemplate } from '../components/DocumentTemplate';
import {
    ShoppingCart, Search, Plus, Minus, Trash2, Camera, CreditCard,
    Banknote, Printer, FileText, Ban, X, List, User, CheckCircle, AlertCircle, FileDown
} from 'lucide-react';

interface Props {
    state: AppState;
    dispatch: (action: any) => void;
}

export const PointOfSale: React.FC<Props> = ({ state, dispatch }) => {

    const [mobileView, setMobileView] = useState<'products' | 'cart'>('products');
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Transaction State
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [isWalkIn, setIsWalkIn] = useState(true);
    const [walkInName, setWalkInName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');

    const [showPaymentSuccess, setShowPaymentSuccess] = useState<Sale | Invoice | null>(null);
    const [showHistoryDetail, setShowHistoryDetail] = useState<Sale | null>(null);

    // Camera State
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const currentTenant = state.tenants.find(t => t.id === (state.currentTenantId || state.currentUser?.tenantId));
    const currentBranch = state.branches.find(b => b.id === state.currentBranchId);
    const currency = currentTenant?.currency || 'NGN';

    // Filter Logic
    const allProducts = state.inventory.filter(i => i.tenantId === state.currentTenantId && i.totalStock > 0);

    const filteredProducts = searchTerm
        ? allProducts.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.barcode?.includes(searchTerm))
        : allProducts.slice(0, 10); // Show top 10 by default if focused

    const salesHistory = state.sales
        .filter(s => s.tenantId === state.currentTenantId && s.branchId === state.currentBranchId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const startCamera = async () => {
        setShowCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera Error:", err);
            alert("Could not access camera.");
            setShowCamera(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        setShowCamera(false);
    };

    const captureImage = async () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const base64 = canvas.toDataURL('image/jpeg');

            setIsProcessing(true);
            const result = await identifyProductFromImage(base64);
            if (result && result.name) {
                const matchedItem = state.inventory.find(i =>
                    i.name.toLowerCase().includes(result.name.toLowerCase()) &&
                    i.tenantId === state.currentTenantId
                );
                if (matchedItem) {
                    addToCart(matchedItem);
                    // Don't close, allow repeated scan
                    alert(`Added ${matchedItem.name} to cart.`);
                } else {
                    alert(`Product "${result.name}" identified but not found in stock.`);
                }
            } else {
                alert("Could not identify product. Try moving closer or better lighting.");
            }
            setIsProcessing(false);
        }
    };

    const addToCart = (item: InventoryItem) => {
        const batch = item.batches.find(b => b.quantity > 0 && new Date(b.expiryDate) > new Date());
        if (!batch) {
            alert("Item out of stock or expired.");
            return;
        }

        const existing = cart.find(c => c.itemId === item.id);
        if (existing) {
            if (existing.quantity >= item.totalStock) {
                alert("Insufficient stock.");
                return;
            }
            setCart(cart.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unitPrice } : c));
        } else {
            setCart([...cart, {
                itemId: item.id,
                itemName: item.name,
                quantity: 1,
                unitPrice: batch.unitPrice,
                total: batch.unitPrice
            }]);
            setSearchTerm(''); // Clear search after add
        }
    };

    const updateQty = (itemId: string, newQty: number) => {
        if (newQty < 0) return;

        const item = state.inventory.find(i => i.id === itemId);
        if (item && newQty > item.totalStock) {
            alert(`Insufficient stock. Only ${item.totalStock} available.`);
            return;
        }

        setCart(cart.map(c => {
            if (c.itemId === itemId) {
                return { ...c, quantity: newQty, total: newQty * c.unitPrice };
            }
            return c;
        }));
    };

    const removeFromCart = (itemId: string) => {
        setCart(cart.filter(c => c.itemId !== itemId));
    };

    const calculateSubtotal = () => cart.reduce((sum, item) => sum + item.total, 0);
    const taxRate = 0.00; // Simplified for demo
    const subtotal = calculateSubtotal();
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const handleTransaction = async (type: 'SALE' | 'INVOICE') => {
        if (cart.length === 0 || isSending) return;
        if (isWalkIn && !walkInName) {
            alert("Please enter a name for the walk-in client.");
            return;
        }
        if (!isWalkIn && !selectedClientId) {
            alert("Please select a registered client.");
            return;
        }

        // Final Stock Check
        for (const item of cart) {
            const product = state.inventory.find(i => i.id === item.itemId);
            if (product && item.quantity > product.totalStock) {
                alert(`Cannot complete sale. ${product.name} only has ${product.totalStock} in stock.`);
                return;
            }
        }

        setIsSending(true);

        try {
            const client = state.clients.find(c => c.id === selectedClientId);
            const formattedWalkInName = toTitleCase(walkInName);
            const clientName = isWalkIn ? `${formattedWalkInName} (Walk-in)` : (client?.name || 'Unknown');

            if (type === 'SALE') {
                const sale: Sale = {
                    id: generateReceiptId(currentTenant, state.sales.length),
                    date: new Date().toISOString(),
                    clientId: isWalkIn ? undefined : selectedClientId,
                    clientName,
                    items: cart,
                    subtotal,
                    tax,
                    total,
                    paymentMethod,
                    tenantId: state.currentTenantId,
                    branchId: state.currentBranchId,
                    status: 'COMPLETED'
                };
                await dispatch({ type: 'MAKE_SALE', payload: sale });
                setShowPaymentSuccess(sale);
            } else {
                // Invoice
                const invoice: Invoice = {
                    id: generateInvoiceId(state.invoices.length),
                    patientId: undefined, // Generic POS invoice
                    patientName: 'POS Transaction',
                    clientId: isWalkIn ? '' : (selectedClientId || ''),
                    clientName: clientName || 'Walk-in Customer',
                    date: new Date().toISOString(),
                    items: cart.map(c => ({ description: c.itemName, cost: c.total })),
                    total,
                    status: InvoiceStatus.DRAFT, // Unpaid
                    tenantId: state.currentTenantId,
                    branchId: state.currentBranchId
                };
                await dispatch({ type: 'ADD_INVOICE', payload: invoice });
                setShowPaymentSuccess(invoice);
            }

            setCart([]);
            setWalkInName('');
            setSelectedClientId('');
        } catch (error: any) {
            console.error("Transaction Error:", error);
            alert("Transaction failed: " + (error.message || "Unknown error"));
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="h-full md:h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 relative">
            {/* LEFT PANEL: Catalog & Search */}
            {/* LEFT PANEL: Search & History */}
            <div className={`flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="font-black text-slate-700 text-base tracking-tight">POS</h2>
                        <button
                            onClick={startCamera}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg font-bold shadow-sm hover:bg-indigo-700 text-xs active:scale-95 transition-all"
                        >
                            <Camera className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Scan</span>
                        </button>
                    </div>

                    <div className="relative z-20">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg shadow-sm text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none transition-all font-medium text-slate-600 placeholder:font-normal placeholder:text-slate-400"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        />

                        {/* Search Dropdown */}
                        {isSearchFocused && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2 custom-scrollbar">
                                {filteredProducts.length > 0 ? (
                                    <div className="divide-y divide-slate-50">
                                        <p className="text-[10px] font-black text-slate-400 uppercase px-4 py-2 bg-slate-50 sticky top-0 tracking-wider">
                                            {searchTerm ? 'Search Results' : 'Top Selling Products'}
                                        </p>
                                        {filteredProducts.map(item => (
                                            <div
                                                key={item.id}
                                                onMouseDown={() => addToCart(item)}
                                                className="p-3 hover:bg-teal-50 cursor-pointer flex justify-between items-center group transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
                                                        <ShoppingCart className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-700 text-xs md:text-sm">{item.name}</h3>
                                                        <div className="flex gap-2">
                                                            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">Stock: {item.totalStock}</span>
                                                            {item.barcode && <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.barcode}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-teal-600 font-black text-sm">{formatCurrency(item.batches[0]?.unitPrice || 0, currency)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-slate-400">
                                        <p className="text-sm font-bold">No products found</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sales Record (History) */}
                <div className="flex-1 overflow-y-auto bg-slate-50/30 relative custom-scrollbar">
                    <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-3 py-1.5 flex justify-between items-center z-10">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Recent Sales</h3>
                        <span className="text-[9px] font-black bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase">{salesHistory.length}</span>
                    </div>
                    <div className="p-3 space-y-2">
                        {salesHistory.length > 0 ? salesHistory.map(sale => (
                            <div
                                key={sale.id}
                                onClick={() => setShowHistoryDetail(sale)}
                                className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-lg hover:border-teal-200 cursor-pointer transition-all group active:scale-[0.99]"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 font-bold text-xs ring-4 ring-green-50/50 group-hover:scale-110 transition-transform">
                                            <CheckCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm group-hover:text-teal-600 transition-colors">{sale.clientName}</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">#{sale.id.slice(-6).toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-black text-slate-800 tracking-tight">{formatCurrency(sale.total, currency)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs pl-13 border-t border-slate-50 pt-3">
                                    <span className="text-slate-400 font-bold">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase text-[10px]">{sale.paymentMethod}</span>
                                        <span className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded font-bold uppercase text-[10px]">{sale.items.length} Items</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                                    <List className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="font-bold text-slate-400">No transactions yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Toggle */}
            <div className="md:hidden fixed bottom-6 right-6 z-40">
                <button
                    onClick={() => setMobileView(mobileView === 'cart' ? 'products' : 'cart')}
                    className="bg-slate-900 text-white p-4 rounded-full shadow-xl flex items-center gap-2"
                >
                    {mobileView === 'products' ? (
                        <>
                            <ShoppingCart className="w-6 h-6" />
                            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold absolute -top-1 -right-1">{cart.length}</span>
                        </>
                    ) : (
                        <List className="w-6 h-6" />
                    )}
                </button>
            </div>

            {/* RIGHT PANEL: Cart & Checkout */}
            <div className={`w-full md:w-[380px] bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col ${mobileView === 'products' ? 'hidden md:flex' : 'flex h-full fixed inset-0 z-30 md:static md:h-auto'}`}>
                <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-teal-600" /> Cart
                    </h3>
                    <button onClick={() => setMobileView('products')} className="md:hidden p-1.5 text-slate-400"><X className="w-5 h-5" /></button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-slate-50/50">
                    {cart.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-800 truncate">{item.itemName}</div>
                                <div className="text-[10px] text-slate-500">{formatCurrency(item.unitPrice, currency)}</div>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-1.5 py-0.5">
                                <input
                                    type="number"
                                    min="0"
                                    className="w-10 text-center bg-transparent text-xs font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={item.quantity === 0 ? '' : item.quantity}
                                    onChange={(e) => updateQty(item.itemId, e.target.value === '' ? 0 : parseInt(e.target.value))}
                                />
                            </div>
                            <div className="text-right min-w-[50px]">
                                <div className="text-xs font-bold text-teal-600">{formatCurrency(item.total, currency)}</div>
                            </div>
                            <button onClick={() => removeFromCart(item.itemId)} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                            <ShoppingCart className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-xs">Cart is empty</p>
                        </div>
                    )}
                </div>

                {/* Checkout Controls */}
                <div className="p-3 border-t border-slate-200 bg-white space-y-3 pb-safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">

                    {/* Client Selection */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div className="flex gap-1.5 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <button onClick={() => setIsWalkIn(true)} className={`flex-1 py-1 rounded ${isWalkIn ? 'bg-white shadow-sm text-slate-800' : 'hover:text-slate-700'}`}>Walk-In</button>
                            <button onClick={() => setIsWalkIn(false)} className={`flex-1 py-1 rounded ${!isWalkIn ? 'bg-white shadow-sm text-slate-800' : 'hover:text-slate-700'}`}>Client</button>
                        </div>
                        {isWalkIn ? (
                            <input
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                                placeholder="Name (Optional)"
                                value={walkInName}
                                onChange={e => setWalkInName(e.target.value)}
                            />
                        ) : (
                            <select
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                                value={selectedClientId}
                                onChange={e => setSelectedClientId(e.target.value)}
                            >
                                <option value="">Select Client...</option>
                                {state.clients.filter(c => c.tenantId === state.currentTenantId).map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Payment Method */}
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Payment</label>
                            <select
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                            >
                                <option value="CARD">Card</option>
                                <option value="CASH">Cash</option>
                                <option value="TRANSFER">Transfer</option>
                                {!isWalkIn && <option value="CREDIT">Credit</option>}
                            </select>
                        </div>
                        <div className="flex-1 text-right">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Total</label>
                            <div className="text-xl font-bold text-slate-800">{formatCurrency(total, currency)}</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => handleTransaction('INVOICE')}
                            disabled={cart.length === 0 || isSending || (!isWalkIn && !selectedClientId)}
                            className="py-2 bg-white border-2 border-slate-200 text-slate-700 rounded-lg font-bold text-xs hover:bg-slate-50 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                        >
                            {isSending ? <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                            Invoice
                        </button>
                        <button
                            onClick={() => handleTransaction('SALE')}
                            disabled={cart.length === 0 || isSending || (!isWalkIn && !selectedClientId && !walkInName)}
                            className="py-2 bg-teal-600 text-white rounded-lg font-bold text-xs hover:bg-teal-700 shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                        >
                            {isSending ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                            Pay
                        </button>
                    </div>
                </div>
            </div>

            {/* Live Camera Modal */}
            {showCamera && (
                <div className="fixed inset-0 bg-black z-[60] flex flex-col items-center justify-center">
                    <div className="relative w-full max-w-md bg-black rounded-2xl overflow-hidden shadow-2xl">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
                        <button
                            onClick={stopCamera}
                            className="absolute top-4 right-4 p-2 bg-white/20 text-white rounded-full backdrop-blur-md hover:bg-white/40"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        {isProcessing && (
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                                <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-2"></div>
                                <p className="font-bold">Identifying Product...</p>
                            </div>
                        )}
                    </div>
                    <div className="mt-8 flex flex-col items-center gap-4">
                        <button onClick={captureImage} className="w-20 h-20 bg-white rounded-full border-[6px] border-slate-500/50 flex items-center justify-center active:scale-95 transition-transform shadow-lg">
                            <div className="w-16 h-16 bg-red-600 rounded-full border-2 border-white"></div>
                        </button>
                        <p className="text-white/70 text-sm font-medium bg-black/50 px-4 py-1 rounded-full backdrop-blur">Tap to scan item</p>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showPaymentSuccess && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Transaction Complete</h2>
                        <p className="text-slate-500 mb-6">
                            {(showPaymentSuccess as any).status === 'COMPLETED' ? 'Payment processed successfully.' : 'Invoice created successfully.'}
                        </p>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500">Total Amount</span>
                                <span className="font-bold text-slate-800">{formatCurrency(showPaymentSuccess.total, currency)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Items</span>
                                <span className="font-bold text-slate-800">{showPaymentSuccess.items.length}</span>
                            </div>
                        </div>
                        <div className="grid gap-3">
                            <button onClick={() => window.print()} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2">
                                <Printer className="w-4 h-4" /> Print Receipt
                            </button>
                            <button onClick={() => setShowPaymentSuccess(null)} className="w-full py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl">
                                Start New Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Detail Modal */}
            {showHistoryDetail && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">Transaction Details</h2>
                            <button onClick={() => setShowHistoryDetail(null)} className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 bg-slate-100/50 flex justify-center">
                            {currentTenant && (
                                <DocumentTemplate
                                    document={showHistoryDetail}
                                    tenant={currentTenant}
                                    type="RECEIPT"
                                />
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => window.print()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                                <Printer className="w-4 h-4" /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Printable Document Area */}
            <div className="fixed top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none print:w-full print:h-auto print:overflow-visible print:relative">
                <div id="printable-area" className="printable-document">
                    {showPaymentSuccess && currentTenant && (
                        <DocumentTemplate
                            document={showPaymentSuccess}
                            tenant={currentTenant}
                            type={(showPaymentSuccess as any).status === 'COMPLETED' ? 'RECEIPT' : 'INVOICE'}
                            branchDetails={currentBranch ? { address: currentBranch.address, phone: currentBranch.phone } : undefined}
                        />
                    )}
                    {showHistoryDetail && currentTenant && (
                        <DocumentTemplate
                            document={showHistoryDetail}
                            tenant={currentTenant}
                            type="RECEIPT"
                            branchDetails={currentBranch ? { address: currentBranch.address, phone: currentBranch.phone } : undefined}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
