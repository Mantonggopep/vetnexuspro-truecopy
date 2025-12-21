import { PlanTier } from '../types';

// --- Constants & Config ---

export const FLUTTERWAVE_PLANS = {
  [PlanTier.STARTER]: {
    Monthly: { id: '149600', amount: 7000 },
    Yearly: { id: '149605', amount: 70000 }
  },
  [PlanTier.STANDARD]: {
    Monthly: { id: '149601', amount: 30000 },
    Yearly: { id: '149604', amount: 300000 }
  },
  [PlanTier.PREMIUM]: {
    Monthly: { id: '149602', amount: 70000 },
    Yearly: { id: '149603', amount: 700000 }
  }
};

export const TRIAL_PLAN = {
  id: '151608',
  amount: 1000,
  interval: 'Monthly'
};

// --- Helper Functions ---

export const getPlanFeatures = (plan: PlanTier, isTrial: boolean = false) => {
  switch (plan) {
    case PlanTier.STARTER:
      return { maxUsers: 3, maxClients: 50, aiEnabled: false, logsEnabled: true, printingEnabled: false, clientPortal: true };
    case PlanTier.STANDARD:
      return { maxUsers: 8, maxClients: 99999, aiEnabled: true, logsEnabled: true, printingEnabled: true, clientPortal: true };
    case PlanTier.PREMIUM:
      return { maxUsers: 999, maxClients: 9999, aiEnabled: true, logsEnabled: true, printingEnabled: true, clientPortal: true };
    default:
      return { maxUsers: 1, maxClients: 10, aiEnabled: false, logsEnabled: true, printingEnabled: false, clientPortal: true };
  }
};

export const getCurrencySymbol = (currency: string) => {
  const symbols: Record<string, string> = {
    'USD': '$', 'NGN': '₦', 'EUR': '€', 'GBP': '£',
    'KES': 'KSh', 'GHS': '₵', 'ZAR': 'R', 'AUD': 'A$',
    'CAD': 'C$', 'ETB': 'Br', 'EGP': 'E£', 'INR': '₹',
    'UGX': 'USh', 'TZS': 'TSh', 'RWF': 'RF'
  };
  return symbols[currency] || currency;
};

export const formatCurrency = (amount: number, currency: string) => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
