export type UserRole = 'employee' | 'admin';

export type OrderStatus =
  | 'PLACED'
  | 'PAYMENT_VERIFYING'
  | 'ACCEPTED'
  | 'COOKING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'REJECTED';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  seatCode?: string;
  fcmTokens?: string[];
  createdAt?: number;
}

export interface AddonOption {
  name: string;
  priceDelta: number;
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
}

export interface OrderItem {
  itemId: string;
  name: string;
  basePrice: number;
  selectedAddons: SelectedAddon[];
  lineTotal: number;
  quantity: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: number;
}

export interface Order {
  id: string;
  employeeId: string;
  employeeName: string;
  seatCode: string;
  items: OrderItem[];
  totalAmount: number;
  paymentProofUrl?: string;
  status: OrderStatus;
  rejectionReason?: string | null;
  createdAt: number;
  statusUpdatedAt: number;
  statusHistory: StatusHistoryEntry[];
  idempotencyKey?: string;
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
