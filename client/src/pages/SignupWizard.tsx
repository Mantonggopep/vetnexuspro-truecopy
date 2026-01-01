
import React, { useState } from 'react';
import { PlanTier } from '../types';
import { CheckCircle, Building, User, CreditCard, Sparkles, Loader, Shield, Check, Globe, Clock, ChevronRight, ChevronLeft, Heart, Zap } from 'lucide-react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { FLUTTERWAVE_PLANS, TRIAL_PLAN, formatCurrency } from '../services/storage';
import { backend } from '../services/backend';
import { toTitleCase } from '../utils/textUtils';

interface Props {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

const COUNTRY_DATA: Record<string, { currency: string, timezone: string }> = {
  "Nigeria": { currency: "NGN", timezone: "Africa/Lagos" },
  "United States": { currency: "USD", timezone: "America/New_York" },
  "United Kingdom": { currency: "GBP", timezone: "Europe/London" },
  "Canada": { currency: "CAD", timezone: "America/Toronto" },
  "Kenya": { currency: "KES", timezone: "Africa/Nairobi" },
  "Ghana": { currency: "GHS", timezone: "Africa/Accra" },
  "South Africa": { currency: "ZAR", timezone: "Africa/Johannesburg" },
  "India": { currency: "INR", timezone: "Asia/Kolkata" },
  // ... (Add others as needed, keeping it simple for now)
};

export const SignupWizard: React.FC<Props> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [isTrialMode, setIsTrialMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    clinicName: '',
    clinicType: 'Companion',
    country: 'Nigeria',
    timezone: 'Africa/Lagos',
    currency: 'NGN',
    address: '',
    adminTitle: 'Dr.',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    adminConfirmPassword: '',
    plan: PlanTier.STANDARD,
    billingCycle: 'Monthly' as 'Monthly' | 'Yearly'
  });

  const updateData = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    const data = COUNTRY_DATA[country];
    if (data) {
      setFormData(prev => ({
        ...prev,
        country: country,
        currency: data.currency,
        timezone: data.timezone
      }));
    } else {
      updateData('country', country);
    }
  };

  const nextStep = () => {
    if (step === 1 && !formData.clinicName) return alert("Please enter your clinic name ✨");
    if (step === 2 && (!formData.adminEmail || !formData.adminPassword)) return alert("We need your email and password to create the account 📧");
    if (step === 2 && formData.adminPassword !== formData.adminConfirmPassword) return alert("Passwords don't match 🙈");

    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  // Configure Payment
  const selectedPlanConfig = FLUTTERWAVE_PLANS[formData.plan][formData.billingCycle];
  const paymentAmount = isTrialMode ? TRIAL_PLAN.amount : selectedPlanConfig.amount;
  const paymentPlanId = isTrialMode ? TRIAL_PLAN.id : selectedPlanConfig.id;

  const flutterwaveConfig = {
    public_key: 'FLWPUBK-661748bb0d55db32433fb588952f7f67-X',
    tx_ref: Date.now().toString(),
    amount: paymentAmount,
    currency: 'NGN',
    payment_options: 'card,mobilemoney,ussd',
    payment_plan: paymentPlanId,
    customer: {
      email: formData.adminEmail,
      phone_number: formData.adminPhone,
      name: formData.adminName,
    },
    customizations: {
      title: isTrialMode ? `VetNexus Trial` : `VetNexus ${formData.plan}`,
      description: isTrialMode ? '14 Days of Joy' : 'Clinic Subscription',
      logo: 'https://cdn-icons-png.flaticon.com/512/2171/2171991.png',
    },
  };

  const handleFlutterwavePayment = useFlutterwave(flutterwaveConfig);

  const finalizeRegistration = async (transactionId: string) => {
    setLoading(true);
    try {
      const payload = {
        tenant: {
          name: toTitleCase(formData.clinicName),
          type: formData.clinicType,
          address: formData.address,
          country: formData.country,
          currency: formData.currency,
          timezone: formData.timezone
        },
        adminUser: {
          name: `${formData.adminTitle} ${toTitleCase(formData.adminName)}`,
          email: formData.adminEmail,
          phone: formData.adminPhone,
          password: formData.adminPassword
        },
        subscription: {
          plan: formData.plan,
          billingCycle: formData.billingCycle,
          isTrial: isTrialMode,
          paymentPlanId: paymentPlanId,
          transactionId: transactionId
        }
      };

      const response = await backend.registerTenant(payload);

      if (response.token) {
        localStorage.setItem('vet_token', response.token);
        if (response.user) localStorage.setItem('vet_user', JSON.stringify(response.user));
      }

      onComplete(response);

    } catch (error: any) {
      console.error("Registration Error", error);
      alert(`Oops! Something went wrong: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    handleFlutterwavePayment({
      callback: (response) => {
        closePaymentModal();
        if (response.status === "successful") {
          finalizeRegistration(response.transaction_id.toString());
        }
      },
      onClose: () => console.log("Payment closed"),
    });
  };

  const steps = [
    { num: 1, label: 'Clinic Base', icon: Building },
    { num: 2, label: 'Your Details', icon: User },
    { num: 3, label: 'Pick a Plan', icon: Sparkles },
    { num: 4, label: 'Go Live', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-[#ecf0f3] flex items-center justify-center p-4 sm:p-8 font-sans overflow-hidden">
      {/* Soft Background Blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[50rem] h-[50rem] bg-indigo-100/50 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-[40rem] h-[40rem] bg-teal-100/50 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-6xl soft-glass rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[650px] animate-in zoom-in-95 duration-700 relative z-10">

        {/* Friendly Sidebar */}
        <div className="bg-white/40 backdrop-blur-md border-r border-white/50 p-6 w-full md:w-[260px] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-gradient-to-tr from-teal-400 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg text-white">
                <Heart className="w-5 h-5 fill-white" />
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Vet Nexus</h2>
            </div>

            <div className="space-y-4">
              {steps.map((s) => (
                <div key={s.num} className={`flex items-center gap-3 transition-all duration-300 ${step === s.num ? 'translate-x-2' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${step === s.num ? 'bg-indigo-600 text-white shadow-lg scale-110' : step > s.num ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                    {step > s.num ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-bold ${step === s.num ? 'text-indigo-900' : 'text-slate-500'}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-white/50 rounded-2xl border border-white/60">
            <p className="text-xs text-slate-500 italic">"Veterinary care is a work of heart."</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 md:p-10 overflow-y-auto relative custom-scrollbar flex flex-col bg-white/30">

          {loading && (
            <div className="absolute inset-0 bg-white/80 z-[100] flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-300 rounded-[3rem]">
              <Loader className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-slate-800">Setting up your clinic...</h3>
              <p className="text-slate-500 mt-2">Just a moment, making things perfect! ✨</p>
            </div>
          )}

          {/* Header */}
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-1">
                {step === 1 && "Tell us about your clinic"}
                {step === 2 && "Who's in charge?"}
                {step === 3 && "Choose your power"}
                {step === 4 && "Ready for lift off!"}
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                {step === 1 && "Let's get the basics down so we can personalize your experience."}
                {step === 2 && "Create your secure admin account."}
                {step === 3 && "Select a plan that fits your growth."}
                {step === 4 && "Review and start your journey."}
              </p>
            </div>
          </div>

          <div className="flex-1">
            {/* STEP 1: Clinic Details */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Clinic Name</label>
                  <input type="text" className="neo-input w-full px-6 py-3 text-slate-800 font-semibold text-lg placeholder:text-slate-300"
                    value={formData.clinicName} onChange={e => updateData('clinicName', e.target.value)} placeholder="e.g. Happy Paws Vet" autoFocus />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Practice Type</label>
                    <select className="neo-input w-full px-6 py-3 text-slate-700 font-semibold cursor-pointer bg-white"
                      value={formData.clinicType} onChange={e => updateData('clinicType', e.target.value)}>
                      <option value="Companion">Companion Animal (Small)</option>
                      <option value="Livestock">Large Animal / Farm</option>
                      <option value="Mixed">Mixed Practice</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Country</label>
                    <select className="neo-input w-full px-6 py-3 text-slate-700 font-semibold cursor-pointer bg-white"
                      value={formData.country} onChange={handleCountryChange}>
                      {Object.keys(COUNTRY_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Address</label>
                  <input type="text" className="neo-input w-full px-6 py-3 text-slate-700 font-semibold placeholder:text-slate-300"
                    value={formData.address} onChange={e => updateData('address', e.target.value)} placeholder="Full street address..." />
                </div>
              </div>
            )}

            {/* STEP 2: Admin Details */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <div className="flex gap-4">
                  <div className="w-1/4 space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">Title</label>
                    <select className="neo-input w-full px-4 py-4 text-slate-700 font-semibold bg-white"
                      value={formData.adminTitle} onChange={e => updateData('adminTitle', e.target.value)}>
                      {['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">Full Name</label>
                    <input type="text" className="neo-input w-full px-6 py-4 text-slate-700 font-semibold"
                      value={formData.adminName} onChange={e => updateData('adminName', e.target.value)} placeholder="Your name" autoFocus />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">Email</label>
                    <input type="email" className="neo-input w-full px-6 py-4 text-slate-700 font-semibold"
                      value={formData.adminEmail} onChange={e => updateData('adminEmail', e.target.value)} placeholder="name@clinic.com" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">Phone</label>
                    <input type="tel" className="neo-input w-full px-6 py-4 text-slate-700 font-semibold"
                      value={formData.adminPhone} onChange={e => updateData('adminPhone', e.target.value)} placeholder="+234..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">Password</label>
                    <input type="password" className="neo-input w-full px-6 py-4 text-slate-700 font-semibold"
                      value={formData.adminPassword} onChange={e => updateData('adminPassword', e.target.value)} placeholder="••••••••" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">Confirm Password</label>
                    <input type="password" className="neo-input w-full px-6 py-4 text-slate-700 font-semibold"
                      value={formData.adminConfirmPassword} onChange={e => updateData('adminConfirmPassword', e.target.value)} placeholder="••••••••" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Plan */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="flex items-center justify-between bg-white/50 p-2 rounded-2xl border border-white/60 w-max mx-auto shadow-sm">
                  <button
                    onClick={() => setIsTrialMode(false)}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${!isTrialMode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Subscription
                  </button>
                  <button
                    onClick={() => setIsTrialMode(true)}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${isTrialMode ? 'bg-teal-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    14-Day Trial
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries({
                    [PlanTier.STARTER]: { price: 3000, label: 'Starter', desc: 'Perfect for solo vets.' },
                    [PlanTier.STANDARD]: { price: 15000, label: 'Standard', desc: 'Growing clinics.', recommended: true },
                    [PlanTier.PREMIUM]: { price: 30000, label: 'Premium', desc: 'Large hospitals.' }
                  }).map(([tier, conf]) => (
                    <div
                      key={tier}
                      onClick={() => updateData('plan', tier)}
                      className={`relative cursor-pointer p-6 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center text-center ${formData.plan === tier ? 'bg-white border-indigo-500 shadow-xl scale-105 z-10' : 'bg-white/40 border-transparent hover:bg-white/60'}`}
                    >
                      {conf.recommended && <div className="absolute top-0 -translate-y-1/2 bg-indigo-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-sm">Recommended</div>}
                      <h3 className={`text-lg font-black uppercase mb-1 ${formData.plan === tier ? 'text-indigo-900' : 'text-slate-600'}`}>{conf.label}</h3>
                      <p className="text-xs text-slate-400 mb-4">{conf.desc}</p>
                      <p className={`text-2xl font-black mb-1 ${formData.plan === tier ? 'text-indigo-600' : 'text-slate-700'}`}>₦{conf.price.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">/ Month</p>
                    </div>
                  ))}
                </div>

                {isTrialMode && (
                  <div className="bg-teal-50 border border-teal-100 p-6 rounded-2xl flex items-center gap-4 text-teal-800">
                    <div className="p-3 bg-teal-100 rounded-xl"><Sparkles className="w-6 h-6 text-teal-600" /></div>
                    <div>
                      <p className="font-bold text-sm">Trial Activated!</p>
                      <p className="text-xs mt-1 opacity-80">You get NGN 1,000 access for 14 days to test everything out.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Review */}
            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto text-center space-y-8">
                <div className="bg-white/60 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white/50 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400"></div>

                  <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Summary</h3>
                  <div className="text-3xl font-black text-slate-800 mb-1">{formData.clinicName}</div>
                  <div className="text-sm text-slate-500 font-medium mb-6">{formData.adminEmail}</div>

                  <div className="py-6 border-t border-slate-100 border-dashed flex justify-between items-center">
                    <div className="text-left">
                      <p className="text-xs text-slate-400 font-bold uppercase">Plan</p>
                      <p className="font-bold text-slate-700">{formData.plan} {formData.billingCycle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-bold uppercase">Total Due</p>
                      <p className="text-2xl font-black text-indigo-600">₦{paymentAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
                  By clicking the button below, you'll be redirected to Flutterwave to complete your secure payment.
                </p>
              </div>
            )}

          </div>

          {/* Footer Navigation */}
          <div className="mt-8 flex justify-between items-center pt-6 border-t border-slate-200/50">
            {step === 1 ? (
              <button onClick={onCancel} className="text-slate-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest transition-colors">Cancel</button>
            ) : (
              <button onClick={prevStep} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold px-4 py-2 hover:bg-white/50 rounded-xl transition-all">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}

            {step < 4 ? (
              <button onClick={nextStep} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-10 py-4 rounded-2xl font-bold hover:shadow-indigo-500/30 transition-all shadow-xl active:scale-95 text-lg">
                {isTrialMode ? 'Start Trial' : 'Complete Setup'} <Zap className="w-5 h-5 fill-white" />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};