import React, { useState, useRef } from 'react';
import { AppState, InventoryItem, InventoryBatch, ProductCategory } from '../types';
import { identifyProductFromImage } from '../services/geminiService';
import { toTitleCase } from '../utils/textUtils';
import { formatCurrency } from '../services/storage';
import {
    Plus, Search, AlertTriangle, Barcode, Warehouse, Edit2, ArrowUpCircle, ShoppingBag, Eye, EyeOff, Image, Trash2, Camera, Package
} from 'lucide-react';

interface Props {
    state: AppState;
    dispatch: (action: any) => void;
}

export const InventoryManager: React.FC<Props> = ({ state, dispatch }) => {
    const [activeTab, setActiveTab] = useState<'stock' | 'batches' | 'alerts'>('stock');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showRestockModal, setShowRestockModal] = useState(false);

    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const currentTenant = state.tenants.find(t => t.id === (state.currentTenantId || state.currentUser?.tenantId));
    const currency = currentTenant?.currency || 'NGN';
    const currentBranch = state.branches.find(b => b.id === state.currentBranchId);

    // FIX: Initialize state correctly to prevent "Uncontrolled Input" warnings
    const [formData, setFormData] = useState<Partial<InventoryItem>>({
        category: 'Drugs',
        visibleToClient: false
    });

    // FIX: Initialize expiryDate in state logic or handle it in the input
    const [batchData, setBatchData] = useState<Partial<InventoryBatch>>({
        quantity: 0,
        unitPrice: 0,
        purchasePrice: 0,
        wholesalePrice: 0
    });

    const [restockQty, setRestockQty] = useState(0);
    const [restockBatch, setRestockBatch] = useState('');
    const [restockExpiry, setRestockExpiry] = useState('');
    const [restockCost, setRestockCost] = useState(0);
    const [restockPrice, setRestockPrice] = useState(0);

    const filteredItems = state.inventory
        .filter(i => i.tenantId === state.currentTenantId && i.branchId === state.currentBranchId)
        .filter(i =>
            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.barcode?.includes(searchTerm) ||
            i.regulatoryNumber?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    const lowStockItems = filteredItems.filter(i => i.totalStock <= i.minLevel);

    const startCamera = async () => {
        setShowCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera Error:", err);
            alert("Could not access camera. Ensure permissions are granted.");
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
            if (result) {
                setFormData(prev => ({
                    ...prev,
                    name: result.name || prev.name,
                    category: (result.category as ProductCategory) || prev.category || 'Other',
                    unit: result.unit || prev.unit || 'Unit',
                    barcode: result.barcode || prev.barcode || '',
                    regulatoryNumber: result.regulatoryNumber || prev.regulatoryNumber || ''
                }));
                if (result.expiryDate) {
                    setBatchData(prev => ({ ...prev, expiryDate: result.expiryDate }));
                }
                alert(`Scan Successful!\nName: ${result.name || 'Unknown'}\nDetails extracted.`);
            } else {
                alert("Could not identify product from image. Please try again.");
            }
            setIsProcessing(false);
            stopCamera();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 3 * 1024 * 1024) {
            alert("Image size must be less than 3MB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, image: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveItem = () => {
        if (!state.currentBranchId) {
            alert("Please select a branch before adding items.");
            return;
        }
        if (!formData.name || !batchData.quantity || !batchData.expiryDate) {
            alert("Please fill in all required fields (Name, Qty, Expiry).");
            return;
        }

        if (Number(batchData.quantity) <= 0) {
            alert("Quantity must be greater than zero.");
            return;
        }

        const newItemId = `i${Date.now()}`;

        // FIX: Ensure date is converted to ISO string so the server doesn't crash (500 Error)
        const isoExpiry = new Date(batchData.expiryDate).toISOString();

        const newBatch: InventoryBatch = {
            id: `b${Date.now()}`,
            itemId: newItemId,
            batchNumber: batchData.batchNumber || `BATCH-${Date.now().toString().slice(-4)}`,
            expiryDate: isoExpiry,
            quantity: Number(batchData.quantity),
            unitPrice: Number(batchData.unitPrice),
            purchasePrice: Number(batchData.purchasePrice),
            wholesalePrice: Number(batchData.wholesalePrice)
        };

        const newItem: InventoryItem = {
            id: newItemId,
            name: toTitleCase(formData.name!),
            category: formData.category || 'Other',
            unit: formData.unit || 'Unit',
            totalStock: Number(batchData.quantity),
            minLevel: Number(formData.minLevel) || 5,
            barcode: formData.barcode,
            regulatoryNumber: formData.regulatoryNumber,
            batches: [newBatch],
            tenantId: state.currentTenantId,
            branchId: state.currentBranchId,
            visibleToClient: formData.visibleToClient || false,
            clientPrice: Number(formData.clientPrice) || Number(batchData.unitPrice),
            wholesalePrice: Number(formData.wholesalePrice) || Number(batchData.wholesalePrice) || 0,
            purchasePrice: Number(formData.purchasePrice) || Number(batchData.purchasePrice) || 0,
            salesCount: 0,
            image: formData.image
        };

        dispatch({ type: 'ADD_INVENTORY', payload: newItem });

        setShowAddForm(false);
        setFormData({ category: 'Drugs', visibleToClient: false });
        setBatchData({ quantity: 0, unitPrice: 0, purchasePrice: 0, wholesalePrice: 0 });
        setSelectedItem(null);
    };

    const handleUpdateItem = () => {
        if (!selectedItem || !formData.name) return;

        const updatedItem = {
            ...selectedItem,
            name: toTitleCase(formData.name!),
            category: formData.category!,
            unit: formData.unit!,
            minLevel: Number(formData.minLevel),
            barcode: formData.barcode,
            regulatoryNumber: toTitleCase(formData.regulatoryNumber || ''),
            visibleToClient: formData.visibleToClient,
            clientPrice: Number(formData.clientPrice),
            wholesalePrice: Number(formData.wholesalePrice),
            purchasePrice: Number(formData.purchasePrice),
            image: formData.image
        };

        dispatch({ type: 'UPDATE_INVENTORY', payload: updatedItem });
        setSelectedItem(updatedItem);
        setShowEditForm(false);
    };

    const handleDeleteItem = (itemId: string) => {
        if (window.confirm("Are you sure you want to delete this item? This will remove all stock and history.")) {
            dispatch({ type: 'DELETE_INVENTORY', payload: itemId });
            setSelectedItem(null);
        }
    };

    const handleAddStock = () => {
        if (!selectedItem || restockQty <= 0) return;

        const defaultExpiry = new Date();
        defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
        const finalExpiry = restockExpiry ? new Date(restockExpiry).toISOString() : defaultExpiry.toISOString();

        const newBatch: InventoryBatch = {
            id: `b${Date.now()}`,
            itemId: selectedItem.id,
            batchNumber: restockBatch || `BATCH-${Date.now().toString().slice(-4)}`,
            expiryDate: finalExpiry,
            quantity: Number(restockQty),
            purchasePrice: Number(restockCost),
            unitPrice: Number(restockPrice),
            wholesalePrice: 0 // Optional, default to 0
        };

        const updatedBatches = [...selectedItem.batches, newBatch];
        const newTotal = updatedBatches.reduce((acc, b) => acc + b.quantity, 0);

        const updatedItem = { ...selectedItem, batches: updatedBatches, totalStock: newTotal };
        dispatch({ type: 'UPDATE_INVENTORY', payload: updatedItem });

        // NOTE: User requested NOT to add this to expenses automatically.
        // If needed, we can log it or handle it as an asset update, but strictly removing ADD_EXPENSE here.

        setSelectedItem(updatedItem);
        setShowRestockModal(false);
        setRestockQty(0);
        setRestockBatch('');
        setRestockExpiry('');
    };

    const handleOpenEdit = (item: InventoryItem) => {
        setSelectedItem(item);
        setFormData(item);
        setShowEditForm(true);
    };

    const handleOpenRestock = (item: InventoryItem) => {
        setSelectedItem(item);
        const latestBatch = item.batches[item.batches.length - 1];
        setRestockPrice(latestBatch?.unitPrice || 0);
        setRestockCost(latestBatch?.purchasePrice || 0);
        setShowRestockModal(true);
    };

    return (
        <div className="h-[calc(100vh-100px)] flex gap-6">
            <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${showAddForm ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Warehouse className="w-6 h-6 text-teal-600" /> Inventory
                            </h2>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Barcode className="w-3 h-3" /> Branch: {currentBranch?.name}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                                <button onClick={() => setActiveTab('stock')} className={`px-3 py-1.5 text-xs font-bold rounded-md ${activeTab === 'stock' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Stock</button>
                                <button onClick={() => setActiveTab('batches')} className={`px-3 py-1.5 text-xs font-bold rounded-md ${activeTab === 'batches' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Batches</button>
                                <button onClick={() => setActiveTab('alerts')} className={`px-3 py-1.5 text-xs font-bold rounded-md ${activeTab === 'alerts' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Alerts</button>
                            </div>
                            <button onClick={() => { setShowAddForm(true); setFormData({ category: 'Drugs', visibleToClient: false }); }} className="flex items-center gap-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm text-sm font-bold">
                                <Plus className="w-4 h-4" /> Add Item
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                            placeholder="Search name, barcode, reg#..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                    {activeTab === 'stock' && (
                        <div className="space-y-3">
                            {filteredItems.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)} className="cursor-pointer flex items-center gap-4">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover border border-slate-100 shadow-sm" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                                                    <Package className="w-6 h-6" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-bold text-slate-800">{item.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{item.category}</span>
                                                    {item.barcode && <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><Barcode className="w-3 h-3" /> {item.barcode}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-lg font-bold ${item.totalStock <= item.minLevel ? 'text-red-600' : 'text-teal-600'}`}>
                                                {item.totalStock}
                                            </span>
                                            <span className="text-[10px] text-slate-400 uppercase">In Stock</span>
                                        </div>
                                    </div>

                                    {selectedItem?.id === item.id && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in">
                                            <div className="grid grid-cols-4 gap-2 mb-4">
                                                <button onClick={() => handleOpenRestock(item)} className="py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-200 hover:bg-green-100 flex items-center justify-center gap-2">
                                                    <ArrowUpCircle className="w-4 h-4" /> Stock
                                                </button>
                                                <button onClick={() => { const updated = { ...item, visibleToClient: !item.visibleToClient }; dispatch({ type: 'UPDATE_INVENTORY', payload: updated }); setSelectedItem(updated); }} className={`py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition-all ${item.visibleToClient ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>
                                                    {item.visibleToClient ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    {item.visibleToClient ? 'Hide' : 'Show'}
                                                </button>
                                                <button onClick={() => handleOpenEdit(item)} className="py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 hover:bg-indigo-100 flex items-center justify-center gap-2">
                                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                                </button>
                                                <button onClick={() => handleDeleteItem(item.id)} className="py-2 bg-red-50 text-red-700 rounded-lg text-xs font-bold border border-red-200 hover:bg-red-100 flex items-center justify-center gap-2">
                                                    <Trash2 className="w-3.5 h-3.5" /> Del
                                                </button>
                                            </div>
                                            <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100 mb-4 flex justify-between items-center">
                                                <div className="flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-teal-600" /><span className="text-xs font-bold text-slate-700">Shop Price</span></div>
                                                <span className="text-sm font-black text-teal-700">{formatCurrency(item.clientPrice || 0, currency)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'batches' && (
                        <div className="space-y-3">
                            {filteredItems.flatMap(i => i.batches.map(b => ({ ...b, itemName: i.name }))).map(batch => (
                                <div key={batch.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{batch.itemName}</h4>
                                        <span className="text-xs font-mono text-slate-500">{batch.batchNumber}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-bold text-sm">{batch.quantity}</span>
                                        <span className="text-[10px] text-red-500">Exp: {new Date(batch.expiryDate).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'alerts' && (
                        <div className="space-y-4">
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <h3 className="font-bold text-red-800 flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5" /> Low Stock</h3>
                                <ul className="space-y-2">
                                    {lowStockItems.map(item => (
                                        <li key={item.id} className="flex justify-between text-sm text-red-700"><span>{item.name}</span><span className="font-bold">{item.totalStock}</span></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Restock Modal */}
            {showRestockModal && selectedItem && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                        <h2 className="text-xl font-bold mb-4">Add Stock</h2>
                        <div className="space-y-3">
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-2">Quantity</label><input type="number" className="neo-input w-full p-2.5" placeholder="Qty" value={restockQty} onChange={e => setRestockQty(Number(e.target.value))} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-2">Batch Number</label><input className="neo-input w-full p-2.5" placeholder="Optional" value={restockBatch} onChange={e => setRestockBatch(e.target.value)} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-2">Expiry Date</label><input type="date" className="neo-input w-full p-2.5" value={restockExpiry} onChange={e => setRestockExpiry(e.target.value)} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-2">Cost Price</label><input type="number" className="neo-input w-full p-2.5" value={restockCost} onChange={e => setRestockCost(Number(e.target.value))} /></div>
                                <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-2">Selling Price</label><input type="number" className="neo-input w-full p-2.5" value={restockPrice} onChange={e => setRestockPrice(Number(e.target.value))} /></div>
                            </div>
                            <button onClick={handleAddStock} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold mt-2 shadow-lg hover:shadow-xl transition-all">Confirm Stock</button>
                            <button onClick={() => setShowRestockModal(false)} className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {(showAddForm || showEditForm) && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-neo rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-scale-in max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/50">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            {showEditForm ? <Edit2 className="w-6 h-6 text-indigo-600" /> : <Plus className="w-6 h-6 text-teal-600" />}
                            {showEditForm ? 'Edit Item Details' : 'Add New Inventory Item'}
                        </h2>
                        <div className="space-y-4">
                            {!showEditForm && !showCamera &&
                                <button onClick={startCamera} className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors neo-btn shadow-sm">
                                    <Camera className="w-4 h-4" /> Scan Product Label
                                </button>
                            }
                            {showCamera && <div className="relative rounded-xl overflow-hidden h-40 bg-black shadow-inner border-2 border-slate-200"><video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /><button onClick={captureImage} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full p-4 shadow-xl hover:scale-105 transition-transform"><Camera className="w-6 h-6 text-teal-600" /></button></div>}

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest ml-2">Product Name</label>
                                <input className="w-full p-3 text-slate-800 font-semibold focus:ring-2 focus:ring-teal-500/20 placeholder-slate-300 neo-input" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Amoxicillin 250mg" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">Product Image (Max 3MB)</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group neo-input">
                                        {formData.image ? (
                                            <>
                                                <img src={formData.image} className="w-full h-full object-cover" />
                                                <button onClick={() => setFormData({ ...formData, image: undefined })} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                    <Trash2 className="w-6 h-6" />
                                                </button>
                                            </>
                                        ) : (
                                            <Image className="w-8 h-8 text-slate-300" />
                                        )}
                                    </div>
                                    <label className="cursor-pointer bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 text-sm font-bold text-slate-600 neo-btn">
                                        Upload Image
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-widest ml-2">Category</label><select className="w-full p-3 text-slate-700 font-semibold neo-input bg-white" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as ProductCategory })}><option value="Drugs">Drugs</option><option value="Food">Food</option><option value="Consumables">Consumables</option><option value="Equipment">Equipment</option><option value="Other">Other</option></select></div>
                                <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-widest ml-2">Unit</label><input className="w-full p-3 neo-input font-semibold" value={formData.unit || ''} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="e.g. Bottle" /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-widest ml-2">Barcode</label><input className="w-full p-3 font-mono text-sm neo-input" value={formData.barcode || ''} onChange={e => setFormData({ ...formData, barcode: e.target.value })} placeholder="Scan or type" /></div>
                                <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-widest ml-2">Regulatory #</label><input className="w-full p-3 uppercase text-sm neo-input" value={formData.regulatoryNumber || ''} onChange={e => setFormData({ ...formData, regulatoryNumber: e.target.value })} placeholder="Reg No." /></div>
                            </div>

                            {!showEditForm && (
                                <div className="bg-white/50 p-4 rounded-2xl border border-white shadow-sm space-y-3 premium-neo-inset">
                                    <h3 className="font-bold text-slate-700 text-[10px] uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div> Initial Stock Details</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Quantity</label><input type="number" className="neo-input w-full p-2" value={batchData.quantity || ''} onChange={e => setBatchData({ ...batchData, quantity: Number(e.target.value) })} /></div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Expiry Date</label>
                                            <input type="date" className="neo-input w-full p-2" value={batchData.expiryDate || ''} onChange={e => setBatchData({ ...batchData, expiryDate: e.target.value })} />
                                        </div>
                                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Cost Price</label><input type="number" className="neo-input w-full p-2" value={batchData.purchasePrice || ''} onChange={e => setBatchData({ ...batchData, purchasePrice: Number(e.target.value) })} /></div>
                                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Retail Price</label><input type="number" className="neo-input w-full p-2 font-bold text-slate-800" value={batchData.unitPrice || ''} onChange={e => setBatchData({ ...batchData, unitPrice: Number(e.target.value) })} /></div>
                                    </div>
                                </div>
                            )}

                            {showEditForm && selectedItem && selectedItem.batches.length > 0 && (
                                <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 shadow-sm space-y-4 premium-neo-inset">
                                    <h3 className="font-bold text-amber-800 text-sm flex items-center gap-2">
                                        <Package className="w-4 h-4" />
                                        Latest Batch Details
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Expiry Date</label>
                                            <input
                                                type="date"
                                                className="w-full p-2 border-none bg-white rounded-lg shadow-inner neo-input"
                                                value={selectedItem.batches[selectedItem.batches.length - 1].expiryDate?.split('T')[0] || ''}
                                                onChange={e => {
                                                    const updatedBatches = [...selectedItem.batches];
                                                    updatedBatches[updatedBatches.length - 1] = {
                                                        ...updatedBatches[updatedBatches.length - 1],
                                                        expiryDate: new Date(e.target.value).toISOString()
                                                    };
                                                    setSelectedItem({ ...selectedItem, batches: updatedBatches });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Batch Quantity</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border-none bg-slate-100 rounded-lg shadow-inner text-slate-500"
                                                value={selectedItem.batches[selectedItem.batches.length - 1].quantity || ''}
                                                disabled
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Purchase Price</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border-none bg-white rounded-lg shadow-inner neo-input"
                                                value={selectedItem.batches[selectedItem.batches.length - 1].purchasePrice || ''}
                                                onChange={e => {
                                                    const updatedBatches = [...selectedItem.batches];
                                                    updatedBatches[updatedBatches.length - 1] = {
                                                        ...updatedBatches[updatedBatches.length - 1],
                                                        purchasePrice: Number(e.target.value)
                                                    };
                                                    setSelectedItem({ ...selectedItem, batches: updatedBatches });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Retail Price</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border-none bg-white rounded-lg shadow-inner font-bold text-amber-900 neo-input"
                                                value={selectedItem.batches[selectedItem.batches.length - 1].unitPrice || ''}
                                                onChange={e => {
                                                    const updatedBatches = [...selectedItem.batches];
                                                    updatedBatches[updatedBatches.length - 1] = {
                                                        ...updatedBatches[updatedBatches.length - 1],
                                                        unitPrice: Number(e.target.value)
                                                    };
                                                    setSelectedItem({ ...selectedItem, batches: updatedBatches });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Wholesale Price</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border-none bg-white rounded-lg shadow-inner font-bold text-amber-900 neo-input"
                                                value={selectedItem.batches[selectedItem.batches.length - 1].wholesalePrice || ''}
                                                onChange={e => {
                                                    const updatedBatches = [...selectedItem.batches];
                                                    updatedBatches[updatedBatches.length - 1] = {
                                                        ...updatedBatches[updatedBatches.length - 1],
                                                        wholesalePrice: Number(e.target.value)
                                                    };
                                                    setSelectedItem({ ...selectedItem, batches: updatedBatches });
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-amber-600 italic">💡 Editing the latest batch. Add new stock to create a new batch.</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-widest ml-2">Low Stock Alert</label><input type="number" className="neo-input w-full p-3 font-semibold" value={formData.minLevel ?? ''} onChange={e => setFormData({ ...formData, minLevel: Number(e.target.value) })} /></div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl shadow-sm border border-slate-100 bg-white">
                                        <input type="checkbox" className="w-4 h-4 accent-teal-600" checked={formData.visibleToClient || false} onChange={e => setFormData({ ...formData, visibleToClient: e.target.checked })} />
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Show in Shop</span>
                                    </label>
                                    {formData.visibleToClient && <div><label className="block text-[10px] font-bold text-teal-600 uppercase mb-1 ml-2">Online Price Override</label><input type="number" className="neo-input w-full p-2 font-bold text-teal-700 bg-teal-50/30" value={formData.clientPrice ?? ''} onChange={e => setFormData({ ...formData, clientPrice: Number(e.target.value) })} placeholder="Same as Retail" /></div>}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                            <button onClick={() => { setShowAddForm(false); setShowEditForm(false); }} className="px-5 py-2.5 text-slate-400 hover:text-slate-600 rounded-xl font-bold transition-colors text-xs uppercase tracking-widest">Cancel</button>
                            <button onClick={showEditForm ? handleUpdateItem : handleSaveItem} className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:shadow-lg active:scale-95 transition-all text-sm uppercase tracking-wider">{showEditForm ? 'Update Item' : 'Save Item'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};