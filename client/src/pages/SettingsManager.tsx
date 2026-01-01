
import React, { useState, useEffect } from 'react';
import { AppState, Tenant, UserRole, PlanTier } from '../types';
import { Settings, Save, Globe, Lock, Bell, Building, CreditCard, ShieldCheck, Activity, DollarSign, GitBranch, ChevronRight, Clock, MapPin, UserCheck, Key, Shield, AlertTriangle, Truck } from 'lucide-react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { backend } from '../services/api';

interface Props {
    state: AppState;
    dispatch: (action: any) => void;
    onNavigate: (view: string) => void;
}

const FLUTTERWAVE_PLANS = {
    [PlanTier.STARTER]: {
        Monthly: { id: '151566', amount: 3000 },
        Yearly: { id: '151567', amount: 30000 }
    },
    [PlanTier.STANDARD]: {
        Monthly: { id: '151568', amount: 15000 },
        Yearly: { id: '151569', amount: 150000 }
    },
    [PlanTier.PREMIUM]: {
        Monthly: { id: '151570', amount: 30000 },
        Yearly: { id: '151571', amount: 300000 }
    }
};

export const SettingsManager: React.FC<Props> = ({ state, dispatch, onNavigate }) => {
    const currentTenant = state.tenants.find(t => t.id === state.currentTenantId);
    const [activeSection, setActiveSection] = useState<'profile' | 'billing' | 'localization' | 'security' | 'backup'>('profile');

    // Profile State
    const [clinicName, setClinicName] = useState(currentTenant?.name || '');
    const [address, setAddress] = useState(currentTenant?.address || '');
    const [bankDetails, setBankDetails] = useState(currentTenant?.bankDetails || { bankName: '', accountName: '', accountNumber: '', sortCode: '' });

    // Localization State
    const [currency, setCurrency] = useState(currentTenant?.currency || 'NGN');
    const [timezone, setTimezone] = useState(currentTenant?.timezone || 'UTC');

    // Security State
    const [twoFactor, setTwoFactor] = useState(false);
    const [sessionTimeout, setSessionTimeout] = useState('30');

    // Backup State
    const [driveConnected, setDriveConnected] = useState(false);
    const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
    const [isBackingUp, setIsBackingUp] = useState(false);

    // Upgrade State
    const [targetPlan, setTargetPlan] = useState<PlanTier>(currentTenant?.plan || PlanTier.STARTER);
    const [targetCycle, setTargetCycle] = useState<'Monthly' | 'Yearly'>(currentTenant?.billingCycle || 'Monthly');

    // handlers
    const handleDriveConnect = () => {
        // Simulation of OAuth
        const win = window.open('', 'Google Drive Auth', 'width=500,height=600');
        if (win) {
            win.document.write('<h2>Connecting to Google...</h2><p>Please wait...</p>');
            setTimeout(() => {
                win.close();
                setDriveConnected(true);
                alert("Connected to Google Drive successfully!");
            }, 2000);
        }
    };

    const handleBackupNow = () => {
        setIsBackingUp(true);
        setTimeout(() => {
            setIsBackingUp(false);
            setLastBackupDate(new Date().toISOString());
            alert("Backup completed successfully! 140MB uploaded.");
        }, 3000);
    };

    // Sync local state with global state when it changes (e.g. after save or sync)
    useEffect(() => {
        if (currentTenant) {
            setClinicName(currentTenant.name);
            setAddress(currentTenant.address);
            setBankDetails(currentTenant.bankDetails || { bankName: '', accountName: '', accountNumber: '', sortCode: '' });
            setCurrency(currentTenant.currency);
            setTimezone(currentTenant.timezone);
            setTargetPlan(currentTenant.plan);
            setTargetCycle(currentTenant.billingCycle || 'Monthly');
        }
    }, [currentTenant]);

    const isAdmin = state.currentUser?.role === UserRole.ADMIN || state.currentUser?.role === UserRole.PARENT_ADMIN || state.currentUser?.role === UserRole.SUPER_ADMIN;
    const isParentAdmin = state.currentUser?.role === UserRole.PARENT_ADMIN || state.currentUser?.role === UserRole.SUPER_ADMIN;

    const handleSave = () => {
        const updates: Partial<Tenant> = {
            id: state.currentTenantId,
            name: clinicName,
            address: address,
            bankDetails: bankDetails,
            currency: currency,
            timezone: timezone,
            // In a real app, security settings might go to a different table or config field
        };

        dispatch({ type: 'UPDATE_TENANT', payload: updates });
        alert("Settings saved successfully!");
    };

    // Upgrade Payment Logic
    const planConfig = FLUTTERWAVE_PLANS[targetPlan][targetCycle];
    const flutterwaveConfig = {
        public_key: 'FLWPUBK_TEST-YOUR-PUBLIC-KEY-HERE',
        tx_ref: `UPG_${Date.now()}`,
        amount: planConfig.amount,
        currency: 'NGN',
        payment_options: 'card,mobilemoney,ussd',
        payment_plan: planConfig.id,
        customer: {
            email: state.currentUser?.email || '',
            phone_number: '',
            name: state.currentUser?.name || '',
        },
        customizations: {
            title: `Upgrade to ${targetPlan}`,
            description: `Switching plan to ${targetPlan} (${targetCycle})`,
            logo: 'https://cdn-icons-png.flaticon.com/512/2171/2171991.png',
        },
    };

    const handleUpgradePayment = useFlutterwave(flutterwaveConfig);

    const handleUpgradeClick = () => {
        if (targetPlan === currentTenant?.plan && targetCycle === currentTenant?.billingCycle) {
            alert("You are already on this plan.");
            return;
        }
        handleUpgradePayment({
            callback: async (response) => {
                closePaymentModal();
                if (response.status === "successful") {
                    const isVerified = await backend.verifyPayment(String(response.transaction_id), planConfig);
                    if (isVerified) {
                        dispatch({
                            type: 'UPDATE_TENANT',
                            payload: {
                                id: state.currentTenantId,
                                plan: targetPlan,
                                billingCycle: targetCycle,
                                paymentPlanId: planConfig.id,
                                isTrial: false,
                                autoRenew: true,
                                subscriptionStatus: 'ACTIVE'
                            }
                        });
                        alert(`Plan upgraded to ${targetPlan} successfully!`);
                    } else {
                        alert("Payment verification failed. Please contact support.");
                    }
                }
            },
            onClose: () => console.log("Upgrade closed"),
        });
    };

    const handleCancelSubscription = () => {
        if (confirm("Are you sure you want to cancel? Your access will continue until the end of the current period.")) {
            dispatch({
                type: 'UPDATE_TENANT',
                payload: {
                    id: state.currentTenantId,
                    autoRenew: false,
                    subscriptionStatus: 'CANCELED'
                }
            });
            alert("Subscription canceled. Auto-renew disabled.");
        }
    };

    const handleResumeSubscription = () => {
        dispatch({
            type: 'UPDATE_TENANT',
            payload: {
                id: state.currentTenantId,
                autoRenew: true,
                subscriptionStatus: 'ACTIVE'
            }
        });
        alert("Subscription resumed successfully.");
    };

    const daysRemaining = currentTenant?.nextPaymentDate
        ? Math.ceil((new Date(currentTenant.nextPaymentDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        : 0;

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 animate-fade-in p-4 md:p-0">

            <div className="w-full md:w-64 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-2 h-full overflow-y-auto">
                <h3 className="font-bold text-slate-800 px-2 mt-2 uppercase text-xs tracking-wider">Configuration</h3>
                <button onClick={() => setActiveSection('profile')} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-medium transition-all ${activeSection === 'profile' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Building className="w-4 h-4" /> Clinic Profile
                </button>
                <button onClick={() => setActiveSection('billing')} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-medium transition-all ${activeSection === 'billing' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <CreditCard className="w-4 h-4" /> Billing & Plan
                </button>
                <button onClick={() => setActiveSection('localization')} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-medium transition-all ${activeSection === 'localization' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Globe className="w-4 h-4" /> Localization
                </button>
                <button onClick={() => setActiveSection('security')} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-medium transition-all ${activeSection === 'security' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <ShieldCheck className="w-4 h-4" /> Security
                </button>
                <button onClick={() => setActiveSection('backup')} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-medium transition-all ${activeSection === 'backup' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Shield className="w-4 h-4" /> Data Backup
                </button>

                <div className="mt-6 px-2">
                    <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-2">Management</h3>
                    <div className="space-y-1">
                        <button onClick={() => onNavigate('expenses')} className="w-full text-left px-4 py-3 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center justify-between group transition-colors">
                            <span className="flex items-center gap-3 font-medium"><DollarSign className="w-4 h-4" /> Expenses</span>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                        </button>
                        {isAdmin && (
                            <button onClick={() => onNavigate('compliance')} className="w-full text-left px-4 py-3 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center justify-between group transition-colors">
                                <span className="flex items-center gap-3 font-medium"><Shield className="w-4 h-4" /> Compliance</span>
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                            </button>
                        )}
                        {isParentAdmin && (
                            <>
                                <button onClick={() => onNavigate('staff')} className="w-full text-left px-4 py-3 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center justify-between group transition-colors">
                                    <span className="flex items-center gap-3 font-medium"><UserCheck className="w-4 h-4" /> Staff</span>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                                </button>
                                <button onClick={() => onNavigate('branches')} className="w-full text-left px-4 py-3 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center justify-between group transition-colors">
                                    <span className="flex items-center gap-3 font-medium"><GitBranch className="w-4 h-4" /> Branches</span>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                                </button>
                                <button onClick={() => onNavigate('admin')} className="w-full text-left px-4 py-3 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center justify-between group transition-colors">
                                    <span className="flex items-center gap-3 font-medium"><Activity className="w-4 h-4" /> Audit Logs</span>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                                </button>
                                <button onClick={() => onNavigate('orders')} className="w-full text-left px-4 py-3 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center justify-between group transition-colors border-t border-slate-50 mt-2">
                                    <span className="flex items-center gap-3 font-medium text-teal-600"><Truck className="w-4 h-4" /> Logistics Config</span>
                                    <ChevronRight className="w-4 h-4 text-teal-400 group-hover:text-teal-600" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        {activeSection === 'profile' && <><Building className="w-6 h-6 text-teal-600" /> Clinic Profile</>}
                        {activeSection === 'billing' && <><CreditCard className="w-6 h-6 text-teal-600" /> Billing & Subscription</>}
                        {activeSection === 'localization' && <><Globe className="w-6 h-6 text-teal-600" /> Localization</>}
                        {activeSection === 'security' && <><Lock className="w-6 h-6 text-teal-600" /> Security Settings</>}
                        {activeSection === 'backup' && <><Shield className="w-6 h-6 text-teal-600" /> Data Backup & Recovery</>}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Manage your practice configuration.</p>
                </div>

                <div className="p-8 max-w-3xl space-y-8 flex-1 overflow-y-auto">

                    {activeSection === 'profile' && (
                        <div className="animate-fade-in space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Clinic Name</label>
                                <input
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-colors"
                                    value={clinicName}
                                    onChange={e => setClinicName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Address</label>
                                <textarea
                                    className="w-full p-3 border border-slate-200 rounded-xl"
                                    rows={3}
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                />
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-teal-600" /> Financial Account Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                                        <input
                                            className="w-full p-3 border border-slate-200 rounded-xl"
                                            value={bankDetails.bankName}
                                            onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
                                        <input
                                            className="w-full p-3 border border-slate-200 rounded-xl"
                                            value={bankDetails.accountName}
                                            onChange={e => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                                        <input
                                            className="w-full p-3 border border-slate-200 rounded-xl font-mono"
                                            value={bankDetails.accountNumber}
                                            onChange={e => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'billing' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Current Plan</p>
                                        <h2 className="text-3xl font-bold tracking-tight">{currentTenant?.plan}</h2>
                                        <p className="mt-2 text-slate-300 text-sm">
                                            {currentTenant?.plan === 'PREMIUM' ? 'Unlimited Access + AI Suite' : 'Standard Features'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold">
                                            {currentTenant?.billingCycle === 'Monthly' ? '₦15,000' : '₦150,000'}
                                            <span className="text-sm font-normal text-slate-400">/{currentTenant?.billingCycle === 'Monthly' ? 'mo' : 'yr'}</span>
                                        </p>
                                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold border ${currentTenant?.subscriptionStatus === 'ACTIVE' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                            {currentTenant?.subscriptionStatus || 'Active'}
                                        </span>
                                    </div>
                                </div>
                                <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-teal-500/20 rounded-full blur-3xl"></div>
                            </div>

                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-indigo-900">
                                        {currentTenant?.isTrial ? 'Trial Ends' : 'Next Payment'} in {daysRemaining} Days
                                    </h3>
                                    <p className="text-sm text-indigo-700">Scheduled for {currentTenant?.nextPaymentDate ? new Date(currentTenant.nextPaymentDate).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                {currentTenant?.subscriptionStatus === 'CANCELED' ? (
                                    <button onClick={handleResumeSubscription} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">
                                        Resume Subscription
                                    </button>
                                ) : (
                                    <button onClick={handleCancelSubscription} className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50">
                                        Cancel Subscription
                                    </button>
                                )}
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h3 className="font-bold text-slate-800 mb-4">Change Plan</h3>
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Switch To</label>
                                            <select
                                                className="w-full p-2 border rounded-lg"
                                                value={targetPlan}
                                                onChange={e => setTargetPlan(e.target.value as PlanTier)}
                                            >
                                                <option value={PlanTier.STARTER}>Starter (NGN 3,000/mo)</option>
                                                <option value={PlanTier.STANDARD}>Standard (NGN 15,000/mo)</option>
                                                <option value={PlanTier.PREMIUM}>Premium (NGN 30,000/mo)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Billing Cycle</label>
                                            <select
                                                className="w-full p-2 border rounded-lg"
                                                value={targetCycle}
                                                onChange={e => setTargetCycle(e.target.value as any)}
                                            >
                                                <option value="Monthly">Monthly</option>
                                                <option value="Yearly">Yearly (Save 20%)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleUpgradeClick}
                                        className="w-full py-3 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-sm"
                                    >
                                        Proceed to Payment (NGN {planConfig.amount.toLocaleString()})
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'localization' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-slate-400" /> Regional Settings</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                                        <select
                                            className="w-full p-3 border border-slate-200 rounded-xl bg-white"
                                            value={currency}
                                            onChange={(e) => setCurrency(e.target.value)}
                                        >
                                            {['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'GHS'].map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                                        <select
                                            className="w-full p-3 border border-slate-200 rounded-xl bg-white"
                                            value={timezone}
                                            onChange={(e) => setTimezone(e.target.value)}
                                        >
                                            <option value="UTC">UTC</option>
                                            <option value="America/New_York">New York (EST)</option>
                                            <option value="Europe/London">London (GMT)</option>
                                            <option value="Africa/Lagos">Lagos (WAT)</option>
                                            <option value="Africa/Nairobi">Nairobi (EAT)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'security' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="font-bold text-slate-800">Two-Factor Authentication</h3>
                                        <p className="text-sm text-slate-500">Require an extra security step when logging in.</p>
                                    </div>
                                    <div
                                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${twoFactor ? 'bg-teal-500' : 'bg-slate-300'}`}
                                        onClick={() => setTwoFactor(!twoFactor)}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${twoFactor ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </div>

                                <hr className="border-slate-100 my-4" />

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Session Timeout (Minutes)</label>
                                        <select
                                            className="w-full p-3 border border-slate-200 rounded-xl bg-white"
                                            value={sessionTimeout}
                                            onChange={(e) => setSessionTimeout(e.target.value)}
                                        >
                                            <option value="15">15 Minutes</option>
                                            <option value="30">30 Minutes</option>
                                            <option value="60">1 Hour</option>
                                            <option value="120">2 Hours</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'backup' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                        <Shield className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">Google Drive Backup</h3>
                                        <p className="text-sm text-slate-500">Securely backup your patient records and images to the cloud.</p>
                                    </div>
                                </div>

                                {!driveConnected ? (
                                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-50/50">
                                        <p className="text-slate-600 font-medium mb-4">Connect your Google Drive account to enable automatic backups.</p>
                                        <button
                                            onClick={handleDriveConnect}
                                            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-all"
                                        >
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-5 h-5" alt="Drive" />
                                            Connect Google Drive
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-green-50 text-green-700 rounded-xl border border-green-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                    <UserCheck className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">Connected to Google Drive</p>
                                                    <p className="text-xs opacity-80">account@vetnexus.pro</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setDriveConnected(false)} className="text-xs font-bold underline hover:no-underline">Disconnect</button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Last Backup</p>
                                                <p className="text-slate-800 font-medium">{lastBackupDate ? new Date(lastBackupDate).toLocaleString() : 'Never'}</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Backup Frequency</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-800 font-medium">Daily (Midnight)</span>
                                                    <div className={`w-10 h-5 bg-teal-500 rounded-full relative cursor-pointer`}>
                                                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleBackupNow}
                                            disabled={isBackingUp}
                                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isBackingUp ? (
                                                <><Clock className="w-5 h-5 animate-spin" /> Backing up...</>
                                            ) : (
                                                <><Shield className="w-5 h-5" /> Backup Now</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button onClick={handleSave} className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg transform active:scale-95 transition-all">
                        <Save className="w-4 h-4" /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
