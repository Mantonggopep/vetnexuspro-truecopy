import React, { useState } from 'react';
import { AppState, Consultation, ConsultationService, Patient, Invoice, InvoiceStatus, Service, Appointment } from '../types';
import { generateDiagnosisSuggestion } from '../services/geminiService';
import {
    Stethoscope, Plus, Save, Bot, FileText, DollarSign, Printer, ChevronRight,
    Search, AlertCircle, Syringe, TestTube, Activity, ArrowRight, Calendar, Clock, Sparkles
} from 'lucide-react';
import { toTitleCase, toSentenceCase } from '../utils/textUtils';

interface Props {
    state: AppState;
    dispatch: (action: any) => void;
}

export const ConsultationManager: React.FC<Props> = ({ state, dispatch }) => {
    const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showNewForm, setShowNewForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState<Partial<Consultation>>({
        services: [],
        vitals: {}
    });
    const [aiLoading, setAiLoading] = useState(false);
    const [aiDiagnoses, setAiDiagnoses] = useState<any[]>([]);

    const [serviceSearch, setServiceSearch] = useState('');
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);

    const filteredConsultations = state.consultations
        .filter(c => c.tenantId === state.currentTenantId)
        .filter(c => c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || c.vetName.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const availableServices = state.services
        .filter(s => s.tenantId === state.currentTenantId && s.isActive)
        .filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()) || s.category.toLowerCase().includes(serviceSearch.toLowerCase()))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10);

    const currentTenant = state.tenants.find(t => t.id === state.currentTenantId);

    const handleStartNew = () => {
        setSelectedConsultation(null);
        setFormData({
            date: new Date().toISOString(),
            vetId: state.currentUser?.id,
            vetName: state.currentUser?.name,
            services: [],
            vitals: {}
        });
        setAiDiagnoses([]);
        setShowNewForm(true);
        setIsEditing(true);
    };

    const handleEdit = (consultation: Consultation) => {
        setSelectedConsultation(consultation);
        setFormData(consultation);
        try {
            if (consultation.aiDiagnosisSuggestion && consultation.aiDiagnosisSuggestion.startsWith('[')) {
                setAiDiagnoses(JSON.parse(consultation.aiDiagnosisSuggestion));
            } else {
                setAiDiagnoses([]);
            }
        } catch (e) { setAiDiagnoses([]); }
        setShowNewForm(true);
        setIsEditing(true);
    };

    const handleGenerateAI = async () => {
        if (!formData.patientId || !formData.subjective || !formData.objective) {
            alert("Please select a patient and fill in Subjective & Objective sections.");
            return;
        }
        const patient = state.patients.find(p => p.id === formData.patientId);
        if (!patient) return;

        setAiLoading(true);

        const suggestionsJSON = await generateDiagnosisSuggestion(
            patient.species,
            patient.age,
            formData.subjective,
            formData.objective,
            formData.vitals,
            currentTenant?.country || 'United States'
        );

        try {
            const diagnoses = JSON.parse(suggestionsJSON);
            setAiDiagnoses(diagnoses);
            setFormData(prev => ({ ...prev, aiDiagnosisSuggestion: suggestionsJSON }));
        } catch (e) {
            console.error("Failed to parse AI response", e);
            alert("AI response format error. Please try again.");
        }

        setAiLoading(false);
    };

    const handleSelectService = (service: Service) => {
        const newSrv: ConsultationService = {
            id: `s${Date.now()}`,
            type: 'SERVICE',
            name: service.name,
            cost: service.priceClient
        };
        setFormData(prev => ({ ...prev, services: [...(prev.services || []), newSrv] }));
        setServiceSearch('');
        setShowServiceDropdown(false);
    };

    const handleRemoveService = (id: string) => {
        setFormData(prev => ({ ...prev, services: prev.services?.filter(s => s.id !== id) }));
    };

    const handleSave = (mode: 'DRAFT' | 'INVOICE' | 'RECEIPT') => {
        if (!formData.patientId || !formData.subjective) {
            alert("Patient and Subjective notes are required.");
            return;
        }

        const patient = state.patients.find(p => p.id === formData.patientId);
        const client = state.clients.find(c => c.id === patient?.ownerId);

        const consultation: Consultation = {
            id: selectedConsultation ? selectedConsultation.id : `cons${Date.now()}`,
            patientId: formData.patientId,
            patientName: toTitleCase(patient?.name || 'Unknown'),
            date: formData.date || new Date().toISOString(),
            vetId: formData.vetId || state.currentUser?.id || '',
            vetName: toTitleCase(formData.vetName || state.currentUser?.name || ''),
            subjective: toSentenceCase(formData.subjective || ''),
            objective: toSentenceCase(formData.objective || ''),
            assessment: toSentenceCase(formData.assessment || ''),
            plan: toSentenceCase(formData.plan || ''),
            vitals: formData.vitals,
            aiDiagnosisSuggestion: formData.aiDiagnosisSuggestion,
            services: formData.services || [],
            invoiceId: formData.invoiceId,
            status: mode === 'DRAFT' ? 'DRAFT' : 'COMPLETED',
            nextVisitDate: formData.nextVisitDate,
            tenantId: state.currentTenantId,
            branchId: state.currentBranchId
        };

        if (selectedConsultation) {
            dispatch({ type: 'UPDATE_CONSULTATION', payload: consultation });
        } else {
            dispatch({ type: 'ADD_CONSULTATION', payload: consultation });
        }

        if (consultation.nextVisitDate && client) {
            const newApt: Appointment = {
                id: `apt_fv_${Date.now()}`,
                clientId: client.id,
                clientName: client.name,
                patientId: patient?.id,
                patientName: patient?.name || 'Unknown',
                date: `${consultation.nextVisitDate}T09:00:00.000Z`,
                visitType: 'Follow-up',
                assignedStaffId: consultation.vetId,
                assignedStaffName: consultation.vetName,
                status: 'Scheduled',
                reminderChannels: ['SMS', 'Email', 'App Chat'],
                tenantId: state.currentTenantId,
                branchId: state.currentBranchId
            };
            dispatch({ type: 'ADD_APPOINTMENT', payload: newApt });
            alert(`Follow-up appointment auto-scheduled for ${consultation.nextVisitDate}`);
        }

        formData.services?.forEach(s => {
            if (s.type === 'LAB_REQUEST') {
                dispatch({
                    type: 'ADD_LAB_REQUEST',
                    payload: {
                        id: `lab${Date.now()}`,
                        patientId: consultation.patientId,
                        patientName: consultation.patientName,
                        testName: s.name,
                        priority: 'ROUTINE',
                        requestDate: new Date().toISOString(),
                        notes: 'Requested from consultation',
                        status: 'REQUESTED',
                        tenantId: state.currentTenantId,
                        branchId: state.currentBranchId
                    }
                });
            }
        });

        if (mode === 'INVOICE' || mode === 'RECEIPT') {
            if (consultation.services.length > 0) {
                const total = consultation.services.reduce((sum, s) => sum + s.cost, 0);
                const invoice: Invoice = {
                    id: `inv${Date.now()}`,
                    patientId: patient?.id || '',
                    patientName: patient?.name || '',
                    clientId: patient?.ownerId || '',
                    clientName: client?.name || 'Unknown',
                    date: new Date().toISOString(),
                    items: consultation.services.map(s => ({ description: s.name, cost: s.cost })),
                    total: total,
                    status: mode === 'RECEIPT' ? InvoiceStatus.PAID : InvoiceStatus.DRAFT,
                    tenantId: state.currentTenantId,
                    branchId: state.currentBranchId
                };
                dispatch({ type: 'ADD_INVOICE', payload: invoice });
                dispatch({ type: 'UPDATE_CONSULTATION', payload: { ...consultation, invoiceId: invoice.id } });

                if (mode === 'RECEIPT') {
                    alert("Invoice generated and marked as PAID. Ready to print receipt.");
                } else {
                    alert("Invoice generated.");
                }
            }
        }

        setShowNewForm(false);
        setIsEditing(false);
    };

    const printConsultation = (c: Consultation) => {
        window.print();
    };

    return (
        <div className="h-[calc(100vh-100px)] flex gap-6">
            <div className={`w-full md:w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col ${showNewForm ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-slate-700">Consultations</h2>
                        <button onClick={handleStartNew} className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm"><Plus className="w-5 h-5" /></button>
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="Search patient or vet..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredConsultations.map(c => (
                        <div
                            key={c.id}
                            onClick={() => { setSelectedConsultation(c); setShowNewForm(false); setIsEditing(false); }}
                            className={`p-3 rounded-lg cursor-pointer border-l-4 transition-all ${selectedConsultation?.id === c.id ? 'bg-teal-50 border-teal-500 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}
                        >
                            <div className="flex justify-between font-bold text-slate-700">
                                <span>{c.patientName}</span>
                                <span className="text-xs font-normal text-slate-500">{new Date(c.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">{c.assessment}</p>
                            <div className="flex justify-between items-center mt-1">
                                <p className="text-[10px] text-teal-600">{c.vetName}</p>
                                {c.status === 'DRAFT' && <span className="text-[10px] bg-slate-200 px-1 rounded text-slate-600">Draft</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${!showNewForm && !selectedConsultation ? 'hidden md:flex' : 'flex'}`}>
                {(showNewForm || isEditing) ? (
                    <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">{selectedConsultation ? 'Amend Consultation' : 'New Consultation'}</h2>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Patient</label>
                                    <select
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                        value={formData.patientId || ''}
                                        onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                                        disabled={!!selectedConsultation}
                                    >
                                        <option value="">Select Patient</option>
                                        {state.patients.filter(p => p.tenantId === state.currentTenantId && p.status === 'Active').map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.ownerName})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Veterinarian</label>
                                    <input type="text" readOnly className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50" value={formData.vetName} />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-teal-600" /> Vitals</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Weight</label>
                                        <input className="w-full p-2 border rounded-lg text-sm" placeholder="kg/lbs" value={formData.vitals?.weight || ''} onChange={e => setFormData({ ...formData, vitals: { ...formData.vitals, weight: e.target.value } })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Temp</label>
                                        <input className="w-full p-2 border rounded-lg text-sm" placeholder="°C / °F" value={formData.vitals?.temperature || ''} onChange={e => setFormData({ ...formData, vitals: { ...formData.vitals, temperature: e.target.value } })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Resp Rate</label>
                                        <input className="w-full p-2 border rounded-lg text-sm" placeholder="bpm" value={formData.vitals?.respiratoryRate || ''} onChange={e => setFormData({ ...formData, vitals: { ...formData.vitals, respiratoryRate: e.target.value } })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Mucus Memb</label>
                                        <input className="w-full p-2 border rounded-lg text-sm" placeholder="Color/Moist" value={formData.vitals?.mucusMembrane || ''} onChange={e => setFormData({ ...formData, vitals: { ...formData.vitals, mucusMembrane: e.target.value } })} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Stethoscope className="w-4 h-4 text-teal-600" /> Clinical Notes</h3>
                                        <textarea
                                            className="w-full p-3 border border-slate-200 rounded-lg mb-2 text-sm"
                                            rows={3}
                                            placeholder="Subjective (History, owner complaints...)"
                                            value={formData.subjective || ''}
                                            onChange={e => setFormData({ ...formData, subjective: e.target.value })}
                                        />
                                        <textarea
                                            className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                                            rows={3}
                                            placeholder="Objective (Exam findings...)"
                                            value={formData.objective || ''}
                                            onChange={e => setFormData({ ...formData, objective: e.target.value })}
                                        />
                                        <button
                                            onClick={handleGenerateAI}
                                            disabled={aiLoading}
                                            className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                                        >
                                            <Sparkles className="w-4 h-4" /> {aiLoading ? 'Analyzing Clinical Data...' : 'Generate AI Diagnosis'}
                                        </button>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-teal-600" /> Assessment & Plan</h3>

                                        {aiDiagnoses.length > 0 && (
                                            <div className="mb-4 p-3 bg-white border border-indigo-100 rounded-xl shadow-sm">
                                                <h4 className="text-xs font-bold text-indigo-800 mb-2 flex items-center gap-1">
                                                    <Bot className="w-3 h-3" /> AI Differential Diagnosis
                                                </h4>
                                                <div className="space-y-3">
                                                    {aiDiagnoses.map((diag, idx) => (
                                                        <div key={idx} className="relative">
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="font-bold text-slate-700">{diag.condition}</span>
                                                                <span className="font-mono text-indigo-600">{diag.probability}%</span>
                                                            </div>
                                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                                                                    style={{ width: `${diag.probability}%` }}
                                                                ></div>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{diag.reasoning}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <textarea
                                            className="w-full p-3 border border-slate-200 rounded-lg mb-2 text-sm"
                                            rows={2}
                                            placeholder="Assessment (Diagnosis)"
                                            value={formData.assessment || ''}
                                            onChange={e => setFormData({ ...formData, assessment: e.target.value })}
                                        />
                                        <textarea
                                            className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                                            rows={3}
                                            placeholder="Plan (Treatment, Rx, Follow-up)"
                                            value={formData.plan || ''}
                                            onChange={e => setFormData({ ...formData, plan: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Service Linking & Auto-Reschedule (Unchanged from previous logic, just rendered here) */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-full flex flex-col relative">
                                        <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4 text-teal-600" /> Linked Services</h3>
                                        <div className="flex-1 bg-white border border-slate-200 rounded-lg mb-3 p-2 overflow-y-auto max-h-[200px]">
                                            {formData.services?.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No services added.</p>}
                                            {formData.services?.map((s, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm p-2 border-b border-slate-50 last:border-0">
                                                    <span className="flex items-center gap-2">
                                                        {s.type === 'LAB_REQUEST' ? <TestTube className="w-3 h-3 text-purple-400" /> : <Activity className="w-3 h-3 text-blue-400" />}
                                                        {s.name}
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono">${s.cost}</span>
                                                        <button onClick={() => handleRemoveService(s.id)} className="text-red-400 hover:text-red-600">×</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="relative">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Add Service</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        className="w-full p-2 border rounded-lg text-sm pl-8"
                                                        placeholder="Search services..."
                                                        value={serviceSearch}
                                                        onChange={e => { setServiceSearch(e.target.value); setShowServiceDropdown(true); }}
                                                        onFocus={() => setShowServiceDropdown(true)}
                                                    />
                                                    <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-400" />
                                                </div>
                                            </div>

                                            {showServiceDropdown && (
                                                <div className="absolute bottom-full mb-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                                                    {availableServices.length === 0 ? (
                                                        <div className="p-3 text-xs text-slate-400 text-center">No services found.</div>
                                                    ) : (
                                                        availableServices.map(srv => (
                                                            <button
                                                                key={srv.id}
                                                                onClick={() => handleSelectService(srv)}
                                                                className="w-full text-left px-4 py-2 hover:bg-slate-50 flex justify-between items-center border-b border-slate-50 last:border-0"
                                                            >
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-700">{srv.name}</p>
                                                                    <p className="text-xs text-slate-400">{srv.category}</p>
                                                                </div>
                                                                <span className="text-sm font-bold text-teal-600">${srv.priceClient}</span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                        <h3 className="font-bold text-indigo-800 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" /> Next Scheduled Visit</h3>
                                        <input
                                            type="date"
                                            className="w-full p-2 border border-indigo-200 rounded-lg text-sm bg-white"
                                            value={formData.nextVisitDate || ''}
                                            onChange={e => setFormData({ ...formData, nextVisitDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100 flex-wrap">
                            <button onClick={() => { setShowNewForm(false); setIsEditing(false); }} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                            <button onClick={() => handleSave('DRAFT')} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300">Save Draft</button>
                            <button onClick={() => handleSave('INVOICE')} className="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 flex items-center gap-2">
                                <Save className="w-4 h-4" /> Save & Invoice
                            </button>
                            <button onClick={() => handleSave('RECEIPT')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" /> Save & Pay
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Stethoscope className="w-16 h-16 mb-4 opacity-20" />
                        <p>Select a consultation to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
};
