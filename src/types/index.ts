export type UserRole = 'employee' | 'admin';

export type OrderStatus =
  | 'PLACED'
  | 'PAYMENT_VERIFYING'
  | 'PAYMENT_VERIFIED'
  | 'QUEUED'
  | 'ACCEPTED'
  | 'COOKING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  department?: string;
  photoURL?: string | null;
  seatCode?: string | null;
  profileComplete?: boolean;
  fcmTokens?: string[];
  createdAt?: number;
  updatedAt?: number;
}

export interface AddonOption {
  name: string;
  priceDelta: number;
  calorieDelta?: number;
}

export interface AddonGroup {
  groupName: string;
  required: boolean;
  multiSelect: boolean;
  options: AddonOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  calories: number; // approximate base calories
  healthTag: 'light' | 'balanced' | 'indulgent';
  imageUrl?: string;
  category: 'HEALTHY SNACKS' | 'SANDWICHES' | 'MAGGI / PASTA' | 'BEVERAGES' | 'SPECIALS';
  isAvailable: boolean;
  addonGroups?: AddonGroup[];
  sortOrder: number;
}

export interface SelectedAddon {
  groupName: string;
  optionName: string;
  priceDelta: number;
  calorieDelta?: number;
}

export interface OrderItem {
  itemId: string;
  name: string;
  basePrice: number;
  baseCalories?: number;
  selectedAddons: SelectedAddon[];
  lineTotal: number;
  lineCalories?: number;
  quantity: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: number;
  actorUid?: string;
}

export interface Order {
  id: string;
  employeeId: string;
  employeeName: string;
  seatCode: string;
  items: OrderItem[];
  totalAmount: number;
  totalCalories: number;
  paymentProofUrl?: string;
  status: OrderStatus;
  rejectionReason?: string | null;
  createdAt: number;
  statusUpdatedAt: number;
  statusHistory: StatusHistoryEntry[];
  idempotencyKey?: string;
  ringingSince?: number | null;
  queuedAt?: number | null;
  paymentAudit?: PaymentAuditInfo;
}

export interface PaymentAuditInfo {
  imageHash?: string;
  isDuplicate?: boolean;
  duplicateOrderId?: string;
  fileAgeMinutes?: number;
  isStale?: boolean;
  detectedAmount?: number | null;
  amountMatches?: boolean | null;
  refNoteMatched?: boolean;
  extractedSnippet?: string;
}

export interface KitchenStatus {
  isOpen: boolean;
  closedMessage?: string | null;
  lastToggledBy?: string | null;
  lastToggledAt?: number | null;
}

export interface DailyIntake {
  uid: string;
  date: string; // YYYY-MM-DD (IST)
  totalCalories: number;
  orderIds: string[];
  updatedAt?: any;
}

export interface HealthConfig {
  dailyCalorieBudget: number; // default 600
}

export interface SeatInfo {
  seatCode: string;
  zone: 'A' | 'B' | 'C' | 'D';
  label?: string;
}

export interface PaymentConfig {
  upiId: string;
  payeeName: string;
  qrImageUrl?: string;
}
