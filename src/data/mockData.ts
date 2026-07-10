// src/data/mockData.ts
import type {
  Court, Booking, CourtTab, InventoryItem, DiscountType,
  Task, ActivityEntry, AppSettings
} from '@/types';

export const INITIAL_COURTS: Court[] = [
  {
    id: 'court-1',
    name: 'Court 1',
    status: 'available',
    hourlyRate: 500,
    isEnabled: true,
    isMaintenanceMode: false,
    color: '#0F5132',
  },
  {
    id: 'court-2',
    name: 'Court 2',
    status: 'available',
    hourlyRate: 500,
    isEnabled: true,
    isMaintenanceMode: false,
    color: '#166534',
  },
  {
    id: 'court-3',
    name: 'Court 3',
    status: 'available',
    hourlyRate: 600,
    isEnabled: true,
    isMaintenanceMode: false,
    color: '#10B981',
  },
];

export const INITIAL_BOOKINGS: Booking[] = [];

export const INITIAL_TABS: CourtTab[] = [];

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', name: 'Water', category: 'drinks', sellingPrice: 30, purchasePrice: 15, stock: 50, minStock: 20 },
  { id: 'inv-2', name: 'Gatorade', category: 'drinks', sellingPrice: 80, purchasePrice: 55, stock: 25, minStock: 10 },
  { id: 'inv-3', name: 'Coca-Cola', category: 'drinks', sellingPrice: 50, purchasePrice: 30, stock: 30, minStock: 12 },
  { id: 'inv-4', name: 'Sprite', category: 'drinks', sellingPrice: 50, purchasePrice: 30, stock: 30, minStock: 12 },
  { id: 'inv-5', name: 'Red Bull', category: 'drinks', sellingPrice: 120, purchasePrice: 90, stock: 15, minStock: 8 },
  { id: 'inv-6', name: 'Coffee', category: 'drinks', sellingPrice: 60, purchasePrice: 20, stock: 40, minStock: 10 },
  { id: 'inv-7', name: 'Tea', category: 'drinks', sellingPrice: 40, purchasePrice: 10, stock: 40, minStock: 10 },
  { id: 'inv-8', name: 'Chips', category: 'food', sellingPrice: 50, purchasePrice: 30, stock: 30, minStock: 15 },
  { id: 'inv-9', name: 'Protein Bar', category: 'food', sellingPrice: 90, purchasePrice: 60, stock: 20, minStock: 10 },
  { id: 'inv-10', name: 'Energy Drink', category: 'drinks', sellingPrice: 100, purchasePrice: 70, stock: 15, minStock: 8 },
  { id: 'inv-11', name: 'Pickle Balls (Pack)', category: 'equipment', sellingPrice: 350, purchasePrice: 200, stock: 10, minStock: 3 },
  { id: 'inv-12', name: 'Grip Tape', category: 'equipment', sellingPrice: 80, purchasePrice: 40, stock: 15, minStock: 5 },
];

export const INITIAL_DISCOUNTS: DiscountType[] = [
  { id: 'disc-1', name: 'Friends & Family', type: 'percentage', value: 20, isActive: true },
  { id: 'disc-2', name: 'Staff Discount', type: 'percentage', value: 30, isActive: true },
  { id: 'disc-3', name: 'Coach Discount', type: 'percentage', value: 25, isActive: true },
  { id: 'disc-4', name: 'VIP Guest', type: 'percentage', value: 15, isActive: true },
  { id: 'disc-5', name: 'Tournament Offer', type: 'fixed', value: 200, isActive: true },
  { id: 'disc-6', name: 'Promotion', type: 'fixed', value: 100, isActive: true },
];

export const INITIAL_TASKS: Task[] = [
  // Opening
  { id: 't-1', label: 'Clean all courts', completed: false, completedAt: null, completedBy: null, type: 'opening' },
  { id: 't-2', label: 'Arrange paddles at reception', completed: false, completedAt: null, completedBy: null, type: 'opening' },
  { id: 't-3', label: 'Arrange balls on courts', completed: false, completedAt: null, completedBy: null, type: 'opening' },
  { id: 't-4', label: 'Fill water dispensers', completed: false, completedAt: null, completedBy: null, type: 'opening' },
  { id: 't-5', label: 'Switch on all lights', completed: false, completedAt: null, completedBy: null, type: 'opening' },
  { id: 't-6', label: 'Verify POS system is working', completed: false, completedAt: null, completedBy: null, type: 'opening' },
  // Closing
  { id: 't-7', label: 'Count and record cash', completed: false, completedAt: null, completedBy: null, type: 'closing' },
  { id: 't-8', label: 'Verify all digital payments', completed: false, completedAt: null, completedBy: null, type: 'closing' },
  { id: 't-9', label: 'Clean all courts', completed: false, completedAt: null, completedBy: null, type: 'closing' },
  { id: 't-10', label: 'Switch off all lights', completed: false, completedAt: null, completedBy: null, type: 'closing' },
  { id: 't-11', label: 'Lock the facility', completed: false, completedAt: null, completedBy: null, type: 'closing' },
  { id: 't-12', label: 'Restock inventory', completed: false, completedAt: null, completedBy: null, type: 'closing' },
];

export const INITIAL_ACTIVITY: ActivityEntry[] = [];

export const INITIAL_SETTINGS: AppSettings = {
  facilityName: 'The Courtyard',
  currencySymbol: '₹',
  currentUser: 'Admin',
};
