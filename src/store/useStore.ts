// src/store/useStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Court, Booking, CourtTab, TabItem, InventoryItem,
  DiscountType, Task, ActivityEntry, AppSettings,
  DiscountApplication, CheckoutData
} from '@/types';
import {
  INITIAL_COURTS, INITIAL_BOOKINGS, INITIAL_TABS,
  INITIAL_INVENTORY, INITIAL_DISCOUNTS, INITIAL_TASKS,
  INITIAL_ACTIVITY, INITIAL_SETTINGS
} from '@/data/mockData';
import { generateId, calculateCourtCharge } from '@/utils';

interface AppState {
  // Data
  courts: Court[];
  bookings: Booking[];
  tabs: CourtTab[];
  inventory: InventoryItem[];
  discounts: DiscountType[];
  tasks: Task[];
  activityLog: ActivityEntry[];
  settings: AppSettings;
  completedCheckouts: CheckoutData[];

  // Auth
  isLoggedIn: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;

  // Courts
  updateCourt: (courtId: string, updates: Partial<Court>) => void;

  // Bookings
  createBooking: (data: Omit<Booking, 'id' | 'createdAt' | 'status' | 'totalCharge' | 'paymentStatus'>) => void;
  updateBooking: (bookingId: string, updates: Partial<Booking>) => void;
  endBooking: (bookingId: string) => void;
  cancelBooking: (bookingId: string) => void;
  extendBooking: (bookingId: string, additionalHours: number) => void;
  moveBooking: (bookingId: string, newCourtId: string) => void;
  markPaid: (bookingId: string) => void;

  // Tabs
  addItemToTab: (courtId: string, item: Omit<TabItem, 'id'>) => void;
  removeItemFromTab: (courtId: string, itemId: string) => void;
  updateItemQuantity: (courtId: string, itemId: string, quantity: number) => void;
  applyDiscount: (courtId: string, discount: DiscountApplication | null) => void;
  checkout: (checkoutData: CheckoutData) => void;

  // Inventory
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (itemId: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (itemId: string) => void;
  restockItem: (itemId: string, amount: number) => void;

  // Discounts
  addDiscountType: (discount: Omit<DiscountType, 'id'>) => void;
  updateDiscountType: (discountId: string, updates: Partial<DiscountType>) => void;
  deleteDiscountType: (discountId: string) => void;

  // Tasks
  toggleTask: (taskId: string) => void;
  resetTasks: () => void;

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Activity
  addActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void;

  // Selectors
  getCourtTab: (courtId: string) => CourtTab | undefined;
  getActiveBooking: (courtId: string) => Booking | undefined;
  getTabTotal: (courtId: string) => number;
  getCourtCharge: (courtId: string) => number;
  getTodayRevenue: () => number;
  getTodayBookings: () => number;
  getLowStockItems: () => InventoryItem[];
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
  courts: INITIAL_COURTS,
  bookings: INITIAL_BOOKINGS,
  tabs: INITIAL_TABS,
  inventory: INITIAL_INVENTORY,
  discounts: INITIAL_DISCOUNTS,
  tasks: INITIAL_TASKS,
  activityLog: INITIAL_ACTIVITY,
  settings: INITIAL_SETTINGS,
  completedCheckouts: [],

  isLoggedIn: false,

  login: (email, password) => {
    if (email === 'admin@thecourtyard.in' && password === 'password123') {
      set({ isLoggedIn: true });
      return true;
    }
    return false;
  },

  logout: () => set({ isLoggedIn: false }),

  updateCourt: (courtId, updates) =>
    set((state) => ({
      courts: state.courts.map((c) => (c.id === courtId ? { ...c, ...updates } : c)),
    })),

  createBooking: (data) => {
    const id = `booking-${generateId()}`;
    const court = get().courts.find((c) => c.id === data.courtId);
    const hourlyRate = court?.hourlyRate ?? 500;
    const totalCharge = (data.duration / 60) * hourlyRate;

    const booking: Booking = {
      ...data,
      id,
      totalCharge,
      status: 'active',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
    };

    const newTab: CourtTab = {
      courtId: data.courtId,
      bookingId: id,
      items: [],
      discount: null,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      bookings: [...state.bookings, booking],
      tabs: [...state.tabs, newTab],
      courts: state.courts.map((c) =>
        c.id === data.courtId ? { ...c, status: 'occupied' } : c
      ),
    }));

    get().addActivity({
      message: `New booking: ${data.customerName} → ${court?.name ?? data.courtId}`,
      type: 'booking',
    });
  },

  updateBooking: (bookingId, updates) =>
    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, ...updates } : b)),
    })),

  endBooking: (bookingId) => {
    const booking = get().bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'completed' } : b
      ),
      courts: state.courts.map((c) =>
        c.id === booking.courtId ? { ...c, status: 'available' } : c
      ),
      tabs: state.tabs.filter((t) => t.bookingId !== bookingId),
    }));
  },

  cancelBooking: (bookingId) => {
    const booking = get().bookings.find((b) => b.id === bookingId);
    if (!booking) return;
    // Check if any other active booking is on this court before freeing it
    const otherActive = get().bookings.some(
      (b) => b.id !== bookingId && b.courtId === booking.courtId && b.status === 'active'
    );
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'cancelled' } : b
      ),
      courts: otherActive ? state.courts : state.courts.map((c) =>
        c.id === booking.courtId ? { ...c, status: 'available' } : c
      ),
      tabs: state.tabs.filter((t) => t.bookingId !== bookingId),
    }));
    get().addActivity({ message: `Booking cancelled: ${booking.customerName}`, type: 'booking' });
  },

  extendBooking: (bookingId, additionalHours) => {
    const booking = get().bookings.find((b) => b.id === bookingId);
    if (!booking) return;
    const newEnd = new Date(new Date(booking.endTime).getTime() + additionalHours * 3600000);
    const court = get().courts.find((c) => c.id === booking.courtId);
    const newCharge = booking.totalCharge + additionalHours * (court?.hourlyRate ?? 500);
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId
          ? { ...b, endTime: newEnd.toISOString(), duration: b.duration + additionalHours * 60, totalCharge: newCharge }
          : b
      ),
    }));
    get().addActivity({ message: `Booking extended by ${additionalHours}h: ${booking.customerName}`, type: 'booking' });
  },

  moveBooking: (bookingId, newCourtId) => {
    const booking = get().bookings.find((b) => b.id === bookingId);
    if (!booking || booking.courtId === newCourtId) return;
    const oldCourtId = booking.courtId;
    const newCourt = get().courts.find((c) => c.id === newCourtId);
    // Update the booking
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, courtId: newCourtId } : b
      ),
      // Move the tab
      tabs: state.tabs.map((t) =>
        t.bookingId === bookingId ? { ...t, courtId: newCourtId } : t
      ),
      // Update court statuses
      courts: state.courts.map((c) => {
        if (c.id === oldCourtId) return { ...c, status: 'available' as const };
        if (c.id === newCourtId) return { ...c, status: 'occupied' as const };
        return c;
      }),
    }));
    get().addActivity({ message: `Booking moved to ${newCourt?.name}: ${booking.customerName}`, type: 'booking' });
  },

  markPaid: (bookingId) => {
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, paymentStatus: 'paid' } : b
      ),
    }));
  },

  addItemToTab: (courtId, item) => {
    // Decrease inventory
    set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.courtId !== courtId) return tab;
        const existing = tab.items.find((i) => i.inventoryItemId === item.inventoryItemId);
        if (existing) {
          return {
            ...tab,
            items: tab.items.map((i) =>
              i.inventoryItemId === item.inventoryItemId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          };
        }
        return {
          ...tab,
          items: [...tab.items, { ...item, id: `ti-${generateId()}` }],
        };
      });

      const inventory = state.inventory.map((inv) =>
        inv.id === item.inventoryItemId
          ? { ...inv, stock: Math.max(0, inv.stock - item.quantity) }
          : inv
      );

      return { tabs, inventory };
    });

    const court = get().courts.find((c) => c.id === courtId);
    get().addActivity({
      message: `Sold ${item.name} ×${item.quantity} → ${court?.name ?? courtId} tab`,
      type: 'inventory',
    });
  },

  removeItemFromTab: (courtId, itemId) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.courtId === courtId
          ? { ...tab, items: tab.items.filter((i) => i.id !== itemId) }
          : tab
      ),
    })),

  updateItemQuantity: (courtId, itemId, quantity) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.courtId === courtId
          ? {
              ...tab,
              items:
                quantity <= 0
                  ? tab.items.filter((i) => i.id !== itemId)
                  : tab.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
            }
          : tab
      ),
    })),

  applyDiscount: (courtId, discount) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.courtId === courtId ? { ...tab, discount } : tab
      ),
    })),

  checkout: (checkoutData) => {
    const { bookingId, courtId } = checkoutData;
    set((state) => ({
      completedCheckouts: [...state.completedCheckouts, checkoutData],
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'completed' } : b
      ),
      courts: state.courts.map((c) =>
        c.id === courtId ? { ...c, status: 'available' } : c
      ),
      tabs: state.tabs.filter((t) => t.bookingId !== bookingId),
    }));

    const court = get().courts.find((c) => c.id === courtId);
    get().addActivity({
      message: `Checkout: ${court?.name} — ₹${checkoutData.grandTotal} via ${checkoutData.paymentMethod.toUpperCase()}`,
      type: 'checkout',
    });
  },

  addInventoryItem: (item) =>
    set((state) => ({
      inventory: [...state.inventory, { ...item, id: `inv-${generateId()}` }],
    })),

  updateInventoryItem: (itemId, updates) =>
    set((state) => ({
      inventory: state.inventory.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
    })),

  deleteInventoryItem: (itemId) =>
    set((state) => ({
      inventory: state.inventory.filter((i) => i.id !== itemId),
    })),

  restockItem: (itemId, amount) =>
    set((state) => ({
      inventory: state.inventory.map((i) =>
        i.id === itemId ? { ...i, stock: i.stock + amount } : i
      ),
    })),

  addDiscountType: (discount) =>
    set((state) => ({
      discounts: [...state.discounts, { ...discount, id: `disc-${generateId()}` }],
    })),

  updateDiscountType: (discountId, updates) =>
    set((state) => ({
      discounts: state.discounts.map((d) => (d.id === discountId ? { ...d, ...updates } : d)),
    })),

  deleteDiscountType: (discountId) =>
    set((state) => ({
      discounts: state.discounts.filter((d) => d.id !== discountId),
    })),

  toggleTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : null,
              completedBy: !t.completed ? state.settings.currentUser : null,
            }
          : t
      ),
    })),

  resetTasks: () =>
    set((state) => ({
      tasks: state.tasks.map((t) => ({
        ...t,
        completed: false,
        completedAt: null,
        completedBy: null,
      })),
    })),

  updateSettings: (updates) =>
    set((state) => ({
      settings: { ...state.settings, ...updates },
    })),

  addActivity: (entry) =>
    set((state) => ({
      activityLog: [
        { ...entry, id: `a-${generateId()}`, timestamp: new Date().toISOString() },
        ...state.activityLog,
      ].slice(0, 50),
    })),

  // Selectors
  getCourtTab: (courtId) => get().tabs.find((t) => t.courtId === courtId && t.status === 'open'),

  getActiveBooking: (courtId) =>
    get().bookings.find((b) => b.courtId === courtId && b.status === 'active'),

  getTabTotal: (courtId) => {
    const tab = get().getCourtTab(courtId);
    if (!tab) return 0;
    return tab.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  },

  getCourtCharge: (courtId) => {
    const booking = get().getActiveBooking(courtId);
    const court = get().courts.find((c) => c.id === courtId);
    if (!booking || !court) return 0;
    return calculateCourtCharge(booking.startTime, court.hourlyRate);
  },

  getTodayRevenue: () => {
    const today = new Date().toDateString();
    return get().completedCheckouts
      .filter((c) => new Date(c.courtId).toDateString() === today || true) // all for demo
      .reduce((sum, c) => sum + c.grandTotal, 0);
  },

  getTodayBookings: () => {
    const today = new Date().toDateString();
    return get().bookings.filter(
      (b) => new Date(b.createdAt).toDateString() === today
    ).length;
  },

  getLowStockItems: () =>
    get().inventory.filter((i) => i.stock <= i.minStock),
    }),
    {
      name: 'thecourtyard-storage',
    }
  )
);
