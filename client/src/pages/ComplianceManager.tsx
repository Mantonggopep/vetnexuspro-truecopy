
import React, { useState } from 'react';
import { AppState, InventoryItem, ConsultationService, Consultation } from '../types';
import { 
  ShieldCheck, FileText, Pill, AlertTriangle, Download, 
  Printer, Activity, Filter, Calendar, Search, ArrowLeft 
} from 'lucide-react';

interface Props {
  state: AppState;
  onNavigate: (view: string) => void;
}

export const ComplianceManager: React.FC<Props> = ({ state, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'antimicrobial' | 'audit' | 'logs'>('antimicrobial');
  const [auditDateStart, setAuditDateStart] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
  const [auditDateEnd, setAuditDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Antimicrobial Usage Analysis
  const drugItems = state.inventory.filter(i => 
    i.tenantId === state.currentTenantId && i.category === 'Drugs'
  );

  const drugUsages: { 
    id: string, 
    date: string, 
    drugName: string, 
    patientName: string, 
    vetName: string,
    isAntibiotic: boolean 
  }[] = [];

  state.consultations
    .filter(c => c.tenantId === state.currentTenantId)
    .forEach(c => {
      c.services.forEach(s => {
        if (s.type === 'DRUG') {
          const lowerName = s.name.toLowerCase();
          const isAntibiotic = lowerName.includes('cillin') || lowerName.includes('mycin') || lowerName.includes('anti') || lowerName.includes('biotic');
          
          drugUsages.push({
            id: s.id,
            date: c.date,
            drugName: s.name,
            patientName: c.patientName,
            vetName: c.vetName,
            isAntibiotic
          });
        }
      });
    });

  const antibioticUsages = drugUsages.filter(u => u.isAntibiotic).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 2. Audit Logs Filtering
  const filteredAuditLogs = state.logs
    .filter(l => 
        l.tenantId === state.currentTenantId && 
        l.timestamp >= new Date(auditDateStart).toISOString() && 
        l.timestamp <= new Date(auditDateEnd + 'T23:59:59').toISOString()
    )
    .filter(l => 
        searchTerm === '' ||
        l.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.details.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <button onClick={() => onNavigate('settings')} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <ShieldCheck className="w-6 h-6 text-teal-600" />
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Compliance & Regulatory</h2>
                    <p className="text-xs text-slate-500">Track regulated substances and system audit trails.</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50 font-medium">
                    <Printer className="w-4 h-4" /> Print Report
                </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
            <button 
                onClick={() => setActiveTab('antimicrobial')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'antimicrobial' ? 'border-teal-600 text-teal-600 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Antimicrobial Usage
            </button>
            <button 
                onClick={() => setActiveTab('audit')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'audit' ? 'border-teal-600 text-teal-600 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                System Audit Logs
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
            {activeTab === 'antimicrobial' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-orange-800">Regulatory Notice</h3>
                            <p className="text-sm text-orange-700">Tracking usage of critical antimicrobials is mandatory. Ensure all dispensations are linked to a patient and diagnosis.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="text-slate-500 text-sm font-bold uppercase mb-2">Total Prescriptions</h4>
                            <p className="text-3xl font-bold text-slate-800">{antibioticUsages.length}</p>
                            <p className="text-xs text-slate-400 mt-1">Identified antibiotics dispensed</p>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 font-medium text-slate-500">Date</th>
                                    <th className="p-4 font-medium text-slate-500">Drug Name</th>
                                    <th className="p-4 font-medium text-slate-500">Patient</th>
                                    <th className="p-4 font-medium text-slate-500">Prescriber</th>
                                    <th className="p-4 font-medium text-slate-500">Classification</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {antibioticUsages
                                    .filter(u => u.drugName.toLowerCase().includes(searchTerm.toLowerCase()) || u.patientName.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((usage, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-600">{new Date(usage.date).toLocaleDateString()}</td>
                                        <td className="p-4 font-bold text-slate-800">{usage.drugName}</td>
                                        <td className="p-4 text-slate-600">{usage.patientName}</td>
                                        <td className="p-4 text-slate-600">{usage.vetName}</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-bold border border-red-100">
                                                <Pill className="w-3 h-3" /> Antimicrobial
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {activeTab === 'audit' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-wrap gap-4 items-end bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Search Logs</label>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <input 
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
                                    placeholder="Search user, action or details..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                            <input 
                                type="date" 
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                value={auditDateStart}
                                onChange={e => setAuditDateStart(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                            <input 
                                type="date" 
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                value={auditDateEnd}
                                onChange={e => setAuditDateEnd(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 font-medium text-slate-500">Timestamp</th>
                                    <th className="p-4 font-medium text-slate-500">User</th>
                                    <th className="p-4 font-medium text-slate-500">Action</th>
                                    <th className="p-4 font-medium text-slate-500">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAuditLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-400">No logs found matching criteria.</td>
                                    </tr>
                                ) : (
                                    filteredAuditLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50">
                                            <td className="p-4 text-slate-600 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="p-4 font-medium text-slate-800">{log.userName}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-slate-100 rounded text-xs border border-slate-200 font-mono text-slate-600">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-600">{log.details}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
