
import React, { useState } from 'react';
import { AppState, LabRequest, LabStatus } from '../types';
import { TestTube, Plus, Search, Filter, Printer, Edit2, CheckCircle, Clock } from 'lucide-react';
import { toTitleCase, toSentenceCase } from '../utils/textUtils';

interface Props {
    state: AppState;
    dispatch: (action: any) => void;
}

export const LabManager: React.FC<Props> = ({ state, dispatch }) => {
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
    const [selectedLab, setSelectedLab] = useState<LabRequest | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState<Partial<LabRequest>>({});

    const filteredLabs = state.labRequests
        .filter(l => l.tenantId === state.currentTenantId && l.branchId === state.currentBranchId)
        .filter(l =>
            (activeTab === 'pending' ? l.status !== 'COMPLETED' : l.status === 'COMPLETED') &&
            (l.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || l.testName.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

    const handleCreateNew = () => {
        setSelectedLab(null);
        setFormData({ status: 'REQUESTED', priority: 'ROUTINE', requestDate: new Date().toISOString() });
        setShowForm(true);
    };

    const handleEdit = (lab: LabRequest) => {
        setSelectedLab(lab);
        setFormData(lab);
        setShowForm(true);
    };

    const handleSave = () => {
        if (!formData.patientId || !formData.testName) {
            alert("Patient and Test Name are required.");
            return;
        }

        const patient = state.patients.find(p => p.id === formData.patientId);

        const labRequest: LabRequest = {
            id: selectedLab ? selectedLab.id : `lab${Date.now()}`,
            patientId: formData.patientId,
            patientName: patient?.name || 'Unknown',
            testName: toTitleCase(formData.testName),
            priority: formData.priority || 'ROUTINE',
            requestDate: formData.requestDate || new Date().toISOString(),
            notes: toSentenceCase(formData.notes || ''),
            status: formData.status || 'REQUESTED',
            resultFindings: toSentenceCase(formData.resultFindings || ''),
            resultInterpretation: toSentenceCase(formData.resultInterpretation || ''),
            resultDate: formData.status === 'COMPLETED' ? (formData.resultDate || new Date().toISOString()) : undefined,
            tenantId: state.currentTenantId,
            branchId: state.currentBranchId
        };

        if (selectedLab) {
            dispatch({ type: 'UPDATE_LAB_REQUEST', payload: labRequest });
        } else {
            dispatch({ type: 'ADD_LAB_REQUEST', payload: labRequest });
        }
        setShowForm(false);
    };

    const handlePrint = (lab: LabRequest) => {
        const tenant = state.tenants.find(t => t.id === lab.tenantId);
        const branch = state.branches.find(b => b.id === lab.branchId);
        if (!tenant) return;

        const w = window.open('', '_blank');
        if (w) {
            w.document.write(`
            <html>
                <head>
                    <title>Lab Report - ${lab.patientName}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 0; margin: 0; background-color: #f8fafc; color: #1e293b; }
                        .report-container { background: white; max-width: 800px; margin: 40px auto; padding: 60px; min-h-screen; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                        .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 40px; margin-bottom: 40px; }
                        .clinic-name { color: #0d9488; font-size: 28px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: -0.025em; }
                        .clinic-info { color: #64748b; font-size: 14px; margin-top: 8px; font-weight: 500; }
                        .report-title { text-align: center; margin-bottom: 40px; }
                        .report-title h2 { text-transform: uppercase; font-size: 20px; font-weight: 900; letter-spacing: 0.2em; color: #0f172a; margin: 0; }
                        .report-title .accent { width: 60px; h: 4px; background: #0d9488; margin: 12px auto; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; background: #f8fafc; padding: 30px; border-radius: 16px; border: 1px solid #f1f5f9; margin-bottom: 40px; }
                        .info-label { font-size: 10px; font-weight: 800; color: #0d9488; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
                        .info-value { font-size: 16px; font-weight: 700; color: #0f172a; }
                        .info-sub { font-size: 12px; color: #64748b; font-weight: 500; }
                        .section-title { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
                        .notes-box { background: white; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9; font-size: 14px; line-height: 1.6; color: #334155; font-style: italic; margin-bottom: 30px; }
                        .results-box { background: #0f172a; color: #f8fafc; padding: 30px; border-radius: 16px; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.7; white-space: pre-wrap; margin-bottom: 30px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
                        .interpretation { border-top: 1px solid #f1f5f9; pt: 30px; margin-top: 30px; }
                        .footer { margin-top: 60px; border-top: 1px solid #f1f5f9; pt: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                        .signature-line { width: 200px; height: 1px; background: #e2e8f0; margin: 30px 0 8px 0; }
                        @media print {
                            body { background: white; }
                            .report-container { margin: 0; box-shadow: none; width: 100%; max-width: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="report-container">
                        <div class="header">
                            <h1 class="clinic-name">${tenant.name}</h1>
                            <p class="clinic-info">${branch?.address || tenant.address}</p>
                            <p class="clinic-info">${branch?.phone || '09018492795'} | ${tenant.name.toLowerCase().replace(/\s/g, '')}@vetnexus.com</p>
                        </div>

                        <div class="report-title">
                            <h2>Laboratory Report</h2>
                            <div class="accent"></div>
                        </div>

                        <div class="info-grid">
                            <div>
                                <div class="info-label">Patient Details</div>
                                <div class="info-value">${lab.patientName}</div>
                                <div class="info-sub">ID: ${lab.patientId.substring(0, 8).toUpperCase()}</div>
                            </div>
                            <div style="text-align: right;">
                                <div class="info-label">Report Tokens</div>
                                <div class="info-value">LAB-${lab.id.substring(0, 6).toUpperCase()}</div>
                                <div class="info-sub">Date: ${new Date(lab.requestDate).toLocaleDateString()}</div>
                                <div class="info-sub" style="font-weight: 800; color: #0d9488;">PRIORITY: ${lab.priority}</div>
                            </div>
                        </div>

                        <div class="section-title">Test: ${lab.testName}</div>
                        
                        <div class="info-label" style="margin-bottom: 8px; color: #94a3b8;">Clinical Notes / History</div>
                        <div class="notes-box">${lab.notes || 'No clinical notes provided.'}</div>

                        <div class="info-label" style="margin-bottom: 8px; color: #94a3b8;">Results & Findings</div>
                        <div class="results-box">${lab.status === 'COMPLETED' ? lab.resultFindings : 'LABORATORY RESULTS PENDING'}</div>

                        ${lab.resultInterpretation ? `
                            <div class="interpretation">
                                <div class="info-label" style="margin-bottom: 8px; color: #94a3b8;">Medical Interpretation</div>
                                <div style="font-size: 14px; font-weight: 500; line-height: 1.6;">${lab.resultInterpretation}</div>
                            </div>
                        ` : ''}

                        <div class="footer">
                            <div>
                                <div class="info-label" style="margin-bottom: 30px;">Authorized Signatory</div>
                                <div class="signature-line"></div>
                                <div style="font-size: 14px; font-weight: 700;">Dr. ${tenant.name} Team</div>
                                <div style="font-size: 12px; color: #94a3b8;">Veterinary Pathologist</div>
                            </div>
                            <div style="text-align: right; display: flex; flex-direction: column; justify-content: flex-end;">
                                <p style="font-size: 11px; color: #94a3b8; font-style: italic;">This report is electronically generated and remains valid without a physical signature.</p>
                                <p style="font-size: 10px; font-weight: 800; color: #0d9488; text-transform: uppercase; letter-spacing: 0.1em;">VetNexus Pro Diagnostic Services</p>
                            </div>
                        </div>
                    </div>
                    <script>
                        window.onload = () => {
                            window.print();
                            // window.close();
                        };
                    </script>
                </body>
            </html>
          `);
            w.document.close();
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex gap-6">
            <div className={`w-full md:w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col ${showForm ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-slate-700">Lab Requests</h2>
                        <button onClick={handleCreateNew} className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm"><Plus className="w-5 h-5" /></button>
                    </div>
                    <div className="flex gap-2 mb-3">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${activeTab === 'pending' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
                        >Pending</button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${activeTab === 'completed' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
                        >Results</button>
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredLabs.map(l => (
                        <div
                            key={l.id}
                            onClick={() => { setSelectedLab(l); setShowForm(false); }}
                            className={`p-3 rounded-lg cursor-pointer border-l-4 transition-all ${selectedLab?.id === l.id ? 'bg-teal-50 border-teal-500 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-700">{l.patientName}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${l.priority === 'STAT' ? 'bg-red-100 text-red-600' :
                                    l.priority === 'URGENT' ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'
                                    }`}>{l.priority}</span>
                            </div>
                            <p className="text-sm text-slate-600 font-medium">{l.testName}</p>
                            <div className="flex justify-between mt-2 text-xs text-slate-400">
                                <span>{new Date(l.requestDate).toLocaleDateString()}</span>
                                <span className={`font-medium ${l.status === 'COMPLETED' ? 'text-green-600' : 'text-slate-500'}`}>{l.status}</span>
                            </div>
                        </div>
                    ))}
                    {filteredLabs.length === 0 && <p className="text-center text-sm text-slate-400 py-6">No records found.</p>}
                </div>
            </div>

            <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${!showForm && !selectedLab ? 'hidden md:flex' : 'flex'}`}>
                {showForm ? (
                    <div className="flex-1 overflow-y-auto p-8 animate-fade-in">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">{selectedLab ? 'Update Lab Request' : 'New Lab Request'}</h2>
                        <div className="space-y-6 max-w-2xl">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Patient</label>
                                    <select
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                        value={formData.patientId || ''}
                                        onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                                        disabled={!!selectedLab}
                                    >
                                        <option value="">Select Patient</option>
                                        {state.patients.filter(p => p.tenantId === state.currentTenantId && p.status === 'Active').map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.ownerName})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                                    <select
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                                    >
                                        <option value="ROUTINE">Routine</option>
                                        <option value="URGENT">Urgent</option>
                                        <option value="STAT">STAT (Immediate)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Test Name</label>
                                <input
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                    placeholder="e.g. CBC, Urinalysis"
                                    value={formData.testName || ''}
                                    onChange={e => setFormData({ ...formData, testName: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Clinical Notes</label>
                                <textarea
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                    rows={3}
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <TestTube className="w-4 h-4 text-teal-600" /> Results & Findings
                                </h3>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                    <select
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="REQUESTED">Requested</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>

                                {formData.status === 'COMPLETED' && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Findings (Data)</label>
                                            <textarea
                                                className="w-full p-2 border border-slate-200 rounded-lg font-mono text-sm"
                                                rows={4}
                                                placeholder="Enter values or text..."
                                                value={formData.resultFindings || ''}
                                                onChange={e => setFormData({ ...formData, resultFindings: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Interpretation</label>
                                            <textarea
                                                className="w-full p-2 border border-slate-200 rounded-lg"
                                                rows={2}
                                                placeholder="Doctor's interpretation..."
                                                value={formData.resultInterpretation || ''}
                                                onChange={e => setFormData({ ...formData, resultInterpretation: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => { setShowForm(false); setSelectedLab(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                                <button onClick={handleSave} className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700">Save Record</button>
                            </div>
                        </div>
                    </div>
                ) : selectedLab ? (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-slate-800">{selectedLab.testName}</h1>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${selectedLab.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{selectedLab.status}</span>
                                </div>
                                <p className="text-slate-500 mt-1">Patient: <strong>{selectedLab.patientName}</strong></p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handlePrint(selectedLab)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"><Printer className="w-5 h-5" /></button>
                                <button onClick={() => handleEdit(selectedLab)} className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"><Edit2 className="w-5 h-5" /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> Request Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><p className="text-slate-400">Date Requested</p><p className="font-medium">{new Date(selectedLab.requestDate).toLocaleString()}</p></div>
                                    <div><p className="text-slate-400">Priority</p><p className="font-medium">{selectedLab.priority}</p></div>
                                    <div className="col-span-2"><p className="text-slate-400">Notes</p><p className="font-medium">{selectedLab.notes}</p></div>
                                </div>
                            </div>

                            {selectedLab.status === 'COMPLETED' ? (
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-teal-500">
                                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-teal-600" /> Results</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Findings</p>
                                            <div className="bg-slate-50 p-4 rounded-lg font-mono text-sm border border-slate-200">{selectedLab.resultFindings}</div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Interpretation</p>
                                            <p className="text-slate-700">{selectedLab.resultInterpretation}</p>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-4 text-right">Result Date: {selectedLab.resultDate && new Date(selectedLab.resultDate).toLocaleString()}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center text-slate-400">
                                    <TestTube className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Results pending. Update status to 'Completed' to enter findings.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <TestTube className="w-16 h-16 mb-4 opacity-20" />
                        <p>Select a lab request to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
};
