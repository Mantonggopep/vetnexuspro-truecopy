
import React, { useEffect, useReducer, useState } from 'react';
import { getPlanFeatures, FLUTTERWAVE_PLANS, formatCurrency } from './services/storage';
import { backend } from './services/api';
import { toTitleCase } from './utils/textUtils';
import { AppState, UserRole, AuditLog, Patient, Invoice, InvoiceStatus, MedicalNote, User, Tenant, Client, ChatMessage, StaffChatMessage, AppNotification, Attachment, Appointment, Consultation, LabRequest, InventoryItem, Sale, Expense, Budget, Service, Branch, Order } from './types';

// Import Pages (Migrated from components)
import { Dashboard } from './pages/Dashboard';
import { PatientManager } from './pages/PatientManager';
import { ClientManager } from './pages/ClientManager';
import { Finance } from './pages/Finance';
import { AppointmentManager } from './pages/AppointmentManager';
import { ConsultationManager } from './pages/ConsultationManager';
import { LabManager } from './pages/LabManager';
import { InventoryManager } from './pages/InventoryManager';
import { PointOfSale } from './pages/PointOfSale';
import { ServiceManager } from './pages/ServiceManager';
import { ExpenseManager } from './pages/ExpenseManager';
import { ReportsAnalytics } from './pages/ReportsAnalytics';
import { StaffManager } from './pages/StaffManager';
import { SettingsManager } from './pages/SettingsManager';
import { ComplianceManager } from './pages/ComplianceManager';
import { SuperAdmin } from './pages/SuperAdmin';
import { BranchManager } from './pages/BranchManager';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { SignupWizard } from './pages/SignupWizard';
import { ClientPortal } from './pages/ClientPortal';
import { SubscriptionLockScreen } from './pages/SubscriptionLockScreen';
import { LoadingScreen } from './pages/LoadingScreen';
import { ResetPassword } from './pages/ResetPassword';
import { UserProfile } from './components/UserProfile';
import { StaffChat } from './components/StaffChat';
import { SalesHistory } from './pages/SalesHistory';
import { OrderManager } from './pages/OrderManager';

import {
  LogOut, Layout, AlertCircle, RefreshCw, ShieldAlert, Bell, MessageSquare, Calendar as CalendarIcon, TrendingUp, Activity, LayoutDashboard, Stethoscope, ShoppingCart, Package, Settings, MapPin, Users, History, Truck
} from 'lucide-react';

// --- Reducer Actions ---
type Action =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'SWITCH_VIEW'; payload: string }
  | { type: 'SWITCH_TENANT'; payload: string }
  | { type: 'SWITCH_BRANCH'; payload: string }
  | { type: 'ADD_PATIENT'; payload: Patient }
  | { type: 'DELETE_PATIENT'; payload: { patientId: string, reason: string } }
  | { type: 'ARCHIVE_PATIENT'; payload: { patientId: string, reason: string } }
  | { type: 'ADD_MEDICAL_NOTE'; payload: { patientId: string; note: MedicalNote } }
  | { type: 'ADD_ATTACHMENT'; payload: { patientId: string; attachment: Attachment } }
  | { type: 'ADD_INVOICE'; payload: Invoice }
  | { type: 'ADJUST_INVOICE'; payload: { id: string; reason: string } }
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER_TENANT'; payload: { tenant: Tenant, admin: User, branch: Branch } }
  | { type: 'UPDATE_TENANT'; payload: Partial<Tenant> & { id: string } }
  | { type: 'ADD_BRANCH'; payload: Branch }
  | { type: 'UPDATE_BRANCH'; payload: Branch }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'DELETE_CLIENT'; payload: { clientId: string, reason: string } }
  | { type: 'REGISTER_PORTAL_USER'; payload: User }
  | { type: 'SEND_CHAT'; payload: ChatMessage }
  | { type: 'SEND_STAFF_CHAT'; payload: StaffChatMessage }
  | { type: 'UPDATE_CHAT'; payload: ChatMessage }
  | { type: 'ADD_APPOINTMENT'; payload: Appointment }
  | { type: 'UPDATE_APPOINTMENT'; payload: Appointment }
  | { type: 'ADD_CONSULTATION'; payload: Consultation }
  | { type: 'UPDATE_CONSULTATION'; payload: Consultation }
  | { type: 'ADD_LAB_REQUEST'; payload: LabRequest }
  | { type: 'UPDATE_LAB_REQUEST'; payload: LabRequest }
  | { type: 'ADD_INVENTORY'; payload: InventoryItem }
  | { type: 'UPDATE_INVENTORY'; payload: InventoryItem }
  | { type: 'MAKE_SALE'; payload: Sale }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_BUDGET'; payload: Budget }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'ADD_SERVICE'; payload: Service }
  | { type: 'UPDATE_SERVICE'; payload: Service }
  | { type: 'DELETE_SERVICE'; payload: { serviceId: string } }
  | { type: 'ADD_NOTIFICATION'; payload: AppNotification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'PLACE_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'UPDATE_INVOICE'; payload: Invoice }
  | { type: 'DELETE_INVENTORY'; payload: string }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'SET_CHATS'; payload: ChatMessage[] };

const EMPTY_STATE: AppState = {
  users: [], tenants: [], branches: [], logs: [], clients: [], patients: [], invoices: [],
  inventory: [], sales: [], services: [], appointments: [], chats: [], notifications: [], consultations: [],
  labRequests: [], expenses: [], budgets: [], orders: [], staffMessages: [], currentUser: null, currentTenantId: '', currentBranchId: ''
};

const createLog = (user: User | null, action: string, details: string, tenantId: string, branchId?: string): AuditLog => ({
  id: `log${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  timestamp: new Date().toISOString(),
  userId: user ? user.id : 'system',
  userName: user ? user.name : 'System',
  action,
  details,
  tenantId,
  branchId
});

function appReducer(state: AppState, action: Action): AppState {
  let newState = { ...state };

  // Helper for logging within reducer
  const logAndSave = (actionType: string, details: string) => {
    // We use the most up-to-date context from newState
    const logUser = newState.currentUser || state.currentUser;
    const log = createLog(logUser, actionType, details, newState.currentTenantId || state.currentTenantId, newState.currentBranchId || state.currentBranchId);
    newState.logs = [...newState.logs, log];
    backend.insert('logs', log as any); // Side effect in reducer (pattern followed in this project)
  };

  switch (action.type) {
    case 'SET_STATE':
      let newBranchId = action.payload.currentBranchId;

      // Enforce branch for non-parent-admins
      if (action.payload.currentUser && action.payload.currentUser.role !== UserRole.PARENT_ADMIN && action.payload.currentUser.role !== UserRole.SUPER_ADMIN) {
        if (action.payload.currentUser.branchId) {
          newBranchId = action.payload.currentUser.branchId;
        }
      }

      if (!newBranchId) {
        if (state.currentBranchId) {
          newBranchId = state.currentBranchId;
        } else if (action.payload.branches && action.payload.currentTenantId) {
          const defaultBranch = action.payload.branches.find((b: Branch) => b.tenantId === action.payload.currentTenantId && b.active);
          if (defaultBranch) newBranchId = defaultBranch.id;
        }
      }

      const mergedChats = action.payload.chats ? [...action.payload.chats] : [];
      if (state.chats.length > 0) {
        const existingIds = new Set(mergedChats.map(c => c.id));
        const inFlight = state.chats.filter(c => !existingIds.has(c.id));
        mergedChats.push(...inFlight);
        mergedChats.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      }

      return {
        ...action.payload,
        chats: mergedChats,
        currentBranchId: newBranchId || '',
        notifications: [...state.notifications, ...(action.payload.notifications || []).filter((n: any) => !state.notifications.some(en => en.id === n.id))]
      };
    case 'LOGIN':
      newState.currentUser = action.payload;
      newState.currentTenantId = action.payload.tenantId;
      if (action.payload.branchId) newState.currentBranchId = action.payload.branchId;
      else {
        const firstBranch = newState.branches.find(b => b.tenantId === action.payload.tenantId && b.active);
        newState.currentBranchId = firstBranch ? firstBranch.id : '';
      }
      logAndSave('LOGIN', `User ${action.payload.email} logged in.`);
      break;
    case 'SWITCH_BRANCH':
      newState.currentBranchId = action.payload;
      logAndSave('SWITCH_BRANCH', `Switched to branch ID: ${action.payload}`);
      break;
    case 'LOGOUT':
      if (state.currentUser) logAndSave('LOGOUT', `User ${state.currentUser.email} logged out.`);
      newState.currentUser = null; newState.currentTenantId = ''; newState.currentBranchId = ''; localStorage.removeItem('vet_token'); break;
    case 'REGISTER_TENANT':
      newState.tenants = [...newState.tenants, action.payload.tenant];
      newState.branches = [...newState.branches, action.payload.branch];
      newState.users = [...newState.users, action.payload.admin];
      if (state.currentUser?.role !== UserRole.SUPER_ADMIN) {
        newState.currentUser = action.payload.admin;
        newState.currentTenantId = action.payload.tenant.id;
        newState.currentBranchId = action.payload.branch.id;
      }
      logAndSave('REGISTER_TENANT', `Registered tenant: ${action.payload.tenant.name}`);
      break;
    case 'ADD_BRANCH':
      newState.branches = [...newState.branches, action.payload];
      backend.insert('branches', action.payload as any);
      logAndSave('ADD_BRANCH', `Added branch: ${action.payload.name}`);
      break;
    case 'UPDATE_BRANCH':
      newState.branches = newState.branches.map(b => b.id === action.payload.id ? action.payload : b);
      backend.update('branches', action.payload.id, action.payload as any);
      logAndSave('UPDATE_BRANCH', `Updated branch: ${action.payload.name}`);
      break;
    case 'UPDATE_TENANT':
      newState.tenants = newState.tenants.map(t => {
        if (t.id === action.payload.id) {
          const updated = { ...t, ...action.payload };
          if (action.payload.plan || action.payload.isTrial !== undefined) {
            const plan = action.payload.plan || t.plan;
            const isTrial = action.payload.isTrial !== undefined ? action.payload.isTrial : t.isTrial;
            updated.features = getPlanFeatures(plan, isTrial);
          }
          backend.update('tenants', t.id, action.payload as any);
          logAndSave('UPDATE_TENANT', `Updated clinic settings for: ${updated.name}`);
          return updated;
        }
        return t;
      });
      break;
    case 'SWITCH_TENANT':
      newState.currentTenantId = action.payload;
      newState.currentBranchId = ''; // Reset branch when switching tenant
      break;
    case 'ADD_CLIENT':
      newState.clients = [...newState.clients, action.payload];
      backend.insert('clients', action.payload as any);
      logAndSave('ADD_CLIENT', `Registered Client: ${action.payload.name}`);
      break;
    case 'DELETE_CLIENT':
      newState.clients = newState.clients.filter(c => c.id !== action.payload.clientId);
      backend.remove('clients', action.payload.clientId);
      logAndSave('DELETE_CLIENT', `Deleted Client ID: ${action.payload.clientId}. Reason: ${action.payload.reason}`);
      break;
    case 'REGISTER_PORTAL_USER':
      newState.users = [...newState.users, action.payload];
      newState.clients = newState.clients.map(c => c.id === action.payload.clientId ? { ...c, portalEnabled: true } : c);
      backend.insert('users', action.payload as any);
      logAndSave('REGISTER_PORTAL_USER', `Enabled portal for client user: ${action.payload.name}`);
      break;
    case 'SEND_CHAT':
      newState.chats = [...newState.chats, action.payload];
      backend.insert('chats', action.payload as any);
      if (action.payload.sender === 'CLIENT') {
        const notif: AppNotification = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: 'CHAT',
          title: 'New Client Message',
          message: `${action.payload.senderName}: ${action.payload.content.startsWith('MULTIMEDIA|') ? 'Sent an attachment' : action.payload.content.substring(0, 50)}${action.payload.content.length > 50 && !action.payload.content.startsWith('MULTIMEDIA|') ? '...' : ''}`,
          metadata: { clientId: action.payload.clientId },
          isRead: false,
          timestamp: new Date().toISOString(),
          tenantId: action.payload.tenantId
        };
        newState.notifications = [notif, ...newState.notifications];
      }
      break;
    case 'UPDATE_CHAT':
      newState.chats = newState.chats.map(c => c.id === action.payload.id ? action.payload : c);
      backend.update('chats', action.payload.id, action.payload as any);
      break;
    case 'SEND_STAFF_CHAT':
      newState.staffMessages = [...newState.staffMessages, action.payload];
      backend.insert('staff_messages', action.payload as any);
      break;
    case 'ADD_NOTIFICATION': newState.notifications = [action.payload, ...newState.notifications]; break;
    case 'MARK_NOTIFICATION_READ': newState.notifications = newState.notifications.map(n => n.id === action.payload ? { ...n, isRead: true } : n); break;
    case 'CLEAR_NOTIFICATIONS': newState.notifications = []; break;
    case 'PLACE_ORDER':
      newState.orders = [...newState.orders, action.payload];
      backend.insert('orders', action.payload as any);
      const orderNotif: AppNotification = {
        id: `notif_order_${Date.now()}`,
        type: 'INVOICE',
        title: 'New Online Order',
        message: `${action.payload.clientName} placed an order for ${formatCurrency(action.payload.total, 'NGN')}`,
        metadata: { orderId: action.payload.id },
        isRead: false,
        timestamp: new Date().toISOString(),
        tenantId: action.payload.tenantId
      };
      newState.notifications = [orderNotif, ...newState.notifications];
      logAndSave('PLACE_ORDER', `Online order #${action.payload.id} placed by ${action.payload.clientName}`);
      break;
    case 'UPDATE_ORDER':
      newState.orders = newState.orders.map(o => o.id === action.payload.id ? action.payload : o);
      backend.update('orders', action.payload.id, action.payload as any);
      logAndSave('UPDATE_ORDER', `Updated online order #${action.payload.id} status.`);
      break;
    case 'UPDATE_INVOICE':
      newState.invoices = newState.invoices.map(i => i.id === action.payload.id ? action.payload : i);
      backend.update('invoices', action.payload.id, action.payload as any);
      logAndSave('UPDATE_INVOICE', `Updated Invoice #${action.payload.id} status to ${action.payload.status}`);
      break;
    case 'SET_CHATS':
      const serverChats = action.payload;
      const currentIds = new Set(serverChats.map(c => c.id));
      const localOnly = state.chats.filter(c => !currentIds.has(c.id));
      newState.chats = [...serverChats, ...localOnly].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      break;
    case 'ADD_PATIENT':
      newState.patients = [...newState.patients, action.payload];
      backend.insert('patients', action.payload as any);
      logAndSave('ADD_PATIENT', `Registered Patient: ${action.payload.name}`);
      break;
    case 'DELETE_PATIENT':
      newState.patients = newState.patients.filter(p => p.id !== action.payload.patientId);
      backend.remove('patients', action.payload.patientId);
      logAndSave('DELETE_PATIENT', `Deleted Patient ID: ${action.payload.patientId}. Reason: ${action.payload.reason}`);
      break;
    case 'ARCHIVE_PATIENT':
      newState.patients = newState.patients.map(p => p.id === action.payload.patientId ? { ...p, status: 'Archived' } : p);
      logAndSave('ARCHIVE_PATIENT', `Archived Patient ID: ${action.payload.patientId}. Reason: ${action.payload.reason}`);
      break;
    case 'ADD_MEDICAL_NOTE':
      newState.patients = newState.patients.map(p => { if (p.id === action.payload.patientId) { return { ...p, notes: [...p.notes, action.payload.note] }; } return p; });
      logAndSave('ADD_MEDICAL_NOTE', `Added medical note to patient: ${action.payload.patientId}`);
      break;
    case 'ADD_ATTACHMENT':
      newState.patients = newState.patients.map(p => { if (p.id === action.payload.patientId) { const currentAttachments = p.attachments || []; return { ...p, attachments: [...currentAttachments, action.payload.attachment] }; } return p; });
      logAndSave('ADD_ATTACHMENT', `Uploaded attachment for patient: ${action.payload.patientId}`);
      break;
    case 'ADD_INVOICE':
      newState.invoices = [...newState.invoices, action.payload];
      backend.insert('invoices', action.payload as any);
      logAndSave('ADD_INVOICE', `Created Invoice #${action.payload.id} for ${action.payload.patientName}. Total: ${action.payload.total}`);
      break;
    case 'ADJUST_INVOICE':
      newState.invoices = newState.invoices.map(inv => { if (inv.id === action.payload.id) { return { ...inv, status: InvoiceStatus.ADJUSTED, adjustmentReason: action.payload.reason }; } return inv; });
      logAndSave('ADJUST_INVOICE', `Adjusted Invoice #${action.payload.id}. Reason: ${action.payload.reason}`);
      break;
    case 'ADD_APPOINTMENT':
      newState.appointments = [...newState.appointments, action.payload];
      backend.insert('appointments', action.payload as any);
      logAndSave('ADD_APPOINTMENT', `Scheduled appointment for ${action.payload.patientName}`);
      break;
    case 'UPDATE_APPOINTMENT':
      newState.appointments = newState.appointments.map(a => a.id === action.payload.id ? action.payload : a);
      backend.update('appointments', action.payload.id, action.payload as any);
      logAndSave('UPDATE_APPOINTMENT', `Updated appointment status for ${action.payload.patientName}`);
      break;
    case 'ADD_CONSULTATION':
      newState.consultations = [...newState.consultations, action.payload];
      backend.insert('consultations', action.payload as any);
      logAndSave('ADD_CONSULTATION', `New consultation recorded for ${action.payload.patientName}`);
      break;
    case 'UPDATE_CONSULTATION':
      newState.consultations = newState.consultations.map(c => c.id === action.payload.id ? action.payload : c);
      backend.update('consultations', action.payload.id, action.payload as any);
      logAndSave('UPDATE_CONSULTATION', `Updated consultation details for ${action.payload.patientName}`);
      break;
    case 'ADD_LAB_REQUEST':
      newState.labRequests = [...newState.labRequests, action.payload];
      backend.insert('labRequests', action.payload as any);
      logAndSave('ADD_LAB_REQUEST', `Requested lab test: ${action.payload.testName} for ${action.payload.patientName}`);
      break;
    case 'UPDATE_LAB_REQUEST':
      newState.labRequests = newState.labRequests.map(l => l.id === action.payload.id ? action.payload : l);
      backend.update('labRequests', action.payload.id, action.payload as any);
      logAndSave('UPDATE_LAB_REQUEST', `Updated lab results for: ${action.payload.testName}`);
      break;
    case 'ADD_INVENTORY':
      newState.inventory = [...newState.inventory, action.payload];
      backend.insert('inventory', action.payload as any);
      logAndSave('ADD_INVENTORY', `Added inventory item: ${action.payload.name}`);
      break;
    case 'UPDATE_INVENTORY':
      newState.inventory = newState.inventory.map(i => i.id === action.payload.id ? action.payload : i);
      backend.update('inventory', action.payload.id, action.payload as any);
      logAndSave('UPDATE_INVENTORY', `Updated stock for: ${action.payload.name}. New Total: ${action.payload.totalStock}`);
      break;
    case 'DELETE_INVENTORY':
      newState.inventory = newState.inventory.filter(i => i.id !== action.payload);
      backend.remove('inventory', action.payload);
      logAndSave('DELETE_INVENTORY', `Deleted inventory item ID: ${action.payload}`);
      break;
    case 'MAKE_SALE':
      newState.sales = [...newState.sales, action.payload];
      backend.insert('sales', action.payload as any);

      // Calculate COGS and Deduct Stock (FIFO)
      newState.inventory = newState.inventory.map(item => {
        const saleItem = action.payload.items.find((si: any) => si.itemId === item.id);
        if (saleItem) {
          let qtyToDeduct = saleItem.quantity;
          const sortedBatches = [...item.batches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

          const newBatches = sortedBatches.map(batch => {
            if (qtyToDeduct > 0 && batch.quantity > 0) {
              const deduct = Math.min(batch.quantity, qtyToDeduct);
              qtyToDeduct -= deduct;
              return { ...batch, quantity: batch.quantity - deduct };
            }
            return batch;
          });

          const newTotalStock = Math.max(0, newBatches.reduce((acc, b) => acc + (b.quantity || 0), 0));
          return { ...item, batches: newBatches, totalStock: newTotalStock };
        }
        return item;
      });

      logAndSave('MAKE_SALE', `Completed Sale #${action.payload.id}. Total: ${action.payload.total}`);
      break;
    case 'ADD_EXPENSE':
      newState.expenses = [...newState.expenses, action.payload];
      backend.insert('expenses', action.payload as any);
      logAndSave('ADD_EXPENSE', `Recorded expense of ${action.payload.amount}: ${action.payload.description}`);
      break;
    case 'DELETE_EXPENSE':
      newState.expenses = newState.expenses.filter(e => e.id !== action.payload);
      backend.remove('expenses', action.payload);
      logAndSave('DELETE_EXPENSE', `Deleted expense ID: ${action.payload}`);
      break;
    case 'UPDATE_BUDGET':
      const existingBudgetIndex = newState.budgets.findIndex(b => b.category === action.payload.category && b.tenantId === action.payload.tenantId);
      if (existingBudgetIndex >= 0) {
        const newBudgets = [...newState.budgets];
        newBudgets[existingBudgetIndex] = action.payload;
        newState.budgets = newBudgets;
      } else {
        newState.budgets = [...newState.budgets, action.payload];
      }
      logAndSave('UPDATE_BUDGET', `Updated budget for category: ${action.payload.category}`);
      break;
    case 'ADD_USER':
      newState.users = [...newState.users, action.payload];
      backend.insert('users', action.payload as any);
      logAndSave('ADD_USER', `Created new staff user: ${action.payload.name} (${action.payload.role})`);
      break;
    case 'UPDATE_USER':
      newState.users = newState.users.map(u => u.id === action.payload.id ? action.payload : u);
      backend.update('users', action.payload.id, action.payload as any);
      logAndSave('UPDATE_USER', `Updated profile/permissions for: ${action.payload.name}`);
      break;
    case 'ADD_SERVICE':
      newState.services = [...newState.services, action.payload];
      backend.insert('services', action.payload as any);
      logAndSave('ADD_SERVICE', `Added professional service: ${action.payload.name}`);
      break;
    case 'UPDATE_SERVICE':
      newState.services = newState.services.map(s => s.id === action.payload.id ? action.payload : s);
      backend.update('services', action.payload.id, action.payload as any);
      logAndSave('UPDATE_SERVICE', `Updated service details: ${action.payload.name}`);
      break;
    case 'DELETE_SERVICE':
      newState.services = newState.services.filter(s => s.id !== action.payload.serviceId);
      backend.remove('services', action.payload.serviceId);
      logAndSave('DELETE_SERVICE', `Removed service ID: ${action.payload.serviceId}`);
      break;
  }
  return newState;
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = React.useState('dashboard');
  const [authView, setAuthView] = React.useState<'login' | 'signup'>('login');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [navClientId, setNavClientId] = useState<string | null>(null);

  const canSwitchBranch = state.currentUser?.role === UserRole.PARENT_ADMIN || state.currentUser?.role === UserRole.SUPER_ADMIN;

  const currentTenant = state.tenants.find(t => t.id === state.currentTenantId);

  const isSubscriptionExpired = React.useMemo(() => {
    if (!currentTenant?.nextPaymentDate) return false;
    const dueDate = new Date(currentTenant.nextPaymentDate);
    const now = new Date();
    const isPastDue = now > dueDate;

    if (currentTenant.isTrial && isPastDue) return true;
    if ((currentTenant.subscriptionStatus === 'CANCELED' || currentTenant.autoRenew === false) && isPastDue) return true;

    const gracePeriodEnds = new Date(dueDate);
    gracePeriodEnds.setDate(dueDate.getDate() + 5);
    if (now > gracePeriodEnds) return true;

    return false;
  }, [currentTenant]);

  const isPaymentDue = React.useMemo(() => {
    if (isSubscriptionExpired) return false;
    if (!currentTenant?.nextPaymentDate) return false;
    const dueDate = new Date(currentTenant.nextPaymentDate);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }, [currentTenant, isSubscriptionExpired]);

  // Initial Data Load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setResetToken(token);
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        const fullState = await backend.getFullState();
        dispatch({ type: 'SET_STATE', payload: { ...EMPTY_STATE, ...fullState } });
      } catch (e) {
        console.error("Backend Init Error", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Polling for Real-Time Sync
  useEffect(() => {
    if (!state.currentUser) return;

    const sync = async () => {
      // Prevent overlapping syncs
      if (isSyncing || document.hidden) return;

      try {
        setIsSyncing(true);
        const fullState = await backend.getFullState();

        // Detect new/updated appointments for clients
        if (state.currentUser && state.currentUser.role === UserRole.PET_OWNER) {
          const newAppts: Appointment[] = fullState.appointments || [];
          const oldApptIds = new Set(state.appointments.map(a => a.id));
          const brandNewAppts = newAppts.filter(a => !oldApptIds.has(a.id) && a.clientId === state.currentUser?.clientId);

          brandNewAppts.forEach(a => {
            dispatch({
              type: 'ADD_NOTIFICATION',
              payload: {
                id: `appt_notif_${a.id}_${Date.now()}`,
                type: 'APPOINTMENT',
                title: 'Appointment Scheduled',
                message: `Your visit for ${a.patientName} on ${new Date(a.date).toLocaleDateString()} is ${a.status.toLowerCase()}.`,
                metadata: { appointmentId: a.id },
                isRead: false,
                timestamp: new Date().toISOString(),
                tenantId: a.tenantId
              }
            });
          });
        }

        dispatch({ type: 'SET_STATE', payload: { ...EMPTY_STATE, ...fullState } });
      } catch (e) {
        console.warn("Auto-sync failed", e);
      } finally {
        setIsSyncing(false);
      }
    };

    const intervalId = setInterval(sync, 15000); // 15 seconds for global state (less heavy)
    return () => clearInterval(intervalId);
  }, [state.currentUser, state.chats]);

  // Dedicated Chat Sync (High Frequency for Real-time Feel)
  useEffect(() => {
    if (!state.currentUser) return;

    const syncChats = async () => {
      try {
        const chats = await backend.getChats();
        // Only update if something changed to avoid unnecessary re-renders
        if (JSON.stringify(chats) !== JSON.stringify(state.chats)) {

          // Detect new clinic messages for clients to show notifications
          if (state.currentUser?.role === UserRole.PET_OWNER) {
            const oldChatIds = new Set(state.chats.map(c => c.id));
            const brandNewChats = chats.filter(c => !oldChatIds.has(c.id) && c.sender === 'CLINIC');

            brandNewChats.forEach(c => {
              dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                  id: `notif_c_${c.id}_${Date.now()}`,
                  type: 'CHAT',
                  title: 'Message from Clinic',
                  message: c.content.startsWith('MULTIMEDIA|') ? 'Sent an attachment' : `Staff: ${c.content.substring(0, 50)}...`,
                  metadata: { clientId: c.clientId },
                  isRead: false,
                  timestamp: c.timestamp,
                  tenantId: c.tenantId
                }
              });
            });
          } else {
            // Detect new client messages for staff
            const oldChatIds = new Set(state.chats.map(c => c.id));
            const brandNewChats = chats.filter(c => !oldChatIds.has(c.id) && c.sender === 'CLIENT');

            brandNewChats.forEach(c => {
              dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                  id: `notif_s_${c.id}_${Date.now()}`,
                  type: 'CHAT',
                  title: 'New Client Message',
                  message: c.content.startsWith('MULTIMEDIA|') ? 'Sent an attachment' : `${c.senderName}: ${c.content.substring(0, 50)}...`,
                  metadata: { clientId: c.clientId },
                  isRead: false,
                  timestamp: c.timestamp,
                  tenantId: c.tenantId
                }
              });
            });
          }

          dispatch({ type: 'SET_CHATS', payload: chats });
        }
      } catch (e) {
        // Silently fail for chat sync
      }
    };

    const chatIntervalId = setInterval(syncChats, 2000); // 2 seconds for true real-time chat
    return () => clearInterval(chatIntervalId);
  }, [state.currentUser, state.chats]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  const handleManualRefresh = async () => {
    setIsSyncing(true);
    try {
      const fullState = await backend.getFullState();
      dispatch({ type: 'SET_STATE', payload: { ...EMPTY_STATE, ...fullState } });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      setInstallPrompt(null);
    }
  };

  const handleLogin = () => {
    // Optimistic / Local Login fallback if needed, but Login page handles backend auth.
    // We just need to reload state.
    backend.getFullState().then(fullState => {
      dispatch({ type: 'SET_STATE', payload: { ...EMPTY_STATE, ...fullState } });
    });
  };

  const handleSignupComplete = async (data: any) => {
    const tenantId = `t${Date.now()}`;
    const newTenant: Tenant = {
      id: tenantId,
      name: data.clinicName,
      address: data.address,
      type: data.clinicType,
      country: data.country,
      timezone: data.timezone,
      currency: data.currency,
      plan: data.plan,
      status: 'ACTIVE',
      features: getPlanFeatures(data.plan, data.isTrial),
      subscriptionId: data.subscriptionId,
      paymentPlanId: data.paymentPlanId,
      nextPaymentDate: data.nextPaymentDate,
      billingCycle: data.billingCycle,
      isTrial: data.isTrial,
      autoRenew: data.autoRenew,
      subscriptionStatus: data.subscriptionStatus
    };

    const newAdmin: User = {
      id: `u${Date.now()}`,
      title: data.adminTitle,
      name: data.adminName,
      email: data.adminEmail,
      password: data.adminPassword,
      role: UserRole.PARENT_ADMIN,
      tenantId: tenantId,
      active: true,
      joinedDate: new Date().toISOString()
    };

    try {
      const response = await backend.registerTenant({ tenant: newTenant, admin: newAdmin });
      if (response.token) {
        localStorage.setItem('vet_token', response.token);
      }

      // Ensure branch exists to prevent reducer crash if backend omits it
      const branch = response.branch || {
        id: `b_${tenantId}`,
        tenantId: tenantId,
        name: 'Main Branch',
        address: newTenant.address,
        phone: '',
        active: true
      };

      dispatch({ type: 'REGISTER_TENANT', payload: { tenant: response.tenant || newTenant, admin: response.admin || newAdmin, branch: branch } });
    } catch (err: any) {
      alert("Registration failed: " + err.message);
    }
  };

  const handlePortalMessage = (content: string) => {
    if (!state.currentUser || !state.currentUser.clientId) return;

    // Find last message to determine session
    const clientMessages = state.chats
      .filter(c => c.clientId === state.currentUser?.clientId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const lastMsg = clientMessages[clientMessages.length - 1];

    let sessionId = lastMsg?.sessionId;
    const now = new Date();
    const lastTime = lastMsg ? new Date(lastMsg.timestamp) : null;

    // If no session or > 24 hours since last message, start new session
    if (!sessionId || (lastTime && (now.getTime() - lastTime.getTime() > 24 * 60 * 60 * 1000))) {
      sessionId = `sess_${Date.now()}`;
    }

    // Basic classification based on keywords
    const tags: string[] = [];
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('urgent') || lowerContent.includes('emergency') || lowerContent.includes('dying') || lowerContent.includes('blood')) tags.push('URGENT');
    if (lowerContent.includes('appointment') || lowerContent.includes('book') || lowerContent.includes('schedule')) tags.push('APPOINTMENT');
    if (lowerContent.includes('price') || lowerContent.includes('cost') || lowerContent.includes('bill') || lowerContent.includes('invoice')) tags.push('BILLING');
    if (lowerContent.includes('food') || lowerContent.includes('toy') || lowerContent.includes('shop') || lowerContent.includes('buy')) tags.push('STORE');

    const msg: ChatMessage = {
      id: `msg${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      clientId: state.currentUser.clientId,
      tenantId: state.currentUser.tenantId,
      sender: 'CLIENT',
      senderName: state.currentUser.name,
      content: content,
      timestamp: now.toISOString(),
      sessionId: sessionId,
      tags: tags.length > 0 ? tags : undefined
    };
    dispatch({ type: 'SEND_CHAT', payload: msg });
  };

  const handleRenewalSuccess = async (txId: string) => {
    if (!currentTenant) return;
    const cycle = currentTenant.billingCycle || 'Monthly';
    const planConfig = FLUTTERWAVE_PLANS[currentTenant.plan][cycle];
    try {
      const verified = await backend.verifyPayment(txId, planConfig);
      if (verified) {
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + (currentTenant.billingCycle === 'Monthly' ? 1 : 12));

        dispatch({
          type: 'UPDATE_TENANT',
          payload: {
            id: currentTenant.id,
            subscriptionStatus: 'ACTIVE',
            isTrial: false,
            autoRenew: true,
            nextPaymentDate: nextDate.toISOString(),
            subscriptionId: txId
          }
        });
        alert("Subscription Renewed! Access Restored.");
      } else {
        alert("Payment verification failed. Please contact support.");
      }
    } catch (e) {
      alert("Error verifying payment.");
    }
  };

  const handlePasswordResetSuccess = () => {
    setResetToken(null);
    window.history.replaceState({}, document.title, "/");
    setAuthView('login');
  };

  if (isLoading) return <LoadingScreen />;
  if (resetToken) return <ResetPassword token={resetToken} onSuccess={handlePasswordResetSuccess} />;

  if (!state.currentUser) {
    return authView === 'login'
      ? <Login state={state} onLogin={handleLogin} onSwitchToSignup={() => setAuthView('signup')} />
      : <SignupWizard onComplete={handleSignupComplete} onCancel={() => setAuthView('login')} />;
  }

  if (isSubscriptionExpired && state.currentUser.role !== UserRole.SUPER_ADMIN) {
    if (state.currentUser.role === UserRole.PARENT_ADMIN && currentTenant) {
      return <SubscriptionLockScreen tenant={currentTenant} user={state.currentUser} onPaymentSuccess={handleRenewalSuccess} onLogout={() => dispatch({ type: 'LOGOUT' })} />;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Clinic Access Suspended</h2>
        <p className="text-slate-500 mt-2">Please contact your system administrator.</p>
        <button onClick={() => dispatch({ type: 'LOGOUT' })} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg">Sign Out</button>
      </div>
    );
  }

  if (state.currentUser.role === UserRole.PET_OWNER) {
    const tenant = state.tenants.find(t => t.id === state.currentUser?.tenantId);
    const planFeatures = tenant ? getPlanFeatures(tenant.plan, tenant.isTrial) : null;
    if (planFeatures && !planFeatures.clientPortal) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-center">
          <ShieldAlert className="w-16 h-16 text-slate-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Portal Not Available</h2>
          <p className="text-slate-500 mt-2 max-w-md">Client portal is not enabled for this clinic's current plan.</p>
          <button onClick={() => dispatch({ type: 'LOGOUT' })} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg">Sign Out</button>
        </div>
      );
    }
    return <ClientPortal state={state} user={state.currentUser} onLogout={() => dispatch({ type: 'LOGOUT' })} onSendMessage={handlePortalMessage} dispatch={dispatch} />;
  }

  if (state.currentUser.role === UserRole.SUPER_ADMIN) {
    return <SuperAdmin state={state} dispatch={dispatch} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard state={state} onNavigate={setCurrentView} onToggleNotifications={() => setIsNotifOpen(!isNotifOpen)} onNavigateToClient={(id) => { setNavClientId(id); setCurrentView('clients'); }} />;
      case 'schedule': return <AppointmentManager state={state} dispatch={dispatch} />;
      case 'consultations': return <ConsultationManager state={state} dispatch={dispatch} />;
      case 'services': return <ServiceManager state={state} dispatch={dispatch} />;
      case 'labs': return <LabManager state={state} dispatch={dispatch} />;
      case 'inventory': return <InventoryManager state={state} dispatch={dispatch} />;
      case 'pos': return <PointOfSale state={state} dispatch={dispatch} />;
      case 'expenses': return <ExpenseManager state={state} dispatch={dispatch} onNavigate={setCurrentView} />;
      case 'reports': return <ReportsAnalytics state={state} />;
      case 'compliance': return <ComplianceManager state={state} onNavigate={setCurrentView} />;
      case 'clients': return <ClientManager state={state} dispatch={dispatch} initialClientId={navClientId} onClearInitialClient={() => setNavClientId(null)} />;
      case 'patients': return <PatientManager state={state} dispatch={dispatch} />;
      case 'finance': return <Finance state={state} dispatch={dispatch} />;
      case 'sales-history': return <SalesHistory state={state} dispatch={dispatch} />;
      case 'orders': return <OrderManager state={state} dispatch={dispatch} />;
      case 'staff': return <StaffManager state={state} dispatch={dispatch} onNavigate={setCurrentView} />;
      case 'staff-chat': return (
        <StaffChat
          state={state}
          currentUser={state.currentUser!}
          onClose={() => setCurrentView('dashboard')}
          onSendMessage={(msg) => dispatch({ type: 'SEND_STAFF_CHAT', payload: msg })}
        />
      );
      case 'settings': return <SettingsManager state={state} onNavigate={setCurrentView} dispatch={dispatch} />;
      case 'branches': return <BranchManager state={state} dispatch={dispatch} onNavigate={setCurrentView} />;
      case 'admin': return <Admin state={state} onNavigate={setCurrentView} />;
      default: return <Dashboard state={state} onNavigate={setCurrentView} />;
    }
  };

  const isDashboard = currentView === 'dashboard';

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'schedule', icon: CalendarIcon, label: 'Schedule' },
    { id: 'patients', icon: Users, label: 'Patients' },
    { id: 'clients', icon: Users, label: 'Clients' },
    { id: 'consultations', icon: Stethoscope, label: 'Consults' },
    { id: 'pos', icon: ShoppingCart, label: 'Sales' },
    { id: 'sales-history', icon: History, label: 'History' },
    { id: 'inventory', icon: Package, label: 'Stock' },
    { id: 'orders', icon: Truck, label: 'Orders' },
    { id: 'reports', icon: TrendingUp, label: 'Analytics', roles: [UserRole.PARENT_ADMIN, UserRole.ADMIN, UserRole.VET] },
    { id: 'staff', icon: Users, label: 'Staff', roles: [UserRole.PARENT_ADMIN, UserRole.ADMIN] },
    { id: 'settings', icon: Settings, label: 'Settings', roles: [UserRole.PARENT_ADMIN, UserRole.ADMIN] },
  ].filter(item => {
    if (!item.roles) return true;
    const userRoles = state.currentUser?.roles || [state.currentUser?.role];
    return item.roles.some(role => userRoles.includes(role));
  });

  return (
    <div className="flex flex-col h-screen bg-[#f8fbff] font-sans text-slate-700 overflow-hidden premium-gradient-bg">
      {isPaymentDue && state.currentUser.role === UserRole.PARENT_ADMIN && (
        <div className="bg-rose-500 text-white text-[10px] font-semibold py-2 px-4 text-center flex items-center justify-center gap-2 animate-pulse z-50">
          <AlertCircle className="w-3 h-3" />
          <span>Payment due on {new Date(currentTenant!.nextPaymentDate!).toLocaleDateString()}. Please renew subscription.</span>
        </div>
      )}

      {/* Top Header - Only for non-dashboard views */}
      {!isDashboard && (
        <header className="h-16 flex items-center justify-between px-6 bg-white/60 backdrop-blur-2xl border-b border-white/20 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="p-2.5 text-indigo-600 bg-indigo-50/50 rounded-2xl hover:bg-indigo-100 transition-all hover:scale-105 active:scale-95"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xs font-semibold text-slate-400 mb-0.5">Clinic Management</h2>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-none">{toTitleCase(currentView)}</h2>
            </div>
            {canSwitchBranch && state.branches.filter(b => b.tenantId === state.currentTenantId && b.active).length > 1 && (
              <div className="hidden md:flex items-center gap-2 ml-6 px-4 py-2 bg-white/50 rounded-2xl border border-white/50 shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                <select
                  value={state.currentBranchId}
                  onChange={(e) => dispatch({ type: 'SWITCH_BRANCH', payload: e.target.value })}
                  className="bg-transparent text-[11px] font-semibold text-slate-600 focus:outline-none cursor-pointer tracking-wider"
                >
                  {state.branches.filter(b => b.tenantId === state.currentTenantId && b.active).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={handleManualRefresh} className={`p-3 bg-white/50 rounded-2xl shadow-sm text-slate-400 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setIsChatOpen(true)} className="p-3 bg-white/50 rounded-2xl shadow-sm text-slate-400 hover:text-teal-600 transition-all hover:scale-105 active:scale-95">
              <MessageSquare className="w-5 h-5" />
            </button>
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-3 bg-white/50 rounded-2xl shadow-sm text-slate-400 relative hover:text-indigo-600 transition-all hover:scale-105 active:scale-95">
              <Bell className="w-5 h-5" />
              {state.notifications.some(n => !n.isRead) && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <div className="w-[1px] h-8 bg-slate-200 mx-1 hidden sm:block"></div>
            <button onClick={() => setIsProfileOpen(true)} className="p-1 px-2 pr-4 bg-white/50 rounded-2xl shadow-sm text-slate-400 hover:text-purple-600 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border border-white/50">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                {state.currentUser.name.charAt(0)}
              </div>
              <span className="text-[10px] font-bold text-slate-700 hidden sm:block">{state.currentUser.role}</span>
            </button>
            <button
              onClick={() => dispatch({ type: 'LOGOUT' })}
              className="p-3 bg-white/50 rounded-2xl shadow-sm text-slate-400 hover:text-rose-500 transition-all hover:scale-105 active:scale-95 border border-white/50"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* Main Content - Full Screen */}
      <main className={`flex-1 overflow-y-auto overflow-x-hidden ${isDashboard ? 'p-0' : 'p-4 pb-20 sm:pb-4'} custom-scrollbar scroll-smooth`}>
        {renderContent()}
      </main>

      {/* Floating Bottom Navigation - Premium Mobile Style */}
      {!isDashboard && (
        <nav className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-slate-900/90 backdrop-blur-2xl px-6 py-4 rounded-[2.5rem] z-40 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 flex items-center justify-between">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${currentView === item.id ? 'text-blue-400 scale-110' : 'text-slate-400 opacity-60'}`}
            >
              <item.icon className={`w-5 h-5 ${currentView === item.id ? 'stroke-[2.5px]' : ''}`} />
              <span className={`text-[8px] font-semibold tracking-widest ${currentView === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Floating Notifications Drawer */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsNotifOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Notifications</h3>
              <button onClick={() => setIsNotifOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl">
                <RefreshCw className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {state.notifications.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-400">No alerts today</p>
                </div>
              ) : (
                state.notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      dispatch({ type: 'MARK_NOTIFICATION_READ', payload: n.id });
                      if (n.type === 'CHAT' && n.metadata?.clientId) {
                        setNavClientId(n.metadata.clientId);
                        setCurrentView('clients');
                      } else if (n.title.toLowerCase().includes('order')) {
                        setCurrentView('orders');
                      }
                      setIsNotifOpen(false);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group ${!n.isRead ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-50 hover:border-indigo-100'}`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${n.type === 'CHAT' ? 'bg-teal-100 text-teal-600' : n.title.toLowerCase().includes('order') ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        {n.type === 'CHAT' ? <MessageSquare className="w-5 h-5" /> : n.title.toLowerCase().includes('order') ? <Truck className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">{n.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-slate-100">
              <button onClick={() => dispatch({ type: 'CLEAR_NOTIFICATIONS' })} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-colors">
                Clear and Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {isProfileOpen && state.currentUser && (
        <UserProfile
          user={state.currentUser}
          state={state}
          onClose={() => setIsProfileOpen(false)}
          onUpdate={(updatedUser) => {
            dispatch({ type: 'UPDATE_USER', payload: updatedUser });
          }}
        />
      )}

      {/* Staff Chat Modal */}
      {isChatOpen && state.currentUser && (
        <StaffChat
          currentUser={state.currentUser}
          state={state}
          onClose={() => setIsChatOpen(false)}
          onSendMessage={(message) => {
            dispatch({ type: 'SEND_STAFF_CHAT', payload: message });
          }}
        />
      )}
    </div>
  );
}
