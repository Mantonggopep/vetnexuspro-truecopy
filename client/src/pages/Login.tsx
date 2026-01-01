
import React, { useState } from 'react';
import { Layout, Stethoscope, UserCircle, ArrowRight, Lock, Mail, ChevronLeft, Send, CheckCircle, Heart } from 'lucide-react';
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
            } catch (localErr) {
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
        <div className="min-h-screen bg-[#ecf0f3] flex items-center justify-center p-4 relative overflow-hidden font-sans">

            {/* Soft Animated Background Blobs */}
            <div className="absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-[80px] animate-blob"></div>
            <div className="absolute overflow-hidden top-[20%] right-[-10%] w-[35rem] h-[35rem] bg-teal-200/40 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-[-10%] left-[20%] w-[40rem] h-[40rem] bg-pink-200/40 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-4000"></div>

            {/* Main Glass/Neo Container */}
            <div className="w-full max-w-md soft-glass rounded-[2rem] shadow-2xl overflow-hidden relative z-10 transition-all duration-300 mx-auto">

                {/* Header */}
                <div className="pt-6 px-8 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-2xl shadow-lg mb-4 text-white transform rotate-3 hover:rotate-0 transition-transform duration-300 ring-4 ring-white/50">
                        <Layout className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Welcome Back</h1>
                    <p className="text-slate-500 text-sm font-medium">Manage your practice with joy.</p>
                </div>

                {view === 'login' ? (
                    <>
                        {/* User Type Switcher - Neumorphic Style */}
                        <div className="mt-4 mx-8 p-1.5 bg-[#ecf0f3] rounded-2xl flex relative shadow-inner">
                            <button
                                onClick={() => setUserType('staff')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-xl transition-all z-10 ${userType === 'staff' ? 'bg-white text-teal-700 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Stethoscope className="w-4 h-4" /> Staff
                            </button>
                            <button
                                onClick={() => setUserType('client')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-xl transition-all z-10 ${userType === 'client' ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <UserCircle className="w-4 h-4" /> Client
                            </button>
                        </div>

                        {/* Login Form */}
                        <div className="p-8 pt-4">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 flex items-center gap-3 animate-fade-in shadow-sm">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div> {error}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Email Address</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            className="neo-input w-full pl-12 pr-6 py-3 text-slate-700 font-semibold placeholder:text-slate-300 focus:text-slate-900"
                                            placeholder={userType === 'staff' ? "doctor@clinic.com" : "petowner@email.com"}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            className="neo-input w-full pl-12 pr-6 py-3 text-slate-700 font-semibold placeholder:text-slate-300 focus:text-slate-900"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pr-2 -mt-2 mb-2">
                                    <button type="button" onClick={() => { setView('forgot'); setError(''); }} className="text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline transition-all uppercase tracking-wider">Forgot Password?</button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-slate-800 text-white font-bold py-3 rounded-2xl hover:bg-slate-900 transition-all shadow-lg hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2 group mt-2 disabled:opacity-70 disabled:hover:translate-y-0"
                                >
                                    {loading ? 'Signing In...' : 'Sign In'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </form>

                            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">New to VetNexus?</p>
                                <button
                                    onClick={onSwitchToSignup}
                                    className="text-indigo-600 font-black hover:text-indigo-700 text-sm inline-flex items-center gap-2 group hover:underline decoration-2 underline-offset-4 transition-all"
                                >
                                    Create your clinic <Heart className="w-3 h-3 fill-indigo-100 text-indigo-500 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Footer Demo Info - Subtle */}
                        <div className="pb-6 text-center">
                            <p className="text-[10px] text-slate-400 font-medium opacity-60">Demo: admin@downtown.com / password</p>
                        </div>
                    </>
                ) : (
                    <div className="p-8 animate-fade-in pb-12">
                        {!resetSent ? (
                            <>
                                <button onClick={() => setView('login')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 text-sm font-bold transition-colors bg-white/50 px-4 py-2 rounded-xl w-max hover:bg-white">
                                    <ChevronLeft className="w-4 h-4" /> Back to Login
                                </button>
                                <h2 className="text-2xl font-black text-slate-800 mb-3">Reset Password</h2>
                                <p className="text-slate-500 mb-8 leading-relaxed">Don't worry, it happens! Enter your email and we'll send you a recovery link.</p>

                                <form onSubmit={handleForgotPassword} className="space-y-6">
                                    {error && (
                                        <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 flex items-center gap-3">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div> {error}
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">Email Address</label>
                                        <input
                                            type="email"
                                            className="neo-input w-full px-6 py-4 text-slate-700 font-semibold"
                                            placeholder="you@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-teal-600 text-white font-bold py-4 rounded-2xl hover:bg-teal-700 transition-all shadow-lg hover:shadow-teal-500/30 active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        {loading ? 'Sending...' : 'Send Reset Link'} <Send className="w-4 h-4" />
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="text-center py-6">
                                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-small shadow-sm">
                                    <CheckCircle className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-3">Inox Checked!</h3>
                                <p className="text-slate-500 mb-10 leading-relaxed">
                                    We've sent a magic link to <strong>{email}</strong>.<br />Click it to restore your access.
                                </p>
                                <button
                                    onClick={() => { setView('login'); setResetSent(false); }}
                                    className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl hover:bg-slate-900 shadow-xl"
                                >
                                    Return to Login
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
