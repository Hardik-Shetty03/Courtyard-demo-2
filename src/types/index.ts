// src/types/index.ts

export type CourtStatus = 'available' | 'occupied' | 'maintenance' | 'disabled';

export interface Court {
  id: string;
  name: string;
  status: CourtStatus;
  hourlyRate: number;
  isEnabled: boolean;
  isMaintenanceMode: boolean;
  color?: string;
}

export interface Booking {
  id: string;
  courtId: string;
  customerName: string;
  phone: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  duration: number;  // in minutes
  numberOfPlayers: number;
  notes: string;
  totalCharge: number;
  status: 'active' | 'completed' | 'cancelled';
  paymentStatus: 'paid' | 'unpaid';
  paymentMethod?: 'online' | 'cash';
  changeLog?: Array<{ user: string; timestamp: string; action: string }>;
  createdAt: string;
}

export interface TabItem {
  id: string;
  inventoryItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface DiscountApplication {
  discountTypeId: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  amount: number; // calculated discount amount
}

export interface CourtTab {
  courtId: string;
  bookingId: string;
  items: TabItem[];
  discount: DiscountApplication | null;
  status: 'open' | 'checked_out';
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'drinks' | 'food' | 'equipment' | 'other';
  sellingPrice: number;
  purchasePrice: number;
  stock: number;
  minStock: number;
  losses?: number;
}

export interface DiscountType {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
}

export interface Task {
  id: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
  type: 'opening' | 'closing';
}

export interface ActivityEntry {
  id: string;
  message: string;
  timestamp: string;
  type: 'booking' | 'checkout' | 'inventory' | 'task' | 'payment';
  icon?: string;
}

export interface AppSettings {
  facilityName: string;
  currencySymbol: string;
  currentUser: string;
}

export interface CheckoutData {
  courtId: string;
  bookingId: string;
  courtCharge: number;
  foodAndDrinks: number;
  discount: DiscountApplication | null;
  extraCharges: number;
  extraChargesNote: string;
  grandTotal: number;
  paymentMethod: 'cash' | 'upi' | 'card';
}

export interface TournamentParticipant {
  id: string;
  name: string;
  phone?: string;
}

export interface TournamentTabItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface TournamentTab {
  id: string;
  participantName: string;
  items: TournamentTabItem[];
}

export interface TournamentPayment {
  id: string;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'card';
  notes?: string;
  createdAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'ended';
  entryFee: number;
  participants: TournamentParticipant[];
  tabs: TournamentTab[];
  payments: TournamentPayment[];
  exported: boolean;
  createdAt: string;
}

