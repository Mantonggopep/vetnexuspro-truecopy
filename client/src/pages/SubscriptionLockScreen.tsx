
import React from 'react';
import { Tenant, User } from '../types';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { FLUTTERWAVE_PLANS } from '../services/storage';
import { Lock, CreditCard, LogOut, ShieldAlert, Calendar, AlertTriangle } from 'lucide-react';

interface Props {
  tenant: Tenant;
  user: User;
  onPaymentSuccess: (txId: string) => void;
  onLogout: () => void;
}

export const SubscriptionLockScreen: React.FC<Props> = ({ tenant, user, onPaymentSuccess, onLogout }) => {
  // Determine plan details for renewal
  const planTier = tenant.plan;
  const cycle = tenant.billingCycle || 'Monthly';
  const planConfig = FLUTTERWAVE_PLANS[planTier][cycle];
  
  // Flutterwave Config
  const config = {
    public_key: 'FLWPUBK_TEST-YOUR-PUBLIC-KEY-HERE',
    tx_ref: `RENEW_${tenant.id}_${Date.now()}`,
    amount: planConfig.amount,
    currency: 'NGN',
    payment_options: 'card,mobilemoney,ussd',
    payment_plan: planConfig.id,
    customer: {
      email: user.email,
      phone_number: '', 
      name: user.name,
    },
    customizations: {
      title: `Renew ${planTier} Plan`,
      description: `Subscription Renewal for ${tenant.name}`,
      logo: 'https://cdn-icons-png.flaticon.com/512/2171/2171991.png',
    },
  };

  const handlePayment = useFlutterwave(config);

  const onPayClick = () => {
    handlePayment({
      callback: (response) => {
        if (response.status === "successful") {
          closePaymentModal();
          onPaymentSuccess(String(response.transaction_id));
        }
      },
      onClose: () => console.log("Payment closed"),
    });
  };

  const isGracePeriodOver = () => {
      if (!tenant.nextPaymentDate) return false;
      const dueDate = new Date(tenant.nextPaymentDate);
      const now = new Date();
      const diffTime = now.getTime() - dueDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      return diffDays > 5;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-red-50 p-6 text-center border-b border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-red-900">Access Suspended</h1>
          <p className="text-red-700 font-medium mt-2">Subscription Payment Overdue</p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-3">
             <div className="flex justify-between items-center">
                <span className="text-slate-500">Account</span>
                <span className="font-bold text-slate-700">{tenant.name}</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-slate-500">Plan</span>
                <span className="font-bold text-slate-700">{planTier} ({cycle})</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-slate-500">Due Date</span>
                <span className="font-bold text-red-600">{new Date(tenant.nextPaymentDate || '').toLocaleDateString()}</span>
             </div>
             {isGracePeriodOver() && !tenant.isTrial && (
                 <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-100 p-2 rounded mt-2">
                     <AlertTriangle className="w-4 h-4" />
                     <span>Grace period of 5 days has expired.</span>
                 </div>
             )}
          </div>

          <p className="text-center text-slate-600 text-sm">
            To restore full access to your clinical records and dashboard, please settle the outstanding invoice.
          </p>

          <button 
            onClick={onPayClick}
            className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-teal-200 transform transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <CreditCard className="w-5 h-5" />
            Pay NGN {planConfig.amount.toLocaleString()} & Unlock
          </button>

          <button 
            onClick={onLogout}
            className="w-full py-3 text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
           <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Secure Payment via Flutterwave
           </p>
        </div>
      </div>
    </div>
  );
};
