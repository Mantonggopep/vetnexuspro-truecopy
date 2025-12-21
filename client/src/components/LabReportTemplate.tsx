import React from 'react';
import { Tenant, LabRequest } from '../types';
import { Globe, Phone, Mail, TestTube, CheckCircle } from 'lucide-react';

interface Props {
    lab: LabRequest;
    tenant: Tenant;
    branchDetails?: {
        address: string;
        phone: string;
    }
}

export const LabReportTemplate: React.FC<Props> = ({ lab, tenant, branchDetails }) => {
    const email = `${tenant.name.toLowerCase().replace(/\s/g, '')}@vetnexus.com`;
    const address = branchDetails?.address || tenant.address;

    return (
        <div className="bg-white p-12 max-w-[800px] mx-auto min-h-[1100px] flex flex-col relative overflow-hidden font-sans text-slate-800 printable-document border border-slate-100 uppercase-headers">
            {/* Header: Centered Clinic Info */}
            <div className="flex flex-col items-center justify-center mb-16 text-center space-y-2 relative z-10 border-b border-slate-100 pb-8">
                <h1 className="text-3xl font-bold text-teal-700 tracking-tight">{tenant.name}</h1>
                <p className="text-sm font-medium text-slate-600 max-w-[400px] leading-relaxed">{address}</p>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                    <span>{email}</span>
                    <span>|</span>
                    <span>{branchDetails?.phone || '09018492795'}</span>
                </div>
            </div>

            {/* Document Title */}
            <div className="text-center mb-12">
                <h2 className="text-2xl font-black text-slate-900 tracking-[0.2em] uppercase">Laboratory Report</h2>
                <div className="w-24 h-1 bg-teal-600 mx-auto mt-2"></div>
            </div>

            {/* Patient & Request Info */}
            <div className="grid grid-cols-2 gap-12 mb-12 bg-slate-50 p-8 rounded-2xl border border-slate-100">
                <div className="space-y-4">
                    <div>
                        <h4 className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-1">Patient Details</h4>
                        <p className="font-bold text-lg text-slate-900">{lab.patientName}</p>
                        <p className="text-sm text-slate-500">ID: {lab.patientId.substring(0, 8).toUpperCase()}</p>
                    </div>
                </div>

                <div className="space-y-4 text-right">
                    <div>
                        <h4 className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-1">Request Details</h4>
                        <p className="text-sm font-bold text-slate-800">No #: LAB-{lab.id.substring(0, 6).toUpperCase()}</p>
                        <p className="text-sm font-medium text-slate-600">Date: {new Date(lab.requestDate).toLocaleDateString()}</p>
                        <p className="text-sm font-medium text-slate-600 font-bold uppercase tracking-tighter">Priority: {lab.priority}</p>
                    </div>
                </div>
            </div>

            {/* Test Info */}
            <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <TestTube className="w-6 h-6 text-teal-600" />
                    <h3 className="text-xl font-bold text-slate-800">{lab.testName}</h3>
                </div>

                <div className="space-y-8">
                    {/* Clinical Notes */}
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinical Notes / History</h4>
                        <p className="text-sm leading-relaxed text-slate-700 bg-white p-4 rounded-xl border border-slate-100 shadow-sm italic">
                            {lab.notes || 'No clinical notes provided.'}
                        </p>
                    </div>

                    {/* Findings */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-teal-600" /> Results & Findings
                        </h4>
                        <div className="bg-slate-900 text-slate-50 p-6 rounded-2xl font-mono text-sm shadow-xl leading-relaxed whitespace-pre-wrap min-h-[200px]">
                            {lab.status === 'COMPLETED' ? lab.resultFindings : 'LABORATORY RESULTS PENDING'}
                        </div>
                    </div>

                    {/* Interpretation */}
                    {lab.resultInterpretation && (
                        <div className="space-y-2 border-t border-slate-100 pt-8">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medical Interpretation</h4>
                            <p className="text-sm leading-relaxed text-slate-800 font-medium">
                                {lab.resultInterpretation}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-16 grid grid-cols-2 gap-8 border-t border-slate-100">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Authorized Signatory</p>
                    <div className="w-48 h-px bg-slate-300 mb-2"></div>
                    <p className="text-sm font-bold text-slate-900">Dr. {tenant.name} Team</p>
                    <p className="text-xs text-slate-500">Veterinary Pathologist</p>
                </div>
                <div className="text-right flex flex-col justify-end">
                    <p className="text-xs font-medium text-slate-400 italic">This report is electronically generated and remains valid without a physical signature.</p>
                    <p className="text-[10px] font-bold text-teal-600 mt-2 uppercase tracking-widest">VetNexus Pro Diagnostic Services</p>
                </div>
            </div>
        </div>
    );
};
