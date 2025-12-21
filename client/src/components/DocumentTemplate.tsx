import React from 'react';
import { Tenant, Sale, Invoice, SaleItem, PaymentMethod } from '../types';
import { formatCurrency } from '../services/storage';
import { Globe, Phone, Mail } from 'lucide-react';

interface Props {
    document: Sale | Invoice;
    tenant: Tenant;
    type: 'INVOICE' | 'RECEIPT';
    branchDetails?: {
        address: string;
        phone: string;
    }
}

export const DocumentTemplate: React.FC<Props> = ({ document, tenant, type, branchDetails }) => {
    const items = document.items as any[];
    const currency = tenant.currency || 'NGN';
    const email = `${tenant.name.toLowerCase().replace(/\s/g, '')}@vetnexus.com`;
    // const phone = branchDetails?.phone || '+234 812 345 6789';
    const address = branchDetails?.address || tenant.address;

    // Calculate totals safely
    const subtotal = 'subtotal' in document ? (document as any).subtotal : document.total;
    const discount = 'discount' in document ? (document as any).discount : 0;
    const tax = 'tax' in document ? (document as any).tax : 0;
    const total = document.total;
    const amountPaid = type === 'RECEIPT' ? total : 0;
    const balanceDue = type === 'RECEIPT' ? 0 : total;

    return (
        <div className="bg-white p-12 max-w-[800px] mx-auto min-h-[1100px] flex flex-col relative overflow-hidden font-sans text-slate-800 printable-document border border-slate-100">
            {/* Receipts Watermark */}
            {type === 'RECEIPT' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] rotate-[-35deg] select-none z-0">
                    <h1 className="text-[200px] font-black tracking-tighter text-emerald-600 border-4 border-emerald-600 rounded-3xl px-12 transform">PAID</h1>
                </div>
            )}

            {/* Header: Centered Clinic Info as per image */}
            <div className="flex flex-col items-center justify-center mb-16 text-center space-y-2 relative z-10">
                <h1 className="text-3xl font-bold text-teal-700 tracking-tight">{tenant.name}</h1>
                <p className="text-sm font-medium text-slate-600 max-w-[400px] leading-relaxed">{address}</p>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                    <span>{email}</span>
                    <span>|</span>
                    <span>{branchDetails?.phone || '09018492795'}</span>
                </div>
                {/* Top Right Menu Button Mock (Visual Only from Image) -> Hidden in print */}
                <div className="absolute -top-4 -right-4 bg-slate-50 p-2 rounded-full print:hidden">
                    <div className="w-6 h-0.5 bg-slate-400 mb-1"></div>
                    <div className="w-6 h-0.5 bg-slate-400 mb-1"></div>
                    <div className="w-6 h-0.5 bg-slate-400"></div>
                </div>
            </div>

            {/* Billed To / Invoice Details Row */}
            <div className="flex justify-between items-start mb-12 relative z-10">
                <div className="space-y-1">
                    <h4 className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">BILLED TO</h4>
                    <p className="font-bold text-lg text-slate-900">{document.clientName || 'Walk-in Client'}</p>
                </div>

                <div className="text-right space-y-1">
                    <h2 className="text-xl font-bold text-teal-700 uppercase tracking-widest">{type}</h2>
                    <p className="text-sm font-medium text-slate-800">
                        <span className="font-bold text-slate-500 mr-2">Number #:</span>
                        {document.id.substring(0, 8).toUpperCase()}-2025
                    </p>
                    <p className="text-sm font-medium text-slate-800">
                        <span className="font-bold text-slate-500 mr-2">Date:</span>
                        {new Date(document.date).toLocaleDateString()}
                    </p>
                </div>
            </div>

            {/* Items Table */}
            <div className="relative z-10 mb-8">
                {/* Table Header */}
                <div className="flex border-b border-slate-100 pb-2 mb-4 text-xs font-bold text-teal-700 uppercase tracking-wide">
                    <span className="flex-1">Item / Service</span>
                    <span className="w-16 text-center">Qty</span>
                    <span className="w-32 text-right">Unit Price</span>
                    <span className="w-32 text-right">Total</span>
                </div>

                {/* Table Body */}
                <div className="space-y-4">
                    {items.length > 0 ? items.map((item, idx) => (
                        <div key={idx} className="flex items-start text-sm font-medium text-slate-700">
                            <span className="flex-1 pr-4">{item.itemName || item.description}</span>
                            <span className="w-16 text-center">{item.quantity || 1}</span>
                            <span className="w-32 text-right">{formatCurrency(item.unitPrice || item.cost, currency)}</span>
                            <span className="w-32 text-right font-bold text-slate-800">
                                {formatCurrency(item.total || item.cost * (item.quantity || 1), currency)}
                            </span>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-slate-400 italic text-sm">
                            No items listed in this document.
                        </div>
                    )}
                </div>
                <div className="h-px bg-slate-100 w-full my-6"></div>
            </div>

            {/* Footer Section: Sale By, Account Details, Totals */}
            <div className="grid grid-cols-2 gap-8 relative z-10">
                {/* Left Column */}
                <div className="space-y-8">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-600">
                            Sale by: <span className="font-bold text-slate-800">{(document as any).staffName || 'Admin'}</span>
                        </p>
                    </div>

                    {/* Account Details - Only show on Invoice or if specifically requested */}
                    {(type === 'INVOICE' || type === 'RECEIPT') && tenant.bankDetails && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-700">Account Details</h4>
                            <div className="text-sm font-medium text-slate-500 space-y-0.5">
                                <p>Bank: <span className="text-slate-700">{tenant.bankDetails.bankName}</span></p>
                                <p>Account Name: <span className="text-slate-700">{tenant.bankDetails.accountName}</span></p>
                                <p>Account Number: <span className="text-slate-700">{tenant.bankDetails.accountNumber}</span></p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Totals */}
                <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium text-slate-700">
                        <span>Subtotal:</span>
                        <span className="font-bold">{formatCurrency(subtotal, currency)}</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-sm font-medium text-slate-700">
                            <span>Discount:</span>
                            <span className="font-bold">-{formatCurrency(discount, currency)}</span>
                        </div>
                    )}
                    <div className="h-px bg-slate-100 w-full my-2"></div>
                    <div className="flex justify-between text-lg font-bold text-slate-900">
                        <span>Total:</span>
                        <span>{formatCurrency(total, currency)}</span>
                    </div>

                    <div className="flex justify-between text-sm font-medium text-slate-700 pt-2">
                        <span>Amount Paid:</span>
                        <span className="font-bold">{formatCurrency(amountPaid, currency)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-teal-700 pt-2">
                        <span>Balance Due:</span>
                        <span>{formatCurrency(balanceDue, currency)}</span>
                    </div>

                    <div className="text-right pt-4">
                        {type === 'INVOICE' ? (
                            <span className="text-amber-500 font-bold text-sm uppercase tracking-wide">Unpaid</span>
                        ) : (
                            <span className="text-emerald-500 font-bold text-sm uppercase tracking-wide">Paid</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-16 text-center">
                <p className="text-xs font-medium text-slate-400">Thank you for your business!</p>
            </div>
        </div>
    );
};
