
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PARENT_ADMIN = 'PARENT_ADMIN',
  ADMIN = 'ADMIN',
  VET = 'VET',
  NURSE = 'NURSE',
  RECEPTION = 'RECEPTION',
  PET_OWNER = 'PET_OWNER'
}

export enum PlanTier {
  STARTER = 'STARTER',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM'
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  phone: string;
  active: boolean;
  latitude?: number;
  longitude?: number;
}

export interface Tenant {
  id: string;
  name: string;
  address: string;
  type: 'Companion' | 'Livestock' | 'Mixed';
  country: string;
  timezone: string;
  currency: string;
  plan: PlanTier;
  status: 'ACTIVE' | 'SUSPENDED';

  // Billing & Subscription
  subscriptionId?: string;
  paymentPlanId?: string;
  nextPaymentDate?: string; // ISO Date
  billingCycle?: 'Monthly' | 'Yearly';

  // Trial & Cancellation Logic
  isTrial?: boolean;
  autoRenew?: boolean; // If false, subscription ends at nextPaymentDate
  subscriptionStatus?: 'ACTIVE' | 'CANCELED' | 'EXPIRED';

  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    sortCode?: string;
  };
  deliveryConfig?: {
    baseFee: number;
    amountPerKm: number;
    freeDeliveryThreshold?: number;
    active: boolean;
  };
  storageUsed?: number;
  ramUsage?: number;
  features: {
    maxUsers: number;
    maxClients: number;
    aiEnabled: boolean;
    logsEnabled: boolean;
    printingEnabled: boolean;
    clientPortal: boolean;
  };
}

export interface User {
  id: string;
  title: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole; // Primary role (for backward compatibility)
  roles?: UserRole[]; // Multiple roles support - NEW!
  tenantId: string;
  branchId?: string;
  clientId?: string;
  phone?: string;
  joinedDate?: string;
  active?: boolean;
}

export interface Client {
  id: string;
  title: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  tenantId: string;
  branchId?: string;
  portalEnabled: boolean;
  balance: number;
  latitude?: number;
  longitude?: number;
}

export interface ChatMessage {
  id: string;
  clientId: string;
  tenantId: string;
  sender: 'CLIENT' | 'CLINIC';
  senderName: string;
  content: string;
  timestamp: string;
  isRead?: boolean;
  readAt?: string;
  hasAttachment?: boolean;
  sessionId?: string; // Grouping messages into sessions
  tags?: string[]; // Classification tags (e.g., 'Emergency', 'Billing', 'Follow-up')
}

export interface StaffChatMessage {
  id: string;
  fromUserId: string;
  toUserId?: string; // undefined means broadcast
  tenantId: string;
  branchId?: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  isBroadcast: boolean;
}

export interface AppNotification {
  id: string;
  type: 'CHAT' | 'APPOINTMENT' | 'INVOICE';
  title: string;
  message: string;
  metadata?: any;
  isRead: boolean;
  timestamp: string;
  tenantId: string;
}

export type ProductCategory = 'Food' | 'Drugs' | 'Pet Products' | 'Equipment' | 'Consumables' | 'Other';

export interface InventoryBatch {
  id: string;
  itemId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  wholesalePrice?: number;
  unitPrice: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  barcode?: string;
  regulatoryNumber?: string;
  category: ProductCategory;
  unit: string;
  totalStock: number;
  minLevel: number;
  batches: InventoryBatch[];
  tenantId: string;
  branchId: string;
  salesCount?: number;
  visibleToClient?: boolean;
  clientPrice?: number;
  wholesalePrice?: number;
  purchasePrice?: number;
  image?: string;
}

export type PaymentMethod = 'CARD' | 'TRANSFER' | 'ONLINE' | 'CASH';

export interface SaleItem {
  itemId: string;
  itemName: string;
  batchId?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  date: string;
  clientId?: string;
  clientName: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  tenantId: string;
  branchId: string;
  status: 'COMPLETED' | 'REFUNDED' | 'VOIDED';
}

export type ServiceCategory = 'Treatment' | 'Prophylaxis' | 'Surgery' | 'Diagnostics' | 'Consultation' | 'Laboratory' | 'Grooming' | 'Boarding' | 'Other';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description?: string;
  costInternal: number;
  priceClient: number;
  profit: number;
  visibleToClient: boolean;
  isActive: boolean;
  usageCount: number;
  tenantId: string;
}

export type AppointmentStatus = 'Pending' | 'Scheduled' | 'Completed' | 'Cancelled' | 'Missed';
export type ReminderChannel = 'SMS' | 'WhatsApp' | 'Email' | 'App Chat';

export interface Appointment {
  id: string;
  clientId?: string;
  clientName: string;
  patientId?: string;
  patientName: string;
  date: string;
  visitType: string;
  assignedStaffId: string;
  assignedStaffName: string;
  status: AppointmentStatus;
  reminderChannels: ReminderChannel[];
  walkInDetails?: string;
  tenantId: string;
  branchId: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  tenantId: string;
  branchId?: string;
}

export interface MedicalNote {
  id: string;
  date: string;
  author: string;
  content: string;
  isAddendum: boolean;
}

export type PatientType = 'Single' | 'Herd';
export type PatientStatus = 'Active' | 'Archived' | 'Deceased';

export interface Attachment {
  id: string;
  type: 'LAB' | 'XRAY' | 'ULTRASOUND' | 'PHOTO' | 'OTHER';
  title: string;
  date: string;
  url?: string;
}

export interface Reminder {
  id: string;
  type: 'VACCINATION' | 'DEWORMING' | 'FOLLOWUP';
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface Patient {
  id: string;
  name: string;
  type: PatientType;
  species: string;
  breed: string;
  sex: string;
  age: string;
  identificationTag?: string;
  chipNumber?: string;
  ownerId: string;
  ownerName: string;
  tenantId: string;
  branchId?: string;
  status: PatientStatus;
  notes: MedicalNote[];
  attachments: Attachment[];
  reminders: Reminder[];
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  ADJUSTED = 'ADJUSTED',
  REFUNDED = 'REFUNDED',
  VOIDED = 'VOIDED'
}

export interface InvoiceItem {
  description: string;
  cost: number;
}

export interface Invoice {
  id: string;
  patientId?: string;
  patientName: string;
  clientId: string;
  clientName: string;
  date: string;
  items: InvoiceItem[];
  total: number;
  status: InvoiceStatus;
  tenantId: string;
  branchId: string;
  adjustmentReason?: string;
}

export interface ConsultationService {
  id: string;
  type: 'DRUG' | 'PROCEDURE' | 'LAB_REQUEST' | 'SERVICE';
  name: string;
  cost: number;
}

export interface Vitals {
  weight?: string;
  temperature?: string;
  respiratoryRate?: string;
  mucusMembrane?: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  vetId: string;
  vetName: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vitals?: Vitals;
  aiDiagnosisSuggestion?: string;
  services: ConsultationService[];
  invoiceId?: string;
  status?: 'DRAFT' | 'COMPLETED';
  nextVisitDate?: string;
  tenantId: string;
  branchId: string;
}

export type LabPriority = 'ROUTINE' | 'URGENT' | 'STAT';
export type LabStatus = 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface LabRequest {
  id: string;
  patientId: string;
  patientName: string;
  testName: string;
  priority: LabPriority;
  requestDate: string;
  notes: string;
  status: LabStatus;
  resultFindings?: string;
  resultInterpretation?: string;
  resultDate?: string;
  tenantId: string;
  branchId: string;
}

export type ExpenseCategory = 'Supplies' | 'Salaries' | 'Rent' | 'Utilities' | 'Equipment' | 'Marketing' | 'Other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  paidBy: string;
  paymentMethod?: string;
  notes?: string;
  tenantId: string;
  branchId: string;
}

export interface Budget {
  id: string;
  category: ExpenseCategory;
  monthlyLimit: number;
  tenantId: string;
  branchId?: string;
}

export interface OrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  items: OrderItem[];
  total: number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  date: string;
  tenantId: string;
  branchId: string;
  shippingAddress?: string;
  phoneNumber?: string;
  paymentMethod?: string;
  deliveryFee?: number;
}

export interface AppState {
  users: User[];
  tenants: Tenant[];
  branches: Branch[];
  logs: AuditLog[];
  clients: Client[];
  patients: Patient[];
  invoices: Invoice[];
  inventory: InventoryItem[];
  sales: Sale[];
  services: Service[];
  appointments: Appointment[];
  chats: ChatMessage[];
  notifications: AppNotification[];
  consultations: Consultation[];
  labRequests: LabRequest[];
  expenses: Expense[];
  budgets: Budget[];
  orders: Order[];
  staffMessages: StaffChatMessage[];
  currentUser: User | null;
  currentTenantId: string;
  currentBranchId: string;
}
