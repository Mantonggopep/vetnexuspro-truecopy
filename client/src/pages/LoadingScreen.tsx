
import React from 'react';
import { Activity } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-teal-500/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse"></div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 bg-slate-800 rounded-3xl shadow-2xl flex items-center justify-center mb-8 relative border border-slate-700/50">
           <Activity className="w-10 h-10 text-teal-400 animate-bounce-small" />
           <div className="absolute -right-2 -top-2 w-4 h-4 bg-indigo-500 rounded-full animate-ping"></div>
        </div>
        
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">VET NEXUS</h1>
        <p className="text-slate-400 text-sm font-medium tracking-wider uppercase mb-8">Initializing System</p>

        {/* Custom Progress Bar */}
        <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
           <div className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 w-1/3 animate-slide-up rounded-full" style={{ width: '60%', animation: 'pulse 2s infinite' }}></div>
        </div>
        
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-mono">
           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
           Syncing data...
        </div>
      </div>
    </div>
  );
};
