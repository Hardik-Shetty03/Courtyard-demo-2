// src/store/useStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Court, Booking, CourtTab, TabItem, InventoryItem,
  DiscountType, Task, ActivityEntry, AppSettings,
  DiscountApplication, CheckoutData,
  Tournament, TournamentTabItem, TournamentPayment
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
  tournaments: Tournament[];

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
  createBulkBookings: (bookingsList: Array<Omit<Booking, 'id' | 'createdAt' | 'status' | 'paymentStatus'>>) => Promise<{ count: number; error?: string }>;
  updateBooking: (bookingId: string, updates: Partial<Booking>) => Promise<void>;
  endBooking: (bookingId: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  extendBooking: (bookingId: string, additionalHours: number) => Promise<void>;
  moveBooking: (bookingId: string, newCourtId: string) => Promise<void>;
  markPaid: (bookingId: string, paymentMethod: 'online' | 'cash', discount?: DiscountApplication | null) => Promise<void>;

  // Tabs
  addItemToTab: (bookingId: string, item: Omit<TabItem, 'id'>) => Promise<void>;
  removeItemFromTab: (bookingId: string, itemId: string) => Promise<void>;
  updateItemQuantity: (bookingId: string, itemId: string, quantity: number) => Promise<void>;
  applyDiscount: (bookingId: string, discount: DiscountApplication | null) => Promise<void>;
  checkout: (checkoutData: CheckoutData) => Promise<void>;

  // Inventory
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  restockItem: (itemId: string, amount: number) => Promise<void>;
  recordInventoryLoss: (itemId: string, amount: number, notes?: string) => Promise<void>;

  // Discounts
  addDiscountType: (discount: Omit<DiscountType, 'id'>) => void;
  updateDiscountType: (discountId: string, updates: Partial<DiscountType>) => void;
  deleteDiscountType: (discountId: string) => void;

  // Tasks
  toggleTask: (taskId: string) => Promise<void>;
  resetTasks: () => Promise<void>;

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Tournaments
  createTournament: (name: string, startDate: string, endDate: string, entryFee: number) => Promise<void>;
  updateTournament: (tournamentId: string, updates: Partial<Tournament>) => Promise<void>;
  deleteTournament: (tournamentId: string) => Promise<void>;
  addTournamentParticipant: (tournamentId: string, name: string, phone?: string) => Promise<void>;
  removeTournamentParticipant: (tournamentId: string, participantId: string) => Promise<void>;
  addTournamentTabItem: (tournamentId: string, participantName: string, item: TournamentTabItem, inventoryItemId: string) => Promise<void>;
  removeTournamentTabItem: (tournamentId: string, participantName: string, itemName: string, quantity: number, inventoryItemId?: string) => Promise<void>;
  addTournamentPayment: (tournamentId: string, payment: Omit<TournamentPayment, 'id' | 'createdAt'>) => Promise<void>;

  updateBookingPayment: (
    bookingId: string,
    newCourtPrice: number,
    discount: { name: string; type: 'percentage' | 'fixed'; value: number } | null,
    newNotes: string,
    changeLogEntry: { user: string; timestamp: string; action: string }
  ) => Promise<void>;

  addPostCheckoutItem: (bookingId: string, item: Omit<TabItem, 'id'>) => Promise<void>;

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
      tournaments: [],

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
            changeLog: typeof b.change_log === 'string' ? JSON.parse(b.change_log) : (b.change_log || []),
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
            losses: i.losses || 0,
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

          // Include both open and checked_out tabs in state (checked_out needed for post-checkout item adds)
          const tabs = allTabs;

          // Self-healing: Check if any active booking is missing an open tab
          const activeBookings = bookings.filter(b => b.status === 'active');
          const finalTabs = [...tabs];
          
          for (const b of activeBookings) {
            const hasTab = finalTabs.some(t => t.bookingId === b.id);
            if (!hasTab) {
              console.warn(`Self-healing: Found active booking ${b.id} with no open tab. Creating one...`);
              const newTab: CourtTab = {
                courtId: b.courtId,
                bookingId: b.id,
                items: [],
                discount: null,
                status: 'open',
                createdAt: new Date().toISOString(),
              };
              finalTabs.push(newTab);
              
              // Insert into Supabase in background
              supabase.from('court_tabs').insert({
                id: safeUUID(),
                court_id: b.courtId,
                booking_id: b.id,
                status: 'open',
              }).then(({ error }) => {
                if (error) console.error('Self-healing: Failed to insert open tab to Supabase:', error);
              });
            }
          }

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

          // 6. Fetch tournaments
          let tournaments: Tournament[] = [];
          try {
            const { data: tournamentsData, error: tme } = await supabase.from('tournaments').select('*');
            if (tme) {
              if (tme.message.includes('relation "tournaments" does not exist') || tme.code === '42P01') {
                console.warn('tournaments table does not exist yet. Please run migration SQL.');
              } else {
                console.error('Error fetching tournaments:', tme);
              }
            } else if (tournamentsData) {
              tournaments = tournamentsData.map(t => ({
                id: t.id,
                name: t.name,
                startDate: t.start_date,
                endDate: t.end_date,
                status: t.status as any,
                entryFee: Number(t.entry_fee || 0),
                participants: typeof t.participants === 'string' ? JSON.parse(t.participants) : (t.participants || []),
                tabs: typeof t.tabs === 'string' ? JSON.parse(t.tabs) : (t.tabs || []),
                payments: typeof t.payments === 'string' ? JSON.parse(t.payments) : (t.payments || []),
                exported: t.exported || false,
                createdAt: t.created_at,
              }));
            }
          } catch (err) {
            console.error('Error querying tournaments table:', err);
          }

          set({ courts, bookings, inventory, tasks, tabs: finalTabs, completedCheckouts, tournaments });
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
          id: safeUUID(),
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

      createBulkBookings: async (bookingsList) => {
        if (bookingsList.length === 0) return { count: 0 };

        const newBookings: Booking[] = [];
        const newTabs: CourtTab[] = [];
        const dbBookings: any[] = [];
        const dbTabs: any[] = [];

        for (const data of bookingsList) {
          const id = `b-${safeUUID()}`;
          const tabId = `tab-${safeUUID()}`;

          const booking: Booking = {
            id,
            courtId: data.courtId,
            customerName: data.customerName,
            phone: data.phone,
            startTime: data.startTime,
            endTime: data.endTime,
            duration: data.duration,
            numberOfPlayers: data.numberOfPlayers || 2,
            notes: data.notes || '',
            totalCharge: data.totalCharge,
            status: 'active',
            paymentStatus: 'unpaid',
            createdAt: new Date().toISOString(),
          };

          const tab: CourtTab = {
            courtId: data.courtId,
            bookingId: id,
            items: [],
            discount: null,
            status: 'open',
            createdAt: new Date().toISOString(),
          };

          newBookings.push(booking);
          newTabs.push(tab);

          dbBookings.push({
            id,
            court_id: data.courtId,
            customer_name: data.customerName,
            phone: data.phone,
            number_of_players: data.numberOfPlayers || 2,
            start_time: data.startTime,
            end_time: data.endTime,
            duration: data.duration,
            notes: data.notes || '',
            total_charge: data.totalCharge,
            status: 'active',
            payment_status: 'unpaid',
          });

          dbTabs.push({
            id: tabId,
            court_id: data.courtId,
            booking_id: id,
            status: 'open',
          });
        }

        // Update local state
        set((state) => ({
          bookings: [...state.bookings, ...newBookings],
          tabs: [...state.tabs, ...newTabs],
        }));

        get().addActivity({
          message: `Bulk Booking: Created ${bookingsList.length} sessions for ${bookingsList[0]?.customerName}`,
          type: 'booking',
        });

        // Persist to Supabase in batches
        const { error: be } = await supabase.from('bookings').insert(dbBookings);
        if (be) {
          console.error('Supabase createBulkBookings bookings insert error:', be);
        }

        const { error: te } = await supabase.from('court_tabs').insert(dbTabs);
        if (te) {
          console.error('Supabase createBulkBookings tabs insert error:', te);
        }

        return { count: newBookings.length };
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

      addItemToTab: async (bookingId, item) => {
        const tab = get().tabs.find((t) => t.bookingId === bookingId && t.status === 'open');
        if (!tab) return;

        // Get DB tab ID using bookingId
        const { data: dbTabData, error: de } = await supabase.from('court_tabs').select('id').eq('booking_id', bookingId).eq('status', 'open').single();
        if (de || !dbTabData) {
          console.error('Supabase addItemToTab tab lookup error:', de);
          alert(`Database Error (addItemToTab - tab lookup): ${de?.message || 'Tab not found'}`);
          return;
        }

        const id = safeUUID();

        set((state) => {
          const tabs = state.tabs.map((t) => {
            if (t.bookingId !== bookingId) return t;
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

        const court = get().courts.find((c) => c.id === tab.courtId);
        get().addActivity({
          message: `Sold ${item.name} ×${item.quantity} → ${court?.name ?? tab.courtId} tab`,
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

      removeItemFromTab: async (bookingId, itemId) => {
        const tab = get().tabs.find((t) => t.bookingId === bookingId && t.status === 'open');
        if (!tab) return;
        const item = tab.items.find(i => i.id === itemId);
        if (!item) return;

        set((state) => ({
          tabs: state.tabs.map((t) => {
            if (t.bookingId !== bookingId) return t;
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

      updateItemQuantity: async (bookingId, itemId, quantity) => {
        const tab = get().tabs.find((t) => t.bookingId === bookingId && t.status === 'open');
        if (!tab) return;
        const item = tab.items.find(i => i.id === itemId);
        if (!item) return;
        const diff = quantity - item.quantity;

        set((state) => ({
          tabs: state.tabs.map((t) => {
            if (t.bookingId !== bookingId) return t;
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

      applyDiscount: async (bookingId, discount) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.bookingId === bookingId ? { ...t, discount } : t)),
        }));

        const { error } = await supabase.from('court_tabs').update({
          discount_name: discount ? discount.name : null,
          discount_value: discount ? discount.value : null,
          discount_type: discount ? discount.type : null,
        }).eq('booking_id', bookingId).eq('status', 'open');
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

      recordInventoryLoss: async (itemId, amount, notes = '') => {
        const currentItem = get().inventory.find(i => i.id === itemId);
        if (!currentItem) return;

        const newStock = Math.max(0, currentItem.stock - amount);
        const newLosses = (currentItem.losses || 0) + amount;

        set((state) => ({
          inventory: state.inventory.map((i) => (i.id === itemId ? { ...i, stock: newStock, losses: newLosses } : i)),
          activityLog: [
            {
              id: `act-${generateId()}`,
              message: `Loss reported: ${amount} units of ${currentItem.name} (${notes || 'damaged/missing'})`,
              timestamp: new Date().toISOString(),
              type: 'inventory',
            },
            ...state.activityLog,
          ],
        }));

        // Update database (gracefully ignoring if column losses doesn't exist yet)
        const { error } = await supabase.from('inventory').update({
          stock: newStock,
          losses: newLosses
        }).eq('id', itemId);

        if (error) {
          // If column is missing, fall back to updating stock only in the DB to prevent crashes
          if (error.message.includes('column') || error.code === '42703') {
            console.warn('losses column not found in database. Falling back to updating stock only.');
            const { error: fallbackErr } = await supabase.from('inventory').update({
              stock: newStock
            }).eq('id', itemId);
            if (fallbackErr) {
              console.error('Fallback update stock error:', fallbackErr);
            }
          } else {
            console.error('Supabase recordInventoryLoss error:', error);
            alert(`Database Error (recordInventoryLoss): ${error.message}`);
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
        try {
          await supabase.from('tournaments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch (e) {
          console.warn('Failed to delete tournaments table on clearAllData:', e);
        }
        await get().initializeStore();
      },

      createTournament: async (name, startDate, endDate, entryFee) => {
        const id = safeUUID();
        const newT: Tournament = {
          id,
          name,
          startDate,
          endDate,
          status: 'active',
          entryFee,
          participants: [],
          tabs: [],
          payments: [],
          exported: false,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          tournaments: [...state.tournaments, newT],
          activityLog: [
            {
              id: `act-${generateId()}`,
              message: `Tournament "${name}" created.`,
              timestamp: new Date().toISOString(),
              type: 'booking',
            },
            ...state.activityLog,
          ],
        }));

        const { error } = await supabase.from('tournaments').insert({
          id,
          name,
          start_date: startDate,
          end_date: endDate,
          status: 'active',
          entry_fee: entryFee,
          participants: JSON.stringify([]),
          tabs: JSON.stringify([]),
          payments: JSON.stringify([]),
          exported: false,
        });

        if (error) {
          console.error('Supabase createTournament error:', error);
        }
      },

      updateTournament: async (tournamentId, updates) => {
        set((state) => ({
          tournaments: state.tournaments.map((t) => (t.id === tournamentId ? { ...t, ...updates } : t)),
        }));

        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
        if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.entryFee !== undefined) dbUpdates.entry_fee = updates.entryFee;
        if (updates.participants !== undefined) dbUpdates.participants = JSON.stringify(updates.participants);
        if (updates.tabs !== undefined) dbUpdates.tabs = JSON.stringify(updates.tabs);
        if (updates.payments !== undefined) dbUpdates.payments = JSON.stringify(updates.payments);
        if (updates.exported !== undefined) dbUpdates.exported = updates.exported;

        const { error } = await supabase.from('tournaments').update(dbUpdates).eq('id', tournamentId);
        if (error) {
          console.error('Supabase updateTournament error:', error);
        }
      },

      deleteTournament: async (tournamentId) => {
        set((state) => ({
          tournaments: state.tournaments.filter((t) => t.id !== tournamentId),
        }));

        const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId);
        if (error) {
          console.error('Supabase deleteTournament error:', error);
        }
      },

      addTournamentParticipant: async (tournamentId, name, phone = '') => {
        const t = get().tournaments.find(x => x.id === tournamentId);
        if (!t) return;

        const newP = { id: generateId(), name, phone };
        const participants = [...t.participants, newP];

        await get().updateTournament(tournamentId, { participants });
      },

      removeTournamentParticipant: async (tournamentId, participantId) => {
        const t = get().tournaments.find(x => x.id === tournamentId);
        if (!t) return;

        const participants = t.participants.filter((p: any) => p.id !== participantId);
        await get().updateTournament(tournamentId, { participants });
      },

      addTournamentTabItem: async (tournamentId, participantName, item, inventoryItemId) => {
        const t = get().tournaments.find(x => x.id === tournamentId);
        if (!t) return;

        const tabs = [...t.tabs];
        let tab = tabs.find((x: any) => x.participantName === participantName);
        if (!tab) {
          tab = { id: `tab-${generateId()}`, participantName, items: [] };
          tabs.push(tab);
        }

        const existingItem = tab.items.find((x: any) => x.name === item.name);
        if (existingItem) {
          existingItem.quantity += item.quantity;
        } else {
          tab.items.push(item);
        }

        // Deduct inventory stock!
        const invItem = get().inventory.find(i => i.id === inventoryItemId);
        if (invItem) {
          const newStock = Math.max(0, invItem.stock - item.quantity);
          set((state) => ({
            inventory: state.inventory.map((i) => (i.id === inventoryItemId ? { ...i, stock: newStock } : i)),
          }));
          await supabase.from('inventory').update({ stock: newStock }).eq('id', inventoryItemId);
        }

        await get().updateTournament(tournamentId, { tabs });
      },

      removeTournamentTabItem: async (tournamentId, participantName, itemName, quantity, inventoryItemId) => {
        const t = get().tournaments.find(x => x.id === tournamentId);
        if (!t) return;

        const tabs = [...t.tabs];
        const tab = tabs.find((x: any) => x.participantName === participantName);
        if (!tab) return;

        const item = tab.items.find((x: any) => x.name === itemName);
        if (!item) return;

        const actualRemovedQty = Math.min(item.quantity, quantity);
        item.quantity -= actualRemovedQty;

        if (item.quantity <= 0) {
          tab.items = tab.items.filter((x: any) => x.name !== itemName);
        }

        // Restore inventory stock!
        if (inventoryItemId) {
          const invItem = get().inventory.find(i => i.id === inventoryItemId);
          if (invItem) {
            const newStock = invItem.stock + actualRemovedQty;
            set((state) => ({
              inventory: state.inventory.map((i) => (i.id === inventoryItemId ? { ...i, stock: newStock } : i)),
            }));
            await supabase.from('inventory').update({ stock: newStock }).eq('id', inventoryItemId);
          }
        }

        await get().updateTournament(tournamentId, { tabs });
      },

      addTournamentPayment: async (tournamentId, payment) => {
        const t = get().tournaments.find(x => x.id === tournamentId);
        if (!t) return;

        const newP = {
          id: `pay-${generateId()}`,
          ...payment,
          createdAt: new Date().toISOString()
        };
        const payments = [...t.payments, newP];

        await get().updateTournament(tournamentId, { payments });
      },

      updateBookingPayment: async (bookingId, newCourtPrice, discount, newNotes, changeLogEntry) => {
        const booking = get().bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const currentLog = booking.changeLog || [];
        const updatedLog = [...currentLog, changeLogEntry];

        // 1. Update local bookings state
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? { ...b, totalCharge: newCourtPrice, notes: newNotes, changeLog: updatedLog } : b
          )
        }));

        // Update database
        const { error: be } = await supabase.from('bookings').update({
          total_charge: newCourtPrice,
          notes: newNotes,
          change_log: JSON.stringify(updatedLog)
        }).eq('id', bookingId);
        if (be) {
          console.error('Supabase updateBookingPayment error:', be);
        }

        // 2. Update/Insert court_tabs discount details
        const discountApply = discount ? {
          discountTypeId: 'custom',
          name: discount.name,
          type: discount.type,
          value: discount.value,
          amount: 0
        } : null;

        // Update local tabs state if open
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.bookingId === bookingId ? { ...t, discount: discountApply } : t
          )
        }));

        // Update database court_tabs record
        const dbDiscount = discount ? {
          discount_name: discount.name,
          discount_type: discount.type,
          discount_value: discount.value
        } : {
          discount_name: null,
          discount_type: null,
          discount_value: null
        };

        const { error: te } = await supabase.from('court_tabs').update(dbDiscount).eq('booking_id', bookingId);
        if (te) {
          console.error('Supabase updateBookingPayment court_tabs error:', te);
        }
      },

      addPostCheckoutItem: async (bookingId, item) => {
        // 1. Find the checked_out tab for this booking
        const tab = get().tabs.find(t => t.bookingId === bookingId);
        if (!tab) return;

        const id = safeUUID();

        // 2. Get DB tab ID
        const { data: dbTabData, error: de } = await supabase.from('court_tabs').select('id').eq('booking_id', bookingId).single();
        if (de || !dbTabData) {
          console.error('Supabase addPostCheckoutItem tab lookup error:', de);
          return;
        }

        // 3. Update local tabs state (add or increment)
        set((state) => {
          const tabs = state.tabs.map((t) => {
            if (t.bookingId !== bookingId) return t;
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

          // Deduct stock
          const inventory = state.inventory.map((inv) =>
            inv.id === item.inventoryItemId ? { ...inv, stock: Math.max(0, inv.stock - item.quantity) } : inv
          );

          return { tabs, inventory };
        });

        // 4. Recalculate completedCheckout for this booking
        const updatedTab = get().tabs.find(t => t.bookingId === bookingId);
        const booking = get().bookings.find(b => b.id === bookingId);
        if (updatedTab && booking) {
          const foodAndDrinks = updatedTab.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
          const subtotal = booking.totalCharge + foodAndDrinks;
          let discountAmt = 0;
          if (updatedTab.discount) {
            discountAmt = updatedTab.discount.type === 'percentage'
              ? (subtotal * updatedTab.discount.value) / 100
              : updatedTab.discount.value;
          }
          const grandTotal = Math.max(0, subtotal - discountAmt);

          set((state) => ({
            completedCheckouts: state.completedCheckouts.map((c) =>
              c.bookingId === bookingId
                ? { ...c, foodAndDrinks, grandTotal }
                : c
            )
          }));
        }

        // 5. Persist to Supabase — insert or update tab_items
        const existingItem = tab.items.find((i) => i.inventoryItemId === item.inventoryItemId);
        if (existingItem) {
          await supabase.from('tab_items')
            .update({ quantity: existingItem.quantity + item.quantity })
            .eq('tab_id', dbTabData.id)
            .eq('inventory_item_id', item.inventoryItemId);
        } else {
          await supabase.from('tab_items').insert({
            id,
            tab_id: dbTabData.id,
            inventory_item_id: item.inventoryItemId,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
          });
        }

        // 6. Update inventory stock in DB
        const invItem = get().inventory.find(i => i.id === item.inventoryItemId);
        if (invItem) {
          await supabase.from('inventory').update({ stock: invItem.stock }).eq('id', item.inventoryItemId);
        }

        get().addActivity({
          message: `Post-checkout: Added ${item.name} ×${item.quantity} to ${booking?.customerName ?? bookingId}`,
          type: 'inventory',
        });
      },
    }),
    {
      name: 'thecourtyard-storage',
    }
  )
);
