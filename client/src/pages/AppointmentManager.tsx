
import React, { useState } from 'react';
import { AppState, Appointment, ReminderChannel, AppointmentStatus } from '../types';
import { 
  Calendar as CalendarIcon, Clock, Plus, Search, 
  MapPin, User, Stethoscope, Printer, X, Check, AlertCircle, MessageSquare, Mail, Phone,
  Filter, MoreHorizontal, Bell, CheckCircle
} from 'lucide-react';

interface Props {
  state: AppState;
  dispatch: (action: any) => void;
}

export const AppointmentManager: React.FC<Props> = ({ state, dispatch }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);

  const [formData, setFormData] = useState<Partial<Appointment>>({
    visitType: 'Consultation',
    reminderChannels: ['Email']
  });
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState('');

  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('09:00');

  const filteredAppointments = state.appointments
    .filter(a => a.tenantId === state.currentTenantId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const todaysAppointments = filteredAppointments.filter(a => a.date.startsWith(selectedDate) && a.status !== 'Pending');
  const pendingRequests = filteredAppointments.filter(a => a.status === 'Pending');

  const handleSave = () => {
    if (!isWalkIn && (!formData.clientId)) {
      alert("Please select a registered client or enable Walk-in.");
      return;
    }
    if (isWalkIn && !walkInName) {
        alert("Please enter a name for the walk-in client.");
        return;
    }
    if (!formData.assignedStaffId) {
        alert("Please select a staff member.");
        return;
    }

    const client = isWalkIn ? null : state.clients.find(c => c.id === formData.clientId);
    const patient = isWalkIn ? null : state.patients.find(p => p.id === formData.patientId);
    const staff = state.users.find(u => u.id === formData.assignedStaffId);

    const fullDate = new Date(`${formDate}T${formTime}`).toISOString();

    const appointment: Appointment = {
      id: selectedApt ? selectedApt.id : `apt${Date.now()}`,
      clientId: client?.id, 
      clientName: isWalkIn ? `${walkInName} (Walk-in)` : (client?.name || 'Unknown'),
      patientId: patient?.id, 
      patientName: isWalkIn ? 'Unregistered' : (patient?.name || 'Unknown'),
      date: fullDate,
      visitType: formData.visitType || 'Consultation',
      assignedStaffId: formData.assignedStaffId!,
      assignedStaffName: staff?.name || 'Unknown',
      status: formData.status || 'Scheduled',
      reminderChannels: formData.reminderChannels || [],
      walkInDetails: isWalkIn ? walkInName : undefined,
      tenantId: state.currentTenantId,
      branchId: state.currentBranchId
    };

    if (selectedApt) {
      dispatch({ type: 'UPDATE_APPOINTMENT', payload: appointment });
    } else {
      dispatch({ type: 'ADD_APPOINTMENT', payload: appointment });
    }
    
    setShowAddForm(false);
    setSelectedApt(null);
    setIsWalkIn(false);
    setWalkInName('');
    setFormData({ visitType: 'Consultation', reminderChannels: ['Email'] });
  };

  const handleEdit = (apt: Appointment) => {
    setSelectedApt(apt);
    setFormData(apt);
    if (!apt.clientId) {
        setIsWalkIn(true);
        setWalkInName(apt.walkInDetails || apt.clientName.replace(' (Walk-in)', ''));
    } else {
        setIsWalkIn(false);
    }
    const d = new Date(apt.date);
    setFormDate(d.toISOString().split('T')[0]);
    setFormTime(d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}));
    setShowAddForm(true);
  };

  const handleStatusChange = (apt: Appointment, status: AppointmentStatus) => {
    dispatch({ type: 'UPDATE_APPOINTMENT', payload: { ...apt, status } });
  };

  const handlePrintSlip = (apt: Appointment) => {
    const w = window.open('', '_blank');
    if (w) {
        w.document.write(`
            <html>
            <head><title>Appointment Slip</title></head>
            <body style="font-family: sans-serif; padding: 20px;">
                <div style="text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px;">
                    <h1>${state.tenants.find(t => t.id === state.currentTenantId)?.name}</h1>
                    <p>APPOINTMENT SLIP</p>
                </div>
                <div style="margin-top: 20px;">
                    <p><strong>Date:</strong> ${new Date(apt.date).toLocaleString()}</p>
                    <p><strong>Client:</strong> ${apt.clientName}</p>
                    <p><strong>Patient:</strong> ${apt.patientName}</p>
                    <p><strong>Type:</strong> ${apt.visitType}</p>
                    <p><strong>Provider:</strong> ${apt.assignedStaffName}</p>
                </div>
            </body>
            </html>
        `);
        w.document.close();
        w.print();
    }
  };

  const toggleChannel = (channel: ReminderChannel) => {
    const current = formData.reminderChannels || [];
    if (current.includes(channel)) {
      setFormData({ ...formData, reminderChannels: current.filter(c => c !== channel) });
    } else {
      setFormData({ ...formData, reminderChannels: [...current, channel] });
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 relative">
      <div className="w-full md:w-80 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
           <div className="flex justify-between items-center mb-4">
               <h2 className="font-bold text-slate-700">Schedule</h2>
               <button 
                onClick={() => { setSelectedApt(null); setShowAddForm(true); setFormData({visitType: 'Consultation', reminderChannels: ['Email']}); setIsWalkIn(false); }}
                className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium shadow-sm"
               >
                 <Plus className="w-4 h-4" /> New
               </button>
           </div>
           
           <input 
             type="date" 
             className="w-full p-2 border border-slate-200 rounded-lg text-sm mb-4"
             value={selectedDate}
             onChange={(e) => setSelectedDate(e.target.value)}
           />

           <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="bg-white border border-slate-200 p-2 rounded-lg">
                  <span className="block font-bold text-lg text-teal-600">{todaysAppointments.length}</span>
                  <span className="text-slate-500 text-xs uppercase">Today</span>
              </div>
              <div className="bg-white border border-slate-200 p-2 rounded-lg">
                  <span className="block font-bold text-lg text-amber-600">{pendingRequests.length}</span>
                  <span className="text-slate-500 text-xs uppercase">Pending</span>
              </div>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2 hidden md:block">
           <h3 className="text-xs font-bold text-slate-400 uppercase px-2 mb-2">Requests ({pendingRequests.length})</h3>
           {pendingRequests.map(apt => (
               <div key={apt.id} className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-sm cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => handleEdit(apt)}>
                   <div className="flex justify-between font-bold text-amber-800">
                       <span>{new Date(apt.date).toLocaleDateString()}</span>
                       <span className="text-xs bg-white px-1.5 py-0.5 rounded border border-amber-200">Pending</span>
                   </div>
                   <p className="mt-1 font-medium text-amber-900">{apt.patientName} <span className="font-normal">({apt.clientName})</span></p>
                   <p className="text-xs text-amber-700 mt-0.5">{apt.visitType}</p>
               </div>
           ))}
           {pendingRequests.length === 0 && <p className="text-sm text-slate-400 px-2 italic">No pending requests.</p>}

           <h3 className="text-xs font-bold text-slate-400 uppercase px-2 mb-2 mt-4">On {new Date(selectedDate).toLocaleDateString()}</h3>
           {todaysAppointments.length === 0 && <p className="text-sm text-slate-400 px-2">No appointments.</p>}
           {todaysAppointments.map(apt => (
              <div key={apt.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                 <div className="flex justify-between font-bold text-slate-700">
                    <span>{new Date(apt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${apt.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : apt.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{apt.status}</span>
                 </div>
                 <p className="mt-1 font-medium">{apt.patientName} <span className="text-slate-400 font-normal">({apt.clientName})</span></p>
                 <p className="text-xs text-slate-500 mt-0.5">{apt.visitType} • {apt.assignedStaffName}</p>
              </div>
           ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
         <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
             <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-slate-800">
                  Appointments
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </h1>
             </div>
             <div className="flex gap-2">
                 <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}><Filter className="w-5 h-5" /></button>
                 <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-lg ${viewMode === 'calendar' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}><CalendarIcon className="w-5 h-5" /></button>
             </div>
         </div>

         <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30">
            {todaysAppointments.map(apt => (
               <div key={apt.id} className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                  <div className="bg-slate-50 p-4 flex flex-col justify-center items-center border-r border-slate-100 min-w-[100px]">
                      <span className="text-lg font-bold text-slate-700">{new Date(apt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <span className="text-xs text-slate-400 font-medium uppercase mt-1">Duration: 30m</span>
                  </div>

                  <div className="p-4 flex-1">
                      <div className="flex justify-between items-start mb-2">
                          <div>
                             <h3 className="font-bold text-lg text-slate-800">{apt.patientName}</h3>
                             <p className="text-sm text-slate-500 flex items-center gap-1"><User className="w-3 h-3" /> {apt.clientName}</p>
                          </div>
                          <div className="flex gap-2">
                             {apt.reminderChannels.includes('SMS') && <span title="SMS Enabled"><MessageSquare className="w-4 h-4 text-green-500" /></span>}
                             {apt.reminderChannels.includes('WhatsApp') && <div className="w-4 h-4 bg-green-500 rounded-full text-white flex items-center justify-center text-[8px] font-bold" title="WhatsApp Enabled">W</div>}
                             {apt.reminderChannels.includes('Email') && <span title="Email Enabled"><Mail className="w-4 h-4 text-blue-500" /></span>}
                             {apt.reminderChannels.includes('App Chat') && <span title="Push Notification Enabled"><Bell className="w-4 h-4 text-indigo-500" /></span>}
                          </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 mt-3">
                          <span className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded text-indigo-700 border border-indigo-100">
                             <Stethoscope className="w-3 h-3" /> {apt.visitType}
                          </span>
                          <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                             <User className="w-3 h-3" /> {apt.assignedStaffName}
                          </span>
                      </div>
                  </div>

                  <div className="p-4 border-t md:border-t-0 md:border-l border-slate-100 flex md:flex-col justify-end gap-2 bg-slate-50/50 min-w-[140px]">
                      {apt.status === 'Scheduled' && (
                        <>
                          <button onClick={() => handleStatusChange(apt, 'Completed')} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 justify-center">
                              <Check className="w-3 h-3" /> Complete
                          </button>
                          <button onClick={() => handleStatusChange(apt, 'Cancelled')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded text-xs font-medium hover:bg-slate-50 justify-center">
                              <X className="w-3 h-3" /> Cancel
                          </button>
                        </>
                      )}
                      {apt.status !== 'Scheduled' && (
                          <div className={`px-3 py-1.5 rounded text-xs font-bold text-center border ${
                            apt.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                          }`}>
                              {apt.status.toUpperCase()}
                          </div>
                      )}
                      
                      <div className="flex gap-2 justify-center mt-auto pt-2">
                          <button onClick={() => handleEdit(apt)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-white rounded border border-transparent hover:border-slate-200"><MoreHorizontal className="w-4 h-4" /></button>
                          <button onClick={() => handlePrintSlip(apt)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded border border-transparent hover:border-slate-200"><Printer className="w-4 h-4" /></button>
                      </div>
                  </div>
               </div>
            ))}
            {todaysAppointments.length === 0 && (
                <div className="text-center py-20 text-slate-400">
                    <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-medium text-slate-500">No appointments scheduled for this day.</h3>
                    <p className="text-sm">Select a different date or add a new appointment.</p>
                </div>
            )}
         </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-slate-800">{selectedApt ? 'Edit Appointment' : 'New Appointment'}</h2>
                 <button onClick={() => setShowAddForm(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
              </div>

              {selectedApt?.status === 'Pending' && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-amber-800 font-bold">
                          <AlertCircle className="w-5 h-5" /> Pending Client Request
                      </div>
                      <p className="text-sm text-amber-700">This appointment was requested by {selectedApt.clientName} via the portal. Review details and approve.</p>
                      <div className="flex gap-2">
                          <button 
                            onClick={() => { handleStatusChange(selectedApt, 'Scheduled'); setShowAddForm(false); }}
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2"
                          >
                              <CheckCircle className="w-4 h-4" /> Approve & Schedule
                          </button>
                          <button 
                            onClick={() => { handleStatusChange(selectedApt, 'Cancelled'); setShowAddForm(false); }}
                            className="flex-1 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 flex items-center justify-center gap-2"
                          >
                              <X className="w-4 h-4" /> Reject
                          </button>
                      </div>
                  </div>
              )}

              <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-2 bg-slate-50 p-2 rounded-lg">
                     <input type="checkbox" id="walkin" checked={isWalkIn} onChange={e => setIsWalkIn(e.target.checked)} className="w-4 h-4 text-teal-600" />
                     <label htmlFor="walkin" className="text-sm font-bold text-slate-700">Walk-in (Unregistered Client)</label>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                        {isWalkIn ? (
                            <input 
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                placeholder="Client Name"
                                value={walkInName}
                                onChange={e => setWalkInName(e.target.value)}
                            />
                        ) : (
                            <select 
                            className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm"
                            value={formData.clientId || ''}
                            onChange={e => setFormData({...formData, clientId: e.target.value})}
                            disabled={!!selectedApt}
                            >
                            <option value="">Select Client</option>
                            {state.clients.filter(c => c.tenantId === state.currentTenantId).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                            </select>
                        )}
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Patient</label>
                        {isWalkIn ? (
                            <input disabled className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50" value="Unregistered" />
                        ) : (
                            <select 
                            className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm"
                            value={formData.patientId || ''}
                            onChange={e => setFormData({...formData, patientId: e.target.value})}
                            disabled={!formData.clientId}
                            >
                            <option value="">Select Patient (Optional)</option>
                            {state.patients.filter(p => p.ownerId === formData.clientId).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                            </select>
                        )}
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                        <input 
                          type="date" 
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                          value={formDate}
                          onChange={e => setFormDate(e.target.value)}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Time *</label>
                        <input 
                          type="time" 
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                          value={formTime}
                          onChange={e => setFormTime(e.target.value)}
                        />
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Visit Type</label>
                        <select 
                           className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm"
                           value={formData.visitType}
                           onChange={e => setFormData({...formData, visitType: e.target.value})}
                        >
                           <option value="Consultation">Consultation</option>
                           <option value="Surgery">Surgery</option>
                           <option value="Vaccination">Vaccination</option>
                           <option value="Follow-up">Follow-up</option>
                           <option value="Farm Visit">Farm Visit</option>
                           <option value="Emergency">Emergency</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Staff *</label>
                        <select 
                           className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm"
                           value={formData.assignedStaffId || ''}
                           onChange={e => setFormData({...formData, assignedStaffId: e.target.value})}
                        >
                           <option value="">Select Staff</option>
                           {state.users.filter(u => u.tenantId === state.currentTenantId && u.role !== 'PET_OWNER').map(u => (
                              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                           ))}
                        </select>
                     </div>
                 </div>

                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                       <Clock className="w-4 h-4 text-teal-600" /> Automated Reminders
                    </label>
                    <p className="text-xs text-slate-500 mb-3">System will send alerts 24h before appointment.</p>
                    
                    <div className="flex flex-wrap gap-4">
                       <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={formData.reminderChannels?.includes('SMS')} onChange={() => toggleChannel('SMS')} />
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-slate-400" /> SMS</span>
                       </label>
                       <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={formData.reminderChannels?.includes('WhatsApp')} onChange={() => toggleChannel('WhatsApp')} />
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> WhatsApp</span>
                       </label>
                       <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={formData.reminderChannels?.includes('Email')} onChange={() => toggleChannel('Email')} />
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> Email</span>
                       </label>
                       <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={formData.reminderChannels?.includes('App Chat')} onChange={() => toggleChannel('App Chat')} />
                          <span className="flex items-center gap-1"><Bell className="w-3 h-3 text-slate-400" /> App Chat</span>
                       </label>
                    </div>
                 </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                 <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
                 <button onClick={handleSave} className="px-6 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700">
                    {selectedApt ? 'Update Appointment' : 'Schedule Appointment'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
