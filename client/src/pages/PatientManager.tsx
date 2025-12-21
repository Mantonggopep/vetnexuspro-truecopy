
import React, { useState } from 'react';
import { AppState, Patient, MedicalNote, PatientType, Attachment, Reminder } from '../types';
import {
  Plus, Search, FileText, Bot, X, Printer, Trash2, Archive, Camera, Upload, Paperclip, Calendar, CheckSquare,
  Square, ChevronLeft, PawPrint, Layers, HeartPulse, Building
} from 'lucide-react';
import { summarizeMedicalHistory } from '../services/geminiService';
import { toTitleCase, toSentenceCase } from '../utils/textUtils';

interface Props {
  state: AppState;
  dispatch: (action: any) => void;
}

export const PatientManager: React.FC<Props> = ({ state, dispatch }) => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'medical' | 'vitals' | 'attachments' | 'reminders'>('overview');
  const [newNote, setNewNote] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const [formData, setFormData] = useState<Partial<Patient>>({ type: 'Single', status: 'Active' });

  const currentTenant = state.tenants.find(t => t.id === state.currentTenantId);
  const currentBranch = state.branches.find(b => b.id === state.currentBranchId);

  const filteredPatients = state.patients
    .filter(p => p.tenantId === state.currentTenantId && p.branchId === state.currentBranchId && p.status !== 'Deceased')
    .filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.identificationTag?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleSavePatient = () => {
    if (!formData.name || !formData.ownerId) {
      alert("Name and Owner are required.");
      return;
    }

    const client = state.clients.find(c => c.id === formData.ownerId);

    const newPatient: Patient = {
      id: `p${Date.now()}`,
      name: toTitleCase(formData.name),
      type: formData.type as PatientType,
      species: toTitleCase(formData.species || 'Unknown'),
      breed: toTitleCase(formData.breed || 'Unknown'),
      sex: formData.sex || 'Unknown',
      age: formData.age || 'Unknown',
      ownerId: formData.ownerId,
      ownerName: client?.name || 'Unknown',
      identificationTag: formData.identificationTag || '',
      chipNumber: formData.chipNumber || '',
      tenantId: state.currentTenantId,
      branchId: state.currentBranchId,
      status: 'Active',
      notes: [],
      attachments: [],
      reminders: []
    };

    dispatch({ type: 'ADD_PATIENT', payload: newPatient });
    setShowAddForm(false);
    setFormData({ type: 'Single', status: 'Active' });
  };

  const handleAddNote = () => {
    if (!selectedPatient || !newNote.trim()) return;
    const note: MedicalNote = {
      id: `n${Date.now()}`,
      date: new Date().toISOString(),
      author: state.currentUser?.name || 'Unknown',
      content: toSentenceCase(newNote),
      isAddendum: false
    };
    dispatch({ type: 'ADD_MEDICAL_NOTE', payload: { patientId: selectedPatient.id, note } });
    setNewNote('');
    setSelectedPatient({ ...selectedPatient, notes: [...selectedPatient.notes, note] });
  };

  const handleDelete = () => {
    if (!selectedPatient) return;
    const hasInvoices = state.invoices.some(i => i.patientId === selectedPatient.id);
    if (hasInvoices) {
      alert("Cannot delete patient with existing financial records. Please Archive instead.");
      return;
    }
    const reason = prompt("Enter reason for deletion (Required for Audit Log):");
    if (!reason) return;

    dispatch({ type: 'DELETE_PATIENT', payload: { patientId: selectedPatient.id, reason } });
    setSelectedPatient(null);
  };

  const handleArchive = () => {
    if (!selectedPatient) return;
    const reason = prompt("Enter reason for archiving:");
    if (!reason) return;
    dispatch({ type: 'ARCHIVE_PATIENT', payload: { patientId: selectedPatient.id, reason } });
    setSelectedPatient(null);
  };

  const generateSummary = async () => {
    if (!selectedPatient) return;
    setIsGeneratingAi(true);
    setAiSummary(null);
    const summary = await summarizeMedicalHistory(selectedPatient);
    setAiSummary(summary);
    setIsGeneratingAi(false);
  };

  const handleFileUpload = () => {
    if (!selectedPatient) return;
    const fileType = prompt("Enter file type (LAB, XRAY, PHOTO, etc):")?.toUpperCase() || 'OTHER';
    const fileName = prompt("Enter description/name:");
    if (!fileName) return;

    const newAttachment: Attachment = {
      id: `att${Date.now()}`,
      type: fileType as any,
      title: fileName,
      date: new Date().toISOString(),
      url: '#'
    };

    dispatch({ type: 'ADD_ATTACHMENT', payload: { patientId: selectedPatient.id, attachment: newAttachment } });
    setSelectedPatient({ ...selectedPatient, attachments: [...selectedPatient.attachments, newAttachment] });
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 relative">
      <div className={`md:w-1/3 w-full bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col ${selectedPatient ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-700">Patient Registry</h2>
              <p className="text-xs text-slate-500 flex items-center gap-1"><Building className="w-3 h-3" /> {currentBranch?.name}</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, herd ID, tag..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredPatients.map(patient => (
            <div
              key={patient.id}
              onClick={() => { setSelectedPatient(patient); setActiveTab('overview'); setAiSummary(null); }}
              className={`p-3 rounded-lg cursor-pointer border-l-4 transition-all ${selectedPatient?.id === patient.id ? 'bg-teal-50 border-teal-500 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {patient.type === 'Herd' ? <Layers className="w-4 h-4 text-purple-500" /> : <PawPrint className="w-4 h-4 text-teal-500" />}
                  <h3 className="font-bold text-slate-700">{patient.name}</h3>
                </div>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${patient.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                  {patient.status}
                </span>
              </div>
              <div className="ml-6 text-xs text-slate-500">
                <p>{patient.species} • {patient.breed}</p>
                <p className="mt-1 flex items-center gap-1"><span className="text-slate-400">Owner:</span> {patient.ownerName}</p>
              </div>
            </div>
          ))}
          {filteredPatients.length === 0 && <div className="p-4 text-center text-slate-400 text-sm">No active patients found in this branch.</div>}
        </div>
      </div>

      <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden ${!selectedPatient ? 'hidden md:flex' : 'flex'}`}>
        {selectedPatient ? (
          <>
            <div className="md:hidden p-2 bg-slate-100 border-b border-slate-200 flex items-center">
              <button onClick={() => setSelectedPatient(null)} className="flex items-center gap-1 text-slate-600 font-medium">
                <ChevronLeft className="w-5 h-5" /> Back to List
              </button>
            </div>

            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start bg-slate-50/30 gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-sm ${selectedPatient.type === 'Herd' ? 'bg-purple-100 text-purple-600' : 'bg-teal-100 text-teal-600'}`}>
                  {selectedPatient.type === 'Herd' ? <Layers className="w-8 h-8" /> : (selectedPatient.name?.[0] || '?')}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 leading-tight">{selectedPatient.name}</h1>
                  <div className="flex flex-wrap gap-2 text-sm text-slate-500 mt-1">
                    <span className="font-medium text-slate-700">{selectedPatient.type}</span>
                    <span>•</span>
                    <span>{selectedPatient.species}</span>
                    <span>•</span>
                    <span>{selectedPatient.sex}</span>
                    <span>•</span>
                    <span>{selectedPatient.age} old</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    {selectedPatient.identificationTag && (
                      <div className="inline-block px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded font-mono">
                        ID: {selectedPatient.identificationTag}
                      </div>
                    )}
                    {selectedPatient.chipNumber && (
                      <div className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded font-mono border border-yellow-200">
                        Chip: {selectedPatient.chipNumber}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 self-end md:self-auto">
                <button onClick={generateSummary} className="p-2 bg-white border border-slate-200 rounded-lg text-indigo-600 hover:bg-indigo-50" title="AI Summary"><Bot className="w-5 h-5" /></button>
                <button onClick={() => window.print()} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50" title="Print History"><Printer className="w-5 h-5" /></button>
                <button onClick={handleArchive} className="p-2 bg-white border border-slate-200 rounded-lg text-amber-600 hover:bg-amber-50" title="Archive"><Archive className="w-5 h-5" /></button>
                <button onClick={handleDelete} className="p-2 bg-white border border-slate-200 rounded-lg text-red-600 hover:bg-red-50" title="Delete"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>

            {aiSummary && (
              <div className="mx-6 mt-6 p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl animate-fade-in relative">
                <div className="flex justify-between mb-2">
                  <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2"><Bot className="w-4 h-4" /> Smart Summary</h4>
                  <button onClick={() => setAiSummary(null)}><X className="w-4 h-4 text-indigo-400 hover:text-indigo-600" /></button>
                </div>
                <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
              </div>
            )}

            <div className="flex border-b border-slate-200 px-6 overflow-x-auto no-scrollbar gap-2">
              {[
                { id: 'overview', icon: FileText, label: 'Overview' },
                { id: 'medical', icon: HeartPulse, label: 'Medical Records' },
                { id: 'attachments', icon: Paperclip, label: 'Attachments' },
                { id: 'reminders', icon: Calendar, label: 'Reminders' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Ownership</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                        <span className="font-bold">{selectedPatient.ownerName?.[0] || '?'}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{selectedPatient.ownerName}</p>
                        <button className="text-xs text-teal-600 hover:underline">View Client Profile</button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Identity Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div><p className="text-xs text-slate-400">Species</p><p className="font-medium">{selectedPatient.species}</p></div>
                      <div><p className="text-xs text-slate-400">Breed</p><p className="font-medium">{selectedPatient.breed}</p></div>
                      <div><p className="text-xs text-slate-400">Sex</p><p className="font-medium">{selectedPatient.sex}</p></div>
                      <div><p className="text-xs text-slate-400">Age Group</p><p className="font-medium">{selectedPatient.age}</p></div>
                      <div><p className="text-xs text-slate-400">Tag/Chip</p><p className="font-medium">{selectedPatient.identificationTag || selectedPatient.chipNumber || 'N/A'}</p></div>
                      <div><p className="text-xs text-slate-400">Registered</p><p className="font-medium">2024</p></div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'medical' && (
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <label className="block text-sm font-medium text-slate-700 mb-2">New Clinical Entry</label>
                    <textarea
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                      rows={3}
                      placeholder="SOAP notes, observations, treatments..."
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                    />
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-slate-400">Records are append-only.</span>
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim()}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
                      >
                        Add Record
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6 pl-4">
                    {selectedPatient.notes.length === 0 ? (
                      <div className="text-center py-8 text-slate-400"><p>No medical history recorded.</p></div>
                    ) : (
                      selectedPatient.notes.map(note => (
                        <div key={note.id} className="relative pl-8 border-l-2 border-slate-200 pb-2">
                          <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-teal-50 border-2 border-teal-500"></div>
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-bold text-slate-700">{new Date(note.date).toLocaleString()}</span>
                              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{note.author}</span>
                            </div>
                            <p className="text-slate-600 text-sm whitespace-pre-wrap">{note.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'attachments' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Media & Files</h3>
                    <button onClick={handleFileUpload} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
                      <Upload className="w-4 h-4" /> Upload
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedPatient.attachments?.map(att => (
                      <div key={att.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                        <div className="h-20 bg-slate-50 rounded-lg flex items-center justify-center mb-2 mx-auto">
                          {att.type === 'PHOTO' ? <Camera className="w-8 h-8 text-slate-300" /> : <FileText className="w-8 h-8 text-slate-300" />}
                        </div>
                        <p className="font-medium text-sm text-slate-700 truncate">{att.title}</p>
                        <p className="text-xs text-slate-400">{new Date(att.date).toLocaleDateString()}</p>
                        <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500 mt-1 inline-block">{att.type}</span>
                      </div>
                    ))}
                    {(!selectedPatient.attachments || selectedPatient.attachments.length === 0) && (
                      <div className="col-span-full text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        <Paperclip className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>No attachments yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'reminders' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-slate-700">Health Reminders</h3>
                    <button className="text-sm text-teal-600 hover:underline font-medium">+ Add Reminder</button>
                  </div>
                  {selectedPatient.reminders?.map(rem => (
                    <div key={rem.id} className="flex items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <button className={`mr-4 ${rem.completed ? 'text-green-500' : 'text-slate-300 hover:text-teal-500'}`}>
                        {rem.completed ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                      </button>
                      <div className="flex-1">
                        <h4 className={`font-bold ${rem.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{rem.title}</h4>
                        <p className="text-xs text-slate-500">{rem.type} • Due: {new Date(rem.dueDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {(!selectedPatient.reminders || selectedPatient.reminders.length === 0) && (
                    <div className="text-center py-10 text-slate-400">
                      <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>No active reminders.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <PawPrint className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a patient or herd to view details</p>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Register New Patient</h2>
              <button onClick={() => setShowAddForm(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-500">Adding to branch: <strong>{currentBranch?.name}</strong></p>
              <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                <button
                  onClick={() => setFormData({ ...formData, type: 'Single' })}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${formData.type === 'Single' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}
                >Single Animal</button>
                <button
                  onClick={() => setFormData({ ...formData, type: 'Herd' })}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${formData.type === 'Herd' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}
                >Herd / Group</button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{formData.type === 'Herd' ? 'Herd Name / ID' : 'Patient Name'} *</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Owner *</label>
                <select
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  value={formData.ownerId || ''}
                  onChange={e => setFormData({ ...formData, ownerId: e.target.value })}
                >
                  <option value="">Select Owner</option>
                  {state.clients.filter(c => c.tenantId === state.currentTenantId).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Species</label>
                  <input
                    type="text"
                    placeholder={formData.type === 'Herd' ? 'e.g. Sheep, Goat' : 'e.g. Canine'}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    value={formData.species || ''}
                    onChange={e => setFormData({ ...formData, species: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Breed</label>
                  <input
                    type="text"
                    placeholder="e.g. Merino"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    value={formData.breed || ''}
                    onChange={e => setFormData({ ...formData, breed: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sex</label>
                  <select
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    value={formData.sex || ''}
                    onChange={e => setFormData({ ...formData, sex: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="Castrated">Castrated</option>
                    <option value="Spayed">Spayed</option>
                    <option value="Mixed">Mixed (Herd)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                  <input
                    type="text"
                    placeholder={formData.type === 'Herd' ? 'e.g. Mixed, Weaners' : 'e.g. 5 yrs'}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    value={formData.age || ''}
                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Identification Tag</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    value={formData.identificationTag || ''}
                    onChange={e => setFormData({ ...formData, identificationTag: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chip Number (Optional)</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    value={formData.chipNumber || ''}
                    onChange={e => setFormData({ ...formData, chipNumber: e.target.value })}
                    placeholder="Microchip #"
                  />
                </div>
              </div>

            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
              <button onClick={handleSavePatient} className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700">Save Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
