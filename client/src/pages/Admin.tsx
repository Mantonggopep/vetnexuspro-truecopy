
import React from 'react';
import { AppState } from '../types';
import { ShieldCheck, History, Lock, ArrowLeft } from 'lucide-react';

interface Props {
  state: AppState;
  onNavigate: (view: string) => void;
}

export const Admin: React.FC<Props> = ({ state, onNavigate }) => {
  const currentTenant = state.tenants.find(t => t.id === state.currentTenantId);
  const logsEnabled = currentTenant?.features.logsEnabled;

  const tenantLogs = state.logs
    .filter(l => l.tenantId === state.currentTenantId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (!logsEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-8">
        <div className="p-6 bg-slate-100 rounded-full mb-6">
          <Lock className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-700 mb-2">Audit Logs Restricted</h2>
        <p className="text-slate-500 max-w-md mb-6">
          Detailed audit logging and activity tracking are available on the Standard and Premium plans.
        </p>
        <button className="px-6 py-3 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition-colors">
          Upgrade Plan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 flex-shrink-0">
        <ShieldCheck className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <h3 className="font-bold text-amber-800">Admin Area Restricted</h3>
          <p className="text-sm text-amber-700">All actions below are monitored. Logs are immutable.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
           <button onClick={() => onNavigate('settings')} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                <ArrowLeft className="w-5 h-5" />
           </button>
           <History className="w-5 h-5 text-slate-400" />
           <h3 className="font-semibold text-slate-700">Audit Log</h3>
        </div>
        
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-3 font-medium text-slate-500">Timestamp</th>
                <th className="p-3 font-medium text-slate-500">User</th>
                <th className="p-3 font-medium text-slate-500">Action</th>
                <th className="p-3 font-medium text-slate-500">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenantLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-3 font-medium text-slate-700">{log.userName}</td>
                  <td className="p-3">
                     <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200 text-xs font-mono">
                        {log.action}
                     </span>
                  </td>
                  <td className="p-3 text-slate-600 max-w-xs truncate" title={log.details}>{log.details}</td>
                </tr>
              ))}
              {tenantLogs.length === 0 && (
                <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">No activity recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
