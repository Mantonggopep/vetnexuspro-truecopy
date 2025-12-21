import React, { useState } from 'react';
import { User, AppState } from '../types';
import { X, Lock, Save, User as UserIcon, Shield, Mail, Phone, Calendar, Building } from 'lucide-react';
import { backend } from '../services/api';

interface Props {
    user: User;
    state: AppState;
    onClose: () => void;
    onUpdate: (user: User) => void;
}

export const UserProfile: React.FC<Props> = ({ user, state, onClose, onUpdate }) => {
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const userTenant = state.tenants.find(t => t.id === user.tenantId);
    const userBranch = state.branches.find(b => b.id === user.branchId);

    const handlePasswordChange = async () => {
        if (!newPassword || newPassword.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        setIsUpdating(true);

        try {
            // Send plain password to backend - server will handle hashing (security best practice)
            const updatedUser = { ...user, password: newPassword };

            await backend.update('users', user.id, updatedUser);
            onUpdate(updatedUser);

            setShowPasswordChange(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            alert('Password changed successfully!');
        } catch (error) {
            alert('Failed to change password. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
            case 'PARENT_ADMIN':
                return 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white';
            case 'ADMIN':
                return 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white';
            case 'VET':
                return 'bg-gradient-to-r from-teal-500 to-green-600 text-white';
            case 'NURSE':
                return 'bg-gradient-to-r from-pink-500 to-rose-600 text-white';
            case 'RECEPTION':
                return 'bg-gradient-to-r from-amber-500 to-orange-600 text-white';
            default:
                return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="relative h-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-8 pt-6">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="absolute -bottom-16 left-8">
                        <div className="w-32 h-32 rounded-3xl bg-white shadow-xl flex items-center justify-center border-4 border-white">
                            <div className="w-full h-full rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                <UserIcon className="w-16 h-16 text-indigo-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 pt-20 space-y-6">
                    {/* User Info Section */}
                    <div className="space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                                    {user.title} {user.name}
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">ID: #{user.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-lg ${getRoleBadgeColor(user.role)}`}>
                                <Shield className="w-3 h-3 inline mr-1" />
                                {user.role.replace('_', ' ')}
                            </span>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</p>
                                        <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
                                    </div>
                                </div>
                            </div>

                            {user.phone && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                                            <Phone className="w-5 h-5 text-teal-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                                            <p className="text-sm font-bold text-slate-800 truncate">{user.phone}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {userTenant && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                            <Building className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinic</p>
                                            <p className="text-sm font-bold text-slate-800 truncate">{userTenant.name}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {userBranch && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                            <Building className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Branch</p>
                                            <p className="text-sm font-bold text-slate-800 truncate">{userBranch.name}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-rose-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Joined</p>
                                        <p className="text-sm font-bold text-slate-800 truncate">
                                            {new Date(user.joinedDate || new Date().toISOString()).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</p>
                                        <p className="text-sm font-bold text-green-600">
                                            {user.active ? 'Active' : 'Inactive'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Password Change Section */}
                    <div className="pt-6 border-t border-slate-100">
                        {!showPasswordChange ? (
                            <button
                                onClick={() => setShowPasswordChange(true)}
                                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                <Lock className="w-5 h-5" />
                                Change Password
                            </button>
                        ) : (
                            <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-black text-slate-800">Change Password</h3>
                                    <button
                                        onClick={() => setShowPasswordChange(false)}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        placeholder="Enter current password"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        placeholder="Enter new password (min 6 chars)"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        placeholder="Confirm new password"
                                    />
                                </div>

                                <button
                                    onClick={handlePasswordChange}
                                    disabled={isUpdating || !newPassword || !confirmPassword}
                                    className="w-full py-3 px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Save className="w-5 h-5" />
                                    {isUpdating ? 'Updating...' : 'Save New Password'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
