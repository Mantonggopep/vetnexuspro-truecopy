
import React, { useState } from 'react';
import { Lock, CheckCircle, ArrowRight } from 'lucide-react';

interface Props {
  token: string;
  onSuccess: () => void;
}

export const ResetPassword: React.FC<Props> = ({ token, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
        setError("Passwords do not match");
        return;
    }
    if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
    }

    setLoading(true);
    setError('');

    try {
        const res = await fetch('/api/auth/reset-password-confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password })
        });

        if (res.ok) {
            setSuccess(true);
            setTimeout(onSuccess, 3000);
        } else {
            const data = await res.json();
            setError(data.message || "Failed to reset password. Link may be expired.");
        }
    } catch (err) {
        setError("Network error. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  if (success) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 text-center animate-fade-in">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Password Reset!</h2>
                <p className="text-slate-500 text-sm">Your password has been updated. Redirecting to login...</p>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-900 text-white text-center">
            <Lock className="w-8 h-8 mx-auto mb-2 text-teal-400" />
            <h2 className="text-lg font-bold">Set New Password</h2>
        </div>
        
        <div className="p-8">
            {error && (
                <div className="p-3 mb-4 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-200">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">New Password</label>
                    <input 
                        type="password"
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Confirm Password</label>
                    <input 
                        type="password"
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                </div>
                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-md flex items-center justify-center gap-2"
                >
                    {loading ? 'Updating...' : 'Reset Password'} <ArrowRight className="w-4 h-4" />
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};
