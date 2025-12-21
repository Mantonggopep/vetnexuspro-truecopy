
import React, { useState } from 'react';
import { Layout, Stethoscope, UserCircle, ArrowRight, Lock, Mail, ChevronLeft, Send, CheckCircle } from 'lucide-react';
import { AppState } from '../types';

interface Props {
  state: AppState;
  onLogin: (email: string, pass: string) => void;
  onSwitchToSignup: () => void;
}

export const Login: React.FC<Props> = ({ state, onLogin, onSwitchToSignup }) => {
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'staff' | 'client'>('staff');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    
    try {
        // Attempt backend login first
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('vet_token', data.token);
            onLogin(email, password); 
        } else {
            const errData = await res.json();
            // Fallback for demo if backend is unavailable/mocked
            if (res.status === 404) {
               // Try local logic as fallback (demo mode)
               onLogin(email, password);
            } else {
               setError(errData.message || 'Login failed');
            }
        }
    } catch (e) {
        console.warn("Backend unavailable, using local logic");
        try {
            onLogin(email, password);
        } catch(localErr) {
            setError('Connection failed. Please check credentials.');
        }
    } finally {
        setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) {
          setError('Please enter your email address.');
          return;
      }
      setLoading(true);
      setError('');

      try {
          const res = await fetch('/api/auth/forgot-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
          });
          
          if (res.ok) {
              setResetSent(true);
          } else {
              const data = await res.json();
              setError(data.message || "Failed to send reset link.");
          }
      } catch (err) {
          // Simulate success for offline demo
          setTimeout(() => setResetSent(true), 1000);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-slate-100 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Decorative Floating Blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[10%] right-[-5%] w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden relative z-10 transition-all duration-300 mx-auto">
        
        {/* Brand Header */}
        <div className="pt-8 px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-teal-600 to-emerald-500 rounded-2xl shadow-lg mb-4 text-white transform rotate-3 hover:rotate-0 transition-transform duration-300">
             <Layout className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">VET NEXUS</h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">Practice Management</p>
        </div>

        {view === 'login' ? (
            <>
                {/* User Type Switcher */}
                <div className="mt-6 mx-8 p-1.5 bg-slate-200/50 rounded-xl flex relative">
                <button 
                    onClick={() => setUserType('staff')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all z-10 ${userType === 'staff' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Stethoscope className="w-4 h-4" /> Staff
                </button>
                <button 
                    onClick={() => setUserType('client')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all z-10 ${userType === 'client' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <UserCircle className="w-4 h-4" /> Owner
                </button>
                </div>

                {/* Login Form */}
                <div className="p-8 pt-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-200 flex items-center gap-2 animate-fade-in">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> {error}
                    </div>
                    )}
                    
                    <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Email Address</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-teal-600 transition-colors" />
                        </div>
                        <input 
                        type="email" 
                        className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-teal-500 outline-none transition-all font-semibold text-slate-800 placeholder-slate-300"
                        placeholder={userType === 'staff' ? "vet@clinic.com" : "owner@email.com"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    </div>

                    <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Password</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-teal-600 transition-colors" />
                        </div>
                        <input 
                        type="password" 
                        className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-teal-500 outline-none transition-all font-semibold text-slate-800 placeholder-slate-300"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end">
                        <button type="button" onClick={() => { setView('forgot'); setError(''); }} className="text-[10px] font-bold text-teal-600 hover:text-teal-700 uppercase tracking-wide">Forgot Password?</button>
                    </div>
                    </div>

                    <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 group mt-2 border border-slate-900 disabled:opacity-70"
                    >
                    {loading ? 'Signing In...' : 'Sign In'} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-slate-200/60 text-center">
                    <button 
                    onClick={onSwitchToSignup}
                    className="text-teal-700 font-bold hover:text-teal-800 text-sm inline-flex items-center gap-1 group"
                    >
                    Start a new practice <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
                </div>
            </>
        ) : (
            <div className="p-8 animate-fade-in">
                {!resetSent ? (
                    <>
                        <button onClick={() => setView('login')} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 mb-6 text-sm font-medium transition-colors">
                            <ChevronLeft className="w-4 h-4" /> Back to Login
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Reset Password</h2>
                        <p className="text-sm text-slate-500 mb-6">Enter your email address and we'll send you a link to reset your password.</p>
                        
                        <form onSubmit={handleForgotPassword} className="space-y-6">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-200 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Email Address</label>
                                <input 
                                    type="email" 
                                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-teal-500 outline-none transition-all font-semibold text-slate-800"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl hover:bg-teal-700 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'} <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-small">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Check your inbox</h3>
                        <p className="text-sm text-slate-500 mb-8">
                            We've sent a password reset link to <strong>{email}</strong>. Please check your email to continue.
                        </p>
                        <button 
                            onClick={() => { setView('login'); setResetSent(false); }}
                            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800"
                        >
                            Return to Login
                        </button>
                    </div>
                )}
            </div>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="absolute bottom-6 text-center w-full">
        <p className="text-[10px] text-slate-500 font-medium">
          Demo: <span className="font-mono bg-white/50 px-1 rounded border border-white/50">admin@downtown.com</span> / <span className="font-mono bg-white/50 px-1 rounded border border-white/50">password</span>
        </p>
      </div>
    </div>
  );
};
