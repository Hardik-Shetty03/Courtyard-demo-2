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
import { generateId } from '@/utils';
import { supabase } from '@/lib/supabaseClient';

function safeUUID() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    try {
      return window.crypto.randomUUID();
    } catch (e) {
      // fallback to manual RFC4122 v4 generator
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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

  // Supabase Lifecycle
  initializeStore: () => Promise<void>;

  // Courts
  updateCourt: (courtId: string, updates: Partial<Court>) => Promise<void>;
  addCourt: (court: Omit<Court, 'id' | 'status' | 'isMaintenanceMode' | 'isEnabled'>) => Promise<void>;
  deleteCourt: (courtId: string) => Promise<void>;

  // Bookings
  createBooking: (data: Omit<Booking, 'id' | 'createdAt' | 'status' | 'totalCharge' | 'paymentStatus'>) => Promise<void>;
  updateBooking: (bookingId: string, updates: Partial<Booking>) => Promise<void>;
  endBooking: (bookingId: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  extendBooking: (bookingId: string, additionalHours: number) => Promise<void>;
  moveBooking: (bookingId: string, newCourtId: string) => Promise<void>;
  markPaid: (bookingId: string, paymentMethod: 'online' | 'cash', discount?: DiscountApplication | null) => Promise<void>;

  // Tabs
  addItemToTab: (courtId: string, item: Omit<TabItem, 'id'>) => Promise<void>;
  removeItemFromTab: (courtId: string, itemId: string) => Promise<void>;
  updateItemQuantity: (courtId: string, itemId: string, quantity: number) => Promise<void>;
  applyDiscount: (courtId: string, discount: DiscountApplication | null) => Promise<void>;
  checkout: (checkoutData: CheckoutData) => Promise<void>;

  // Inventory
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  restockItem: (itemId: string, amount: number) => Promise<void>;

  // Discounts
  addDiscountType: (discount: Omit<DiscountType, 'id'>) => void;
  updateDiscountType: (discountId: string, updates: Partial<DiscountType>) => void;
  deleteDiscountType: (discountId: string) => void;

  // Tasks
  toggleTask: (taskId: string) => Promise<void>;
  resetTasks: () => Promise<void>;

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
  clearAllData: () => Promise<void>;
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

      initializeStore: async () => {
        try {
          // 0. Auto-clean bookings older than 50 days to conserve database space
          const fiftyDaysAgo = new Date();
          fiftyDaysAgo.setDate(fiftyDaysAgo.getDate() - 50);
          const { error: cleanupError } = await supabase
            .from('bookings')
            .delete()
            .lt('start_time', fiftyDaysAgo.toISOString());
          if (cleanupError) console.error('Supabase auto-cleanup error:', cleanupError);

          // 1. Fetch courts
          const { data: courtsData, error: ce } = await supabase.from('courts').select('*').order('name');
          if (ce) {
            console.error('Error fetching courts:', ce);
            return;
          }

          const courts: Court[] = (courtsData || []).map(c => ({
            id: c.id,
            name: c.name,
            status: c.status as any,
            hourlyRate: Number(c.hourly_rate),
            isEnabled: c.is_enabled,
            isMaintenanceMode: c.is_maintenance_mode,
            color: c.color,
          }));

          // 2. Fetch bookings
          const { data: bookingsData, error: be } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
          if (be) console.error('Error fetching bookings:', be);

          const bookings: Booking[] = (bookingsData || []).map(b => ({
            id: b.id,
            courtId: b.court_id,
            customerName: b.customer_name,
            phone: b.phone,
            numberOfPlayers: Number(b.number_of_players || 2),
            startTime: b.start_time,
            endTime: b.end_time,
            duration: b.duration,
            notes: b.notes || '',
            totalCharge: Number(b.total_charge),
            status: b.status as any,
            paymentStatus: b.payment_status as any,
            paymentMethod: b.payment_method as any,
            createdAt: b.created_at,
          }));

          // 3. Fetch inventory
          const { data: inventoryData, error: ie } = await supabase.from('inventory').select('*').order('name');
          if (ie) console.error('Error fetching inventory:', ie);

          const inventory: InventoryItem[] = (inventoryData || []).map(i => ({
            id: i.id,
            name: i.name,
            category: i.category as any,
            sellingPrice: Number(i.selling_price),
            purchasePrice: Number(i.purchase_price),
            stock: i.stock,
            minStock: i.min_stock,
          }));

          // 4. Fetch daily_tasks
          let { data: tasksData, error: te } = await supabase.from('daily_tasks').select('*').order('label');
          if (te) console.error('Error fetching tasks:', te);

          if (!tasksData || tasksData.length === 0) {
            const seedTasks = INITIAL_TASKS.map(t => ({
              id: t.id,
              label: t.label,
              type: t.type,
              completed: t.completed,
              completed_at: t.completedAt,
              completed_by: t.completedBy,
            }));
            const { error: se } = await supabase.from('daily_tasks').insert(seedTasks);
            if (se) console.error('Error seeding tasks:', se);
            const { data: reFetched } = await supabase.from('daily_tasks').select('*').order('label');
            tasksData = reFetched || [];
          }

          const tasks: Task[] = (tasksData || []).map(t => ({
            id: t.id,
            label: t.label,
            type: t.type as any,
            completed: t.completed,
            completedAt: t.completed_at,
            completedBy: t.completed_by,
          }));

          // 5. Fetch tabs & tab items
          const { data: tabsData, error: tbe } = await supabase.from('court_tabs').select('*, tab_items(*)');
          if (tbe) console.error('Error fetching tabs:', tbe);

          const allTabs: CourtTab[] = (tabsData || []).map(t => {
            const discount = t.discount_name ? {
              discountTypeId: 'custom',
              name: t.discount_name,
              type: t.discount_type as any,
              value: Number(t.discount_value),
              amount: 0,
            } : null;

            const items: TabItem[] = (t.tab_items || []).map((ti: any) => ({
              id: ti.id,
              inventoryItemId: ti.inventory_item_id,
              name: ti.name,
              quantity: ti.quantity,
              unitPrice: Number(ti.unit_price),
            }));

            return {
              courtId: t.court_id,
              bookingId: t.booking_id,
              items,
              discount,
              status: t.status as any,
              createdAt: t.created_at,
            };
          });

          // Open tabs go to tabs state
          const tabs = allTabs.filter(t => t.status === 'open');

          // Construct completed checkouts list from checked out tabs & ANY paid bookings (active or completed)
          const paidBookings = bookings.filter(b => b.paymentStatus === 'paid');
          const completedCheckouts: CheckoutData[] = paidBookings.map(b => {
            const relatedTab = allTabs.find(t => t.bookingId === b.id && t.status === 'checked_out');
            const foodAndDrinks = relatedTab ? relatedTab.items.reduce((s, item) => s + item.quantity * item.unitPrice, 0) : 0;
            const subtotal = b.totalCharge + foodAndDrinks;
            let discountAmount = 0;
            if (relatedTab?.discount) {
              discountAmount = relatedTab.discount.type === 'percentage'
                ? (subtotal * relatedTab.discount.value) / 100
                : relatedTab.discount.value;
            }

            return {
              courtId: b.courtId,
              bookingId: b.id,
              courtCharge: b.totalCharge,
              foodAndDrinks,
              discount: relatedTab?.discount || null,
              extraCharges: 0,
              extraChargesNote: '',
              grandTotal: Math.max(0, subtotal - discountAmount),
              paymentMethod: (b.paymentMethod || 'cash') as any,
            };
          });

          set({ courts, bookings, inventory, tasks, tabs, completedCheckouts });
        } catch (error) {
          console.error('Error initializing store from Supabase:', error);
        }
      },

      updateCourt: async (courtId, updates) => {
        set((state) => ({
          courts: state.courts.map((c) => (c.id === courtId ? { ...c, ...updates } : c)),
        }));

        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;
        if (updates.isEnabled !== undefined) dbUpdates.is_enabled = updates.isEnabled;
        if (updates.isMaintenanceMode !== undefined) dbUpdates.is_maintenance_mode = updates.isMaintenanceMode;

        const { error } = await supabase.from('courts').update(dbUpdates).eq('id', courtId);
        if (error) {
          console.error('Supabase updateCourt error:', error);
          alert(`Database Error (updateCourt): ${error.message}`);
        }
      },

      addCourt: async (courtData) => {
        const id = safeUUID();
        const court: Court = {
          ...courtData,
          id,
          status: 'available',
          isEnabled: true,
          isMaintenanceMode: false,
          color: courtData.color || '#0F5132',
        };
        set((state) => ({
          courts: [...state.courts, court],
        }));

        const { error } = await supabase.from('courts').insert({
          id,
          name: courtData.name,
          hourly_rate: courtData.hourlyRate,
          status: 'available',
          is_enabled: true,
          is_maintenance_mode: false,
          color: courtData.color || '#0F5132',
        });
        if (error) {
          console.error('Supabase addCourt error:', error);
          alert(`Database Error (addCourt): ${error.message}`);
        }
      },

      deleteCourt: async (courtId) => {
        set((state) => ({
          courts: state.courts.filter((c) => c.id !== courtId),
        }));

        const { error } = await supabase.from('courts').delete().eq('id', courtId);
        if (error) {
          console.error('Supabase deleteCourt error:', error);
          alert(`Database Error (deleteCourt): ${error.message}`);
        }
      },

      createBooking: async (data) => {
        const id = safeUUID();
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

        const { error: be } = await supabase.from('bookings').insert({
          id,
          court_id: data.courtId,
          customer_name: data.customerName,
          phone: data.phone,
          number_of_players: data.numberOfPlayers,
          start_time: data.startTime,
          end_time: data.endTime,
          duration: data.duration,
          notes: data.notes,
          total_charge: totalCharge,
          status: 'active',
          payment_status: 'unpaid',
        });
        if (be) {
          console.error('Supabase createBooking insert booking error:', be);
          alert(`Database Error (createBooking - insert booking): ${be.message}`);
        }

        const { error: te } = await supabase.from('court_tabs').insert({
          court_id: data.courtId,
          booking_id: id,
          status: 'open',
        });
        if (te) {
          console.error('Supabase createBooking insert tab error:', te);
          alert(`Database Error (createBooking - insert tab): ${te.message}`);
        }

        const { error: ce } = await supabase.from('courts').update({ status: 'occupied' }).eq('id', data.courtId);
        if (ce) {
          console.error('Supabase createBooking update court error:', ce);
          alert(`Database Error (createBooking - update court status): ${ce.message}`);
        }
      },

      updateBooking: async (bookingId, updates) => {
        set((state) => ({
          bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, ...updates } : b)),
        }));

        const dbUpdates: any = {};
        if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.numberOfPlayers !== undefined) dbUpdates.number_of_players = updates.numberOfPlayers;
        if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
        if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
        if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.totalCharge !== undefined) dbUpdates.total_charge = updates.totalCharge;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
        if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;

        const { error } = await supabase.from('bookings').update(dbUpdates).eq('id', bookingId);
        if (error) {
          console.error('Supabase updateBooking error:', error);
          alert(`Database Error (updateBooking): ${error.message}`);
        }
      },

      endBooking: async (bookingId) => {
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

        const { error: be } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
        if (be) {
          console.error('Supabase endBooking update booking error:', be);
          alert(`Database Error (endBooking - update booking): ${be.message}`);
        }

        const { error: ce } = await supabase.from('courts').update({ status: 'available' }).eq('id', booking.courtId);
        if (ce) {
          console.error('Supabase endBooking update court error:', ce);
          alert(`Database Error (endBooking - update court): ${ce.message}`);
        }

        const { error: te } = await supabase.from('court_tabs').update({ status: 'checked_out' }).eq('booking_id', bookingId);
        if (te) {
          console.error('Supabase endBooking update tab error:', te);
          alert(`Database Error (endBooking - update tab): ${te.message}`);
        }
      },

      cancelBooking: async (bookingId) => {
        const booking = get().bookings.find((b) => b.id === bookingId);
        if (!booking) return;
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

        const { error: be } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
        if (be) {
          console.error('Supabase cancelBooking update booking error:', be);
          alert(`Database Error (cancelBooking - update booking): ${be.message}`);
        }

        if (!otherActive) {
          const { error: ce } = await supabase.from('courts').update({ status: 'available' }).eq('id', booking.courtId);
          if (ce) {
            console.error('Supabase cancelBooking update court error:', ce);
            alert(`Database Error (cancelBooking - update court): ${ce.message}`);
          }
        }

        const { error: te } = await supabase.from('court_tabs').delete().eq('booking_id', bookingId);
        if (te) {
          console.error('Supabase cancelBooking delete tab error:', te);
          alert(`Database Error (cancelBooking - delete tab): ${te.message}`);
        }
      },

      extendBooking: async (bookingId, additionalHours) => {
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

        const { error } = await supabase.from('bookings').update({
          end_time: newEnd.toISOString(),
          duration: booking.duration + additionalHours * 60,
          total_charge: newCharge,
        }).eq('id', bookingId);
        if (error) {
          console.error('Supabase extendBooking error:', error);
          alert(`Database Error (extendBooking): ${error.message}`);
        }
      },

      moveBooking: async (bookingId, newCourtId) => {
        const booking = get().bookings.find((b) => b.id === bookingId);
        if (!booking || booking.courtId === newCourtId) return;
        const oldCourtId = booking.courtId;
        const newCourt = get().courts.find((c) => c.id === newCourtId);

        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? { ...b, courtId: newCourtId } : b
          ),
          tabs: state.tabs.map((t) =>
            t.bookingId === bookingId ? { ...t, courtId: newCourtId } : t
          ),
          courts: state.courts.map((c) => {
            if (c.id === oldCourtId) return { ...c, status: 'available' as const };
            if (c.id === newCourtId) return { ...c, status: 'occupied' as const };
            return c;
          }),
        }));

        get().addActivity({ message: `Booking moved to ${newCourt?.name}: ${booking.customerName}`, type: 'booking' });

        const { error: be } = await supabase.from('bookings').update({ court_id: newCourtId }).eq('id', bookingId);
        if (be) {
          console.error('Supabase moveBooking update booking error:', be);
          alert(`Database Error (moveBooking - update booking): ${be.message}`);
        }

        const { error: ce1 } = await supabase.from('courts').update({ status: 'available' }).eq('id', oldCourtId);
        if (ce1) {
          console.error('Supabase moveBooking update old court error:', ce1);
          alert(`Database Error (moveBooking - update old court): ${ce1.message}`);
        }

        const { error: ce2 } = await supabase.from('courts').update({ status: 'occupied' }).eq('id', newCourtId);
        if (ce2) {
          console.error('Supabase moveBooking update new court error:', ce2);
          alert(`Database Error (moveBooking - update new court): ${ce2.message}`);
        }
      },

      markPaid: async (bookingId, paymentMethod, discount = null) => {
        const booking = get().bookings.find((b) => b.id === bookingId);
        if (!booking) return;

        let discountAmount = 0;
        if (discount) {
          discountAmount = discount.type === 'percentage'
            ? (booking.totalCharge * discount.value) / 100
            : discount.value;
        }

        const discountedCharge = Math.max(0, booking.totalCharge - discountAmount);

        const updatedBooking = { 
          ...booking, 
          paymentStatus: 'paid' as const, 
          paymentMethod,
          totalCharge: discountedCharge
        };

        const newCheckout: CheckoutData = {
          courtId: booking.courtId,
          bookingId: booking.id,
          courtCharge: discountedCharge,
          foodAndDrinks: 0,
          discount: discount,
          extraCharges: 0,
          extraChargesNote: '',
          grandTotal: discountedCharge,
          paymentMethod: paymentMethod === 'online' ? 'upi' : 'cash',
        };

        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? updatedBooking : b
          ),
          completedCheckouts: [...state.completedCheckouts.filter(c => c.bookingId !== bookingId), newCheckout],
        }));

        if (booking) {
          get().addActivity({
            message: `Booking paid via ${paymentMethod === 'online' ? 'Online / UPI' : 'Cash'}: ${booking.customerName} (Discount: ${discount ? discount.name : 'None'})`,
            type: 'checkout',
          });
        }

        const { error } = await supabase.from('bookings').update({
          payment_status: 'paid',
          payment_method: paymentMethod,
          total_charge: discountedCharge,
        }).eq('id', bookingId);
        if (error) {
          console.error('Supabase markPaid error:', error);
          alert(`Database Error (markPaid): ${error.message}`);
        }

        const { error: te } = await supabase.from('court_tabs').update({
          discount_name: discount ? discount.name : null,
          discount_value: discount ? discount.value : null,
          discount_type: discount ? discount.type : null,
        }).eq('booking_id', bookingId).eq('status', 'open');
        if (te) {
          console.error('Supabase markPaid tab discount error:', te);
        }
      },

      addItemToTab: async (courtId, item) => {
        const tab = get().tabs.find((t) => t.courtId === courtId && t.status === 'open');
        if (!tab) return;

        // Get DB tab ID
        const { data: dbTabData, error: de } = await supabase.from('court_tabs').select('id').eq('court_id', courtId).eq('status', 'open').single();
        if (de || !dbTabData) {
          console.error('Supabase addItemToTab tab lookup error:', de);
          alert(`Database Error (addItemToTab - tab lookup): ${de?.message || 'Tab not found'}`);
          return;
        }

        const id = safeUUID();

        set((state) => {
          const tabs = state.tabs.map((t) => {
            if (t.courtId !== courtId) return t;
            const existing = t.items.find((i) => i.inventoryItemId === item.inventoryItemId);
            if (existing) {
              return {
                ...t,
                items: t.items.map((i) =>
                  i.inventoryItemId === item.inventoryItemId ? { ...i, quantity: i.quantity + item.quantity } : i
                ),
              };
            }
            return { ...t, items: [...t.items, { ...item, id }] };
          });

          const inventory = state.inventory.map((inv) =>
            inv.id === item.inventoryItemId ? { ...inv, stock: Math.max(0, inv.stock - item.quantity) } : inv
          );

          return { tabs, inventory };
        });

        const court = get().courts.find((c) => c.id === courtId);
        get().addActivity({
          message: `Sold ${item.name} ×${item.quantity} → ${court?.name ?? courtId} tab`,
          type: 'inventory',
        });

        const existingItem = tab.items.find((i) => i.inventoryItemId === item.inventoryItemId);
        if (existingItem) {
          const { error } = await supabase.from('tab_items')
            .update({ quantity: existingItem.quantity + item.quantity })
            .eq('tab_id', dbTabData.id)
            .eq('inventory_item_id', item.inventoryItemId);
          if (error) {
            console.error('Supabase addItemToTab update quantity error:', error);
            alert(`Database Error (addItemToTab - update quantity): ${error.message}`);
          }
        } else {
          const { error } = await supabase.from('tab_items').insert({
            id,
            tab_id: dbTabData.id,
            inventory_item_id: item.inventoryItemId,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
          });
          if (error) {
            console.error('Supabase addItemToTab insert item error:', error);
            alert(`Database Error (addItemToTab - insert item): ${error.message}`);
          }
        }

        const invItem = get().inventory.find(i => i.id === item.inventoryItemId);
        if (invItem) {
          const { error } = await supabase.from('inventory').update({ stock: invItem.stock }).eq('id', item.inventoryItemId);
          if (error) {
            console.error('Supabase addItemToTab update stock error:', error);
            alert(`Database Error (addItemToTab - update stock): ${error.message}`);
          }
        }
      },

      removeItemFromTab: async (courtId, itemId) => {
        const tab = get().tabs.find((t) => t.courtId === courtId && t.status === 'open');
        if (!tab) return;
        const item = tab.items.find(i => i.id === itemId);
        if (!item) return;

        set((state) => ({
          tabs: state.tabs.map((t) => {
            if (t.courtId !== courtId) return t;
            return { ...t, items: t.items.filter((i) => i.id !== itemId) };
          }),
          inventory: state.inventory.map((inv) =>
            inv.id === item.inventoryItemId ? { ...inv, stock: inv.stock + item.quantity } : inv
          ),
        }));

        const { error } = await supabase.from('tab_items').delete().eq('id', itemId);
        if (error) {
          console.error('Supabase removeItemFromTab delete error:', error);
          alert(`Database Error (removeItemFromTab - delete item): ${error.message}`);
        }

        const invItem = get().inventory.find(i => i.id === item.inventoryItemId);
        if (invItem) {
          const { error: stockErr } = await supabase.from('inventory').update({ stock: invItem.stock }).eq('id', item.inventoryItemId);
          if (stockErr) {
            console.error('Supabase removeItemFromTab update stock error:', stockErr);
            alert(`Database Error (removeItemFromTab - update stock): ${stockErr.message}`);
          }
        }
      },

      updateItemQuantity: async (courtId, itemId, quantity) => {
        const tab = get().tabs.find((t) => t.courtId === courtId && t.status === 'open');
        if (!tab) return;
        const item = tab.items.find(i => i.id === itemId);
        if (!item) return;
        const diff = quantity - item.quantity;

        set((state) => ({
          tabs: state.tabs.map((t) => {
            if (t.courtId !== courtId) return t;
            return {
              ...t,
              items:
                quantity <= 0
                  ? t.items.filter((i) => i.id !== itemId)
                  : t.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
            };
          }),
          inventory: state.inventory.map((inv) =>
            inv.id === item.inventoryItemId ? { ...inv, stock: Math.max(0, inv.stock - diff) } : inv
          ),
        }));

        if (quantity <= 0) {
          const { error } = await supabase.from('tab_items').delete().eq('id', itemId);
          if (error) {
            console.error('Supabase updateItemQuantity delete error:', error);
            alert(`Database Error (updateItemQuantity - delete): ${error.message}`);
          }
        } else {
          const { error } = await supabase.from('tab_items').update({ quantity }).eq('id', itemId);
          if (error) {
            console.error('Supabase updateItemQuantity update error:', error);
            alert(`Database Error (updateItemQuantity - update): ${error.message}`);
          }
        }

        const invItem = get().inventory.find(i => i.id === item.inventoryItemId);
        if (invItem) {
          const { error: stockErr } = await supabase.from('inventory').update({ stock: invItem.stock }).eq('id', item.inventoryItemId);
          if (stockErr) {
            console.error('Supabase updateItemQuantity update stock error:', stockErr);
            alert(`Database Error (updateItemQuantity - update stock): ${stockErr.message}`);
          }
        }
      },

      applyDiscount: async (courtId, discount) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.courtId === courtId ? { ...t, discount } : t)),
        }));

        const { error } = await supabase.from('court_tabs').update({
          discount_name: discount ? discount.name : null,
          discount_value: discount ? discount.value : null,
          discount_type: discount ? discount.type : null,
        }).eq('court_id', courtId).eq('status', 'open');
        if (error) {
          console.error('Supabase applyDiscount error:', error);
          alert(`Database Error (applyDiscount): ${error.message}`);
        }
      },

      checkout: async (checkoutData) => {
        const { bookingId, courtId } = checkoutData;
        set((state) => ({
          completedCheckouts: [...state.completedCheckouts.filter(c => c.bookingId !== bookingId), checkoutData],
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? { ...b, paymentStatus: 'paid', status: 'completed' } : b
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

        const { error: be } = await supabase.from('bookings').update({
          payment_status: 'paid',
          status: 'completed',
          payment_method: checkoutData.paymentMethod,
        }).eq('id', bookingId);
        if (be) {
          console.error('Supabase checkout update booking error:', be);
          alert(`Database Error (checkout - update booking): ${be.message}`);
        }

        const { error: te } = await supabase.from('court_tabs').update({
          status: 'checked_out',
        }).eq('booking_id', bookingId);
        if (te) {
          console.error('Supabase checkout update tab error:', te);
          alert(`Database Error (checkout - update tab): ${te.message}`);
        }

        const { error: ce } = await supabase.from('courts').update({
          status: 'available',
        }).eq('id', courtId);
        if (ce) {
          console.error('Supabase checkout update court error:', ce);
          alert(`Database Error (checkout - update court): ${ce.message}`);
        }
      },

      addInventoryItem: async (item) => {
        const id = safeUUID();
        set((state) => ({
          inventory: [...state.inventory, { ...item, id }],
        }));

        const { error } = await supabase.from('inventory').insert({
          id,
          name: item.name,
          category: item.category,
          selling_price: item.sellingPrice,
          purchase_price: item.purchasePrice,
          stock: item.stock,
          min_stock: item.minStock,
        });
        if (error) {
          console.error('Supabase addInventoryItem error:', error);
          alert(`Database Error (addInventoryItem): ${error.message}`);
        }
      },

      updateInventoryItem: async (itemId, updates) => {
        set((state) => ({
          inventory: state.inventory.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
        }));

        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.sellingPrice !== undefined) dbUpdates.selling_price = updates.sellingPrice;
        if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
        if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
        if (updates.minStock !== undefined) dbUpdates.min_stock = updates.minStock;

        const { error } = await supabase.from('inventory').update(dbUpdates).eq('id', itemId);
        if (error) {
          console.error('Supabase updateInventoryItem error:', error);
          alert(`Database Error (updateInventoryItem): ${error.message}`);
        }
      },

      deleteInventoryItem: async (itemId) => {
        set((state) => ({
          inventory: state.inventory.filter((i) => i.id !== itemId),
        }));

        const { error } = await supabase.from('inventory').delete().eq('id', itemId);
        if (error) {
          console.error('Supabase deleteInventoryItem error:', error);
          alert(`Database Error (deleteInventoryItem): ${error.message}`);
        }
      },

      restockItem: async (itemId, amount) => {
        set((state) => ({
          inventory: state.inventory.map((i) => (i.id === itemId ? { ...i, stock: i.stock + amount } : i)),
        }));

        const item = get().inventory.find(i => i.id === itemId);
        if (item) {
          const { error } = await supabase.from('inventory').update({ stock: item.stock }).eq('id', itemId);
          if (error) {
            console.error('Supabase restockItem error:', error);
            alert(`Database Error (restockItem): ${error.message}`);
          }
        }
      },

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

      toggleTask: async (taskId) => {
        const now = new Date();
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  completed: !t.completed,
                  completedAt: !t.completed ? now.toISOString() : null,
                  completedBy: !t.completed ? state.settings.currentUser : null,
                }
              : t
          ),
        }));

        const task = get().tasks.find(t => t.id === taskId);
        if (task) {
          const { error } = await supabase.from('daily_tasks').update({
            completed: task.completed,
            completed_at: task.completedAt,
            completed_by: task.completedBy,
          }).eq('id', taskId);
          if (error) {
            console.error('Supabase toggleTask error:', error);
            alert(`Database Error (toggleTask): ${error.message}`);
          }
        }
      },

      resetTasks: async () => {
        set((state) => ({
          tasks: state.tasks.map((t) => ({
            ...t,
            completed: false,
            completedAt: null,
            completedBy: null,
          })),
        }));

        const { error } = await supabase.from('daily_tasks').update({
          completed: false,
          completed_at: null,
          completed_by: null,
        });
        if (error) {
          console.error('Supabase resetTasks error:', error);
          alert(`Database Error (resetTasks): ${error.message}`);
        }
      },

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
        if (!booking) return 0;
        return booking.totalCharge;
      },

      getTodayRevenue: () => {
        const today = new Date().toDateString();
        return get().completedCheckouts
          .filter((c) => new Date(c.courtId).toDateString() === today || true)
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

      clearAllData: async () => {
        localStorage.removeItem('thecourtyard-storage');
        await supabase.from('tab_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('court_tabs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('daily_tasks').update({ completed: false, completed_at: null, completed_by: null });
        await supabase.from('courts').update({ status: 'available' });
        await get().initializeStore();
      },
    }),
    {
      name: 'thecourtyard-storage',
    }
  )
);
