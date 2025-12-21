
import React, { useState } from 'react';
import { PlanTier } from '../types';
import { CheckCircle, Building, User, CreditCard, Award, ArrowRight, ArrowLeft, ToggleLeft, ToggleRight, Sparkles, Loader, Shield, Zap, Target, Activity, Check, Globe, Clock, Coins, X } from 'lucide-react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { FLUTTERWAVE_PLANS, TRIAL_PLAN, formatCurrency } from '../services/storage';
import { backend } from '../services/backend';
import { toTitleCase } from '../utils/textUtils';

interface Props {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

const COUNTRY_DATA: Record<string, { currency: string, timezone: string }> = {
  // Top 25 (Approx by Pop/Econ)
  "China": { currency: "CNY", timezone: "Asia/Shanghai" },
  "India": { currency: "INR", timezone: "Asia/Kolkata" },
  "United States": { currency: "USD", timezone: "America/New_York" },
  "Indonesia": { currency: "IDR", timezone: "Asia/Jakarta" },
  "Pakistan": { currency: "PKR", timezone: "Asia/Karachi" },
  "Brazil": { currency: "BRL", timezone: "America/Sao_Paulo" },
  "Nigeria": { currency: "NGN", timezone: "Africa/Lagos" },
  "Bangladesh": { currency: "BDT", timezone: "Asia/Dhaka" },
  "Russia": { currency: "RUB", timezone: "Europe/Moscow" },
  "Mexico": { currency: "MXN", timezone: "America/Mexico_City" },
  "Japan": { currency: "JPY", timezone: "Asia/Tokyo" },
  "Philippines": { currency: "PHP", timezone: "Asia/Manila" },
  "Egypt": { currency: "EGP", timezone: "Africa/Cairo" },
  "Vietnam": { currency: "VND", timezone: "Asia/Ho_Chi_Minh" },
  "Turkey": { currency: "TRY", timezone: "Europe/Istanbul" },
  "Iran": { currency: "IRR", timezone: "Asia/Tehran" },
  "Germany": { currency: "EUR", timezone: "Europe/Berlin" },
  "Thailand": { currency: "THB", timezone: "Asia/Bangkok" },
  "United Kingdom": { currency: "GBP", timezone: "Europe/London" },
  "France": { currency: "EUR", timezone: "Europe/Paris" },
  "Italy": { currency: "EUR", timezone: "Europe/Rome" },
  "South Africa": { currency: "ZAR", timezone: "Africa/Johannesburg" },
  "Tanzania": { currency: "TZS", timezone: "Africa/Dar_es_Salaam" },
  "Myanmar": { currency: "MMK", timezone: "Asia/Yangon" },
  "South Korea": { currency: "KRW", timezone: "Asia/Seoul" },

  // Additional European
  "Spain": { currency: "EUR", timezone: "Europe/Madrid" },
  "Poland": { currency: "PLN", timezone: "Europe/Warsaw" },
  "Ukraine": { currency: "UAH", timezone: "Europe/Kyiv" },
  "Netherlands": { currency: "EUR", timezone: "Europe/Amsterdam" },
  "Belgium": { currency: "EUR", timezone: "Europe/Brussels" },
  "Sweden": { currency: "SEK", timezone: "Europe/Stockholm" },
  "Switzerland": { currency: "CHF", timezone: "Europe/Zurich" },
  "Austria": { currency: "EUR", timezone: "Europe/Vienna" },
  "Norway": { currency: "NOK", timezone: "Europe/Oslo" },
  "Ireland": { currency: "EUR", timezone: "Europe/Dublin" },

  // Other Major/African
  "Ghana": { currency: "GHS", timezone: "Africa/Accra" },
  "Kenya": { currency: "KES", timezone: "Africa/Nairobi" },
  "Canada": { currency: "CAD", timezone: "America/Toronto" },
  "Australia": { currency: "AUD", timezone: "Australia/Sydney" },
  "Saudi Arabia": { currency: "SAR", timezone: "Asia/Riyadh" },
  "Argentina": { currency: "ARS", timezone: "America/Argentina/Buenos_Aires" },
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
    // Basic validation for Step 1
    if (step === 1 && !formData.clinicName) return alert("Please enter a clinic name");
    // Basic validation for Step 2
    if (step === 2 && (!formData.adminEmail || !formData.adminPassword)) return alert("Please fill admin details");
    if (step === 2 && formData.adminPassword !== formData.adminConfirmPassword) return alert("Passwords do not match");

    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  // Configure Payment
  const selectedPlanConfig = FLUTTERWAVE_PLANS[formData.plan][formData.billingCycle];
  const paymentAmount = isTrialMode ? TRIAL_PLAN.amount : selectedPlanConfig.amount;
  const paymentPlanId = isTrialMode ? TRIAL_PLAN.id : selectedPlanConfig.id;
  const paymentTitle = isTrialMode ? `VetNexus 14-Day Trial` : `VetNexus ${formData.plan} ${formData.billingCycle}`;

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
      title: paymentTitle,
      description: isTrialMode ? '14 Days Access' : 'Clinic Management Subscription',
      logo: 'https://cdn-icons-png.flaticon.com/512/2171/2171991.png',
    },
  };

  const handleFlutterwavePayment = useFlutterwave(flutterwaveConfig);

  const finalizeRegistration = async (transactionId: string) => {
    setLoading(true);
    try {
      // Construct Payload matching backend schema
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

      // Call API
      const response = await backend.registerTenant(payload);

      // Store token immediately to log user in
      if (response.token) {
        localStorage.setItem('vet_token', response.token);
        if (response.user) localStorage.setItem('vet_user', JSON.stringify(response.user));
      }

      onComplete(response);

    } catch (error: any) {
      console.error("Registration Error", error);
      alert(`Registration failed: ${error.message}. Please contact support with Ref: ${transactionId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.adminEmail || !formData.clinicName) {
      alert("Please fill in all details.");
      setStep(1);
      return;
    }

    handleFlutterwavePayment({
      callback: (response) => {
        console.log("Payment Success", response);
        closePaymentModal();

        if (response.status === "successful") {
          // Payment successful, now create the account on server
          finalizeRegistration(response.transaction_id.toString());
        }
      },
      onClose: () => {
        console.log("Payment closed");
      },
    });
  };

  const steps = [
    { num: 1, label: 'Clinic Base', icon: Building, color: 'text-sky-500' },
    { num: 2, label: 'Administrator', icon: User, color: 'text-indigo-500' },
    { num: 3, label: 'Capability', icon: Award, color: 'text-emerald-500' },
    { num: 4, label: 'Activation', icon: CreditCard, color: 'text-rose-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-8 font-sans overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-emerald-600/10 rounded-full blur-[100px] animate-float"></div>
      </div>

      <div className="w-full max-w-6xl bg-white/95 backdrop-blur-3xl rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/40 overflow-hidden flex flex-col md:flex-row min-h-[750px] animate-in zoom-in-95 duration-1000 relative z-10">

        {/* Premium Sidebar Nav */}
        <div className="bg-slate-900 p-12 w-full md:w-[320px] flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent opacity-50"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                <Shield className="w-7 h-7 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase font-heading">Onboarding</h2>
            </div>

            <div className="space-y-10">
              {steps.map((s) => (
                <div key={s.num} className={`flex items-center gap-5 transition-all duration-500 ${step === s.num ? 'translate-x-2' : ''}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${step === s.num ? `bg-white border-white scale-110 shadow-2xl ${s.color}` : step > s.num ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-700 bg-slate-800 text-slate-500'}`}>
                    {step > s.num ? <Check className="w-6 h-6" /> : <s.icon className="w-6 h-6" />}
                  </div>
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] block ${step === s.num ? 'text-indigo-400' : 'text-slate-600'}`}>Phase 0{s.num}</span>
                    <span className={`text-sm font-black uppercase tracking-widest leading-none ${step === s.num ? 'text-white' : 'text-slate-500'}`}>{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800/50 py-3 px-6 rounded-2xl border border-white/5 w-max">
              <Coins className="w-4 h-4 text-emerald-500" /> Secure Protocol Active
            </div>
          </div>
        </div>

        {/* Main Interface */}
        <div className="flex-1 p-10 md:p-20 overflow-y-auto relative custom-scrollbar flex flex-col bg-slate-50/50">

          {loading && (
            <div className="absolute inset-0 bg-white/95 z-[100] flex flex-col items-center justify-center backdrop-blur-xl animate-in fade-in duration-500 px-10 text-center">
              <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner animate-pulse">
                <Loader className="w-12 h-12 text-indigo-600 animate-spin" />
              </div>
              <h3 className="text-4xl font-black text-slate-800 tracking-tighter uppercase font-heading">Provisioning Network</h3>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mt-4 max-w-sm leading-loose">Please hold while our neural engines configure your secure clinical environment and dashboard architecture.</p>
            </div>
          )}

          {/* Form Header */}
          <div className="mb-16 flex justify-between items-start animate-in slide-in-from-top-4 duration-700">
            <div>
              <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                <Zap className="w-4 h-4" /> System Genesis
              </h3>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase font-heading leading-none">
                {step === 1 && "Clinic Parameters"}
                {step === 2 && "Command Entry"}
                {step === 3 && "Operational Tier"}
                {step === 4 && "Final Deployment"}
              </h1>
            </div>
            <button onClick={onCancel} className="p-4 bg-slate-900 text-white rounded-3xl hover:bg-rose-500 transition-all shadow-xl active:scale-95">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 space-y-12">
            {/* STEP 1: Clinic Details */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="md:col-span-2 group space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2 italic">Entity Designation *</label>
                    <div className="relative">
                      <Building className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300" />
                      <input type="text" className="w-full pl-16 pr-10 py-5 bg-white border-2 border-slate-100 rounded-[2rem] focus:border-indigo-500 outline-none font-semibold text-slate-800 transition-all shadow-sm shadow-slate-100/50"
                        value={formData.clinicName} onChange={e => updateData('clinicName', e.target.value)} placeholder="Clinic name..." />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2 italic">Operation Protocol</label>
                    <select className="w-full px-10 py-5 bg-white border-2 border-slate-100 rounded-[2rem] focus:border-indigo-500 outline-none font-semibold text-slate-800 transition-all shadow-sm appearance-none cursor-pointer"
                      value={formData.clinicType} onChange={e => updateData('clinicType', e.target.value)}>
                      <option value="Companion">Companion Animal</option>
                      <option value="Livestock">Large Animal / Livestock</option>
                      <option value="Mixed">Mixed Practice</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2 italic">Geo-Spatial Link</label>
                    <select className="w-full px-10 py-5 bg-white border-2 border-slate-100 rounded-[2rem] focus:border-indigo-500 outline-none font-semibold text-slate-800 transition-all shadow-sm appearance-none cursor-pointer"
                      value={formData.country} onChange={handleCountryChange}>
                      {Object.keys(COUNTRY_DATA).sort().map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2 italic">Physical Coordinate Link</label>
                    <div className="relative">
                      <Globe className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300" />
                      <input type="text" className="w-full pl-16 pr-10 py-5 bg-white border-2 border-slate-100 rounded-[2rem] focus:border-indigo-500 outline-none font-semibold text-slate-800 transition-all shadow-sm"
                        value={formData.address} onChange={e => updateData('address', e.target.value)} placeholder="Street, City, State..." />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Administrator */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12">
                <div className="space-y-10">
                  <div className="grid grid-cols-4 gap-6">
                    <div className="col-span-1 space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2 italic">Rank</label>
                      <select
                        className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-[1.8rem] focus:border-indigo-500 outline-none font-semibold text-slate-800 transition-all shadow-sm"
                        value={formData.adminTitle} onChange={e => updateData('adminTitle', e.target.value)}
                      >
                        {['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3 space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2 italic">Identity Designation</label>
                      <input type="text" className="w-full px-10 py-5 bg-white border-2 border-slate-100 rounded-[1.8rem] focus:border-indigo-500 outline-none font-semibold text-slate-800 transition-all shadow-sm"
                        value={formData.adminName} onChange={e => updateData('adminName', e.target.value)} placeholder="Full name..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2 italic">Neural Access Key (Email)</label>
                      <input type="email" className="w-full px-10 py-5 bg-white border-2 border-slate-100 rounded-[1.8rem] focus:border-indigo-500 outline-none font-semibold text-slate-800 transition-all shadow-sm"
                        value={formData.adminEmail} onChange={e => updateData('adminEmail', e.target.value)} placeholder="Email address..." />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2 italic">Comm Link (Phone)</label>
                      <input type="tel" className="w-full px-10 py-5 bg-white border-2 border-slate-100 rounded-[1.8rem] focus:border-indigo-500 outline-none font-semibold text-slate-800 transition-all shadow-sm"
                        value={formData.adminPhone} onChange={e => updateData('adminPhone', e.target.value)} placeholder="Phone number..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2 italic">Cipher Block (Pass)</label>
                      <input type="password" className="w-full px-10 py-5 bg-white border-2 border-slate-100 rounded-[1.8rem] focus:border-indigo-500 outline-none font-semibold text-slate-800 transition-all shadow-sm"
                        value={formData.adminPassword} onChange={(e) => updateData('adminPassword', e.target.value)} placeholder="••••••••" />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2 italic">Cipher Verification</label>
                      <input type="password" className="w-full px-10 py-5 bg-white border-2 border-slate-100 rounded-[1.8rem] focus:border-indigo-500 outline-none font-semibold text-slate-800 transition-all shadow-sm"
                        value={formData.adminConfirmPassword} onChange={e => updateData('adminConfirmPassword', e.target.value)} placeholder="••••••••" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Subscription Plan */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12 pb-10">
                <div className="flex justify-between items-center mb-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Select System Architecture</p>
                  <div
                    onClick={() => setIsTrialMode(!isTrialMode)}
                    className={`flex items-center gap-4 px-6 py-3 rounded-[2rem] cursor-pointer transition-all border-2 ${isTrialMode ? 'bg-indigo-900 border-indigo-500 shadow-lg text-white' : 'bg-white border-slate-100 text-slate-600'}`}
                  >
                    <div className="flex flex-col items-end">
                      <span className="font-black text-[9px] uppercase tracking-widest">14-Day Simulation</span>
                      <span className="text-[8px] opacity-70 uppercase tracking-tighter">Paid Trial Matrix</span>
                    </div>
                    {isTrialMode ? <ToggleRight className="w-10 h-10 text-indigo-400" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {Object.entries({
                    [PlanTier.STARTER]: {
                      price: 3000,
                      desc: 'Foundational Matrix',
                      feats: ['3 Operational Nodes', '50 Entity Records', 'Standard Database']
                    },
                    [PlanTier.STANDARD]: {
                      price: 15000,
                      desc: 'Enhanced Protocol',
                      popular: true,
                      feats: ['8 Operational Nodes', 'Infinity Records', 'AI Diagnostic Link']
                    },
                    [PlanTier.PREMIUM]: {
                      price: 30000,
                      desc: 'Omni Command',
                      feats: ['Infinity Nodes', 'Infinity Records', 'Full Neural Sync']
                    }
                  }).map(([tier, config]) => (
                    <div
                      key={tier}
                      onClick={() => updateData('plan', tier as any)}
                      className={`relative cursor-pointer rounded-[3rem] p-10 transition-all duration-700 overflow-hidden ${formData.plan === tier ? 'bg-slate-900 shadow-2xl scale-105 border-transparent' : 'bg-white border-2 border-slate-100 hover:border-indigo-100'}`}
                    >
                      {config.popular && (
                        <div className="absolute top-0 right-0 py-2 px-6 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-[0.4em] rounded-bl-3xl">Peak Efficiency</div>
                      )}

                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-8 ${formData.plan === tier ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Activity className="w-6 h-6" />
                      </div>

                      <h4 className={`font-black text-xl uppercase tracking-tighter mb-2 font-heading ${formData.plan === tier ? 'text-white' : 'text-slate-800'}`}>{tier}</h4>
                      <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-6 ${formData.plan === tier ? 'text-indigo-400' : 'text-slate-400'}`}>{config.desc}</p>

                      <p className={`text-4xl font-black tracking-tighter mb-8 font-heading ${formData.plan === tier ? 'text-white' : 'text-slate-900'}`}>
                        ₦{(config.price).toLocaleString()} <span className="text-[10px] opacity-40 uppercase tracking-widest">/ Core_Cycle</span>
                      </p>

                      <ul className="space-y-4">
                        {config.feats.map((f, i) => (
                          <li key={i} className="flex items-center gap-3">
                            <CheckCircle className={`w-4 h-4 ${formData.plan === tier ? 'text-indigo-400' : 'text-emerald-500'}`} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${formData.plan === tier ? 'text-slate-400' : 'text-slate-600'}`}>{f}</span>
                          </li>
                        ))}
                      </ul>

                      {formData.plan === tier && <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl"></div>}
                    </div>
                  ))}
                </div>

                {isTrialMode && (
                  <div className="glass-panel p-8 rounded-[2.5rem] bg-indigo-950 text-indigo-400 border border-indigo-500/30 flex items-center gap-6 animate-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center shadow-2xl">
                      <Sparkles className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Temporary Matrix Activated</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] opacity-75 mt-2 leading-relaxed">
                        One-time access charge: NGN 1,000. Full tier capability for 14 operational days. Permanent sync follows unless protocol suspended.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Checkout */}
            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12 max-w-2xl mx-auto text-center">
                <div className="w-32 h-32 bg-indigo-50 rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-inner group">
                  <CreditCard className="w-14 h-14 text-indigo-600 group-hover:scale-110 transition-transform" />
                </div>

                <h3 className="text-4xl font-black text-slate-800 tracking-tighter uppercase font-heading">Secure Data Transfer</h3>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] max-w-md mx-auto leading-loose">Initialize encrypted billing sequence via Flutterwave global exchange.</p>

                <div className="glass-panel bg-white p-12 rounded-[3.5rem] border-2 border-slate-100 shadow-sm space-y-8">
                  <div className="flex justify-between items-center pb-8 border-b border-slate-50">
                    <div className="text-left">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-1">Architecture</span>
                      <span className="text-xl font-black text-slate-800 uppercase tracking-tighter font-heading">{formData.plan} ({formData.billingCycle})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] block mb-1">Payment Matrix</span>
                      <span className="text-2xl font-black text-indigo-600 uppercase font-heading">₦{paymentAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full">
                    {['Monthly', 'Yearly'].map(cycle => (
                      <button
                        key={cycle}
                        onClick={() => updateData('billingCycle', cycle as any)}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.4em] rounded-xl transition-all ${formData.billingCycle === cycle ? 'bg-white text-indigo-700 shadow-xl' : 'text-slate-400'}`}
                      >
                        {cycle}
                      </button>
                    ))}
                  </div>

                  <div className={`p-8 rounded-[2.5rem] flex items-start gap-5 text-left transition-all ${isTrialMode ? 'bg-indigo-50 border border-indigo-100' : 'bg-orange-50 border border-orange-100'}`}>
                    {isTrialMode ? <Clock className="w-8 h-8 text-indigo-600 flex-shrink-0" /> : <Shield className="w-8 h-8 text-orange-600 flex-shrink-0" />}
                    <div className="space-y-2">
                      <p className={`text-xs font-black uppercase tracking-widest ${isTrialMode ? 'text-indigo-900' : 'text-orange-900'}`}>
                        {isTrialMode ? "SIMULATION PARAMETERS" : "SECURE COMMERCE"}
                      </p>
                      <p className={`text-[10px] font-black leading-relaxed opacity-70 uppercase tracking-widest ${isTrialMode ? 'text-indigo-800' : 'text-orange-800'}`}>
                        {isTrialMode
                          ? `Pay NGN 1,000 for 14-day clearance. Auto-sync to ${formData.plan} on Cycle_Day 15 at standard rates.`
                          : "Redirecting to Flutterwave secure tunnel. Auto-renewal ensures infinity uptime for your practice network."
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Control */}
          <div className="mt-20 flex justify-between items-center animate-in slide-in-from-bottom-2 duration-1000">
            {step === 1 ? (
              <button onClick={onCancel} className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-[0.5em] transition-colors py-4 px-8">Abort Sequence</button>
            ) : (
              <button onClick={prevStep} className="flex items-center gap-4 px-10 py-5 bg-white border-2 border-slate-100 rounded-[2rem] text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                <ArrowLeft className="w-4 h-4" /> Previous Phase
              </button>
            )}

            {step < 4 ? (
              <button onClick={nextStep} className="flex items-center gap-4 px-12 py-5 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.5em] hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-900/10 active:scale-95 group">
                Advantage Phase <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className={`flex items-center gap-4 px-14 py-7 text-white rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.6em] shadow-2xl transition-all active:scale-95 group font-heading ${isTrialMode ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'}`}>
                {isTrialMode ? 'ACTIVATE SIMULATION' : 'INITIALIZE FULL NETWORK'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};