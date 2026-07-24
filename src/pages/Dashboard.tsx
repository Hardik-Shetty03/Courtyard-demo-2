// src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee, Calendar, CheckCircle, Circle,
  Package, AlertTriangle, Zap, Clock, ArrowRight,
  Search, Filter, Edit2, X, Eye, FileText, Plus, Minus, ShoppingBag
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency, getTimeAgo } from '@/utils';
import { useNavigate } from 'react-router-dom';
import type { Court, Booking, DiscountApplication } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

export default function Dashboard() {
  const {
    courts, bookings, activityLog, getLowStockItems,
    completedCheckouts, tasks, inventory, tabs, settings,
    updateBookingPayment, addPostCheckoutItem
  } = useStore();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  
  // Date Selector States for Revenue Check
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedRevenueDate, setSelectedRevenueDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Payment Management Filters State
  const [pmSearch, setPmSearch] = useState('');
  const [pmCourtFilter, setPmCourtFilter] = useState('all');

  // Edit Payment Modal State
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState<Booking | null>(null);

  // Auto-refresh stats every 15 seconds to sync live court status dynamically
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const getLiveStatus = (court: Court) => {
    if (court.isMaintenanceMode) return 'maintenance';
    if (!court.isEnabled) return 'disabled';
    const isOccupied = bookings.some(
      (b) => b.courtId === court.id && b.status === 'active' && new Date(b.startTime) <= now && new Date(b.endTime) > now
    );
    return isOccupied ? 'occupied' : 'available';
  };

  const getRevenueForDate = (date: Date) => {
    const targetDateStr = date.toDateString();
    
    // Find bookings that are paid and whose startTime matches target date
    const targetBookings = bookings.filter((b) => {
      if (b.paymentStatus !== 'paid') return false;
      const bookingDate = new Date(b.startTime);
      return bookingDate.toDateString() === targetDateStr;
    });

    let total = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let count = 0;

    targetBookings.forEach((b) => {
      const checkoutData = completedCheckouts.find((c) => c.bookingId === b.id);
      if (checkoutData) {
        total += checkoutData.grandTotal;
        count++;
        if (checkoutData.paymentMethod === 'cash') {
          cashTotal += checkoutData.grandTotal;
        } else {
          upiTotal += checkoutData.grandTotal;
        }
      } else {
        total += b.totalCharge;
        count++;
        if (b.paymentMethod === 'cash') {
          cashTotal += b.totalCharge;
        } else {
          upiTotal += b.totalCharge;
        }
      }
    });

    return { total, cashTotal, upiTotal, count };
  };

  const occupied = courts.filter((c) => getLiveStatus(c) === 'occupied').length;
  const available = courts.filter((c) => getLiveStatus(c) === 'available').length;
  const todayBookings = bookings.filter(
    (b) => new Date(b.createdAt).toDateString() === now.toDateString()
  ).length;

  const todayStats = getRevenueForDate(now);
  const todayRevenue = todayStats.total;
  const lowStock = getLowStockItems();
  const pendingPayments = bookings.filter((b) => b.status === 'active' && b.paymentStatus === 'unpaid').length;
  const openTasks = tasks.filter((t) => !t.completed).length;

  const totalLostUnits = inventory.reduce((s, i) => s + (i.losses || 0), 0);
  const totalFinancialLoss = inventory.reduce((s, i) => s + (i.losses || 0) * i.purchasePrice, 0);

  const getBookingPaymentDetails = (b: Booking) => {
    if (b.paymentStatus === 'paid') {
      const checkout = completedCheckouts.find((c) => c.bookingId === b.id);
      const courtPrice = b.totalCharge;
      const additionalCharges = checkout ? checkout.foodAndDrinks : 0;
      const discount = checkout ? checkout.discount : null;
      const subtotal = courtPrice + additionalCharges;
      const discountAmount = discount
        ? (discount.type === 'percentage' ? (subtotal * discount.value) / 100 : discount.value)
        : 0;
      const finalAmount = checkout ? checkout.grandTotal : Math.max(0, subtotal - discountAmount);
      return { courtPrice, additionalCharges, discount, finalAmount };
    } else {
      const tab = tabs.find((t) => t.bookingId === b.id && t.status === 'open');
      const courtPrice = b.totalCharge;
      const additionalCharges = tab ? tab.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) : 0;
      const discount = tab ? tab.discount : null;
      const subtotal = courtPrice + additionalCharges;
      const discountAmount = discount
        ? (discount.type === 'percentage' ? (subtotal * discount.value) / 100 : discount.value)
        : 0;
      const finalAmount = Math.max(0, subtotal - discountAmount);
      return { courtPrice, additionalCharges, discount, finalAmount };
    }
  };

  // Filter Bookings for Payment Management Table (today's checked-out bookings only)
  const filteredBookings = bookings.filter((b) => {
    // 1. Must be checked out (paid)
    if (b.paymentStatus !== 'paid') return false;

    // 2. Must be today's booking
    const bookingDateStr = new Date(b.startTime).toDateString();
    const todayDateStr = now.toDateString();
    if (bookingDateStr !== todayDateStr) return false;

    // 3. Search and Court filters
    const matchesSearch =
      b.customerName.toLowerCase().includes(pmSearch.toLowerCase()) ||
      b.phone.includes(pmSearch);

    const matchesCourt = pmCourtFilter === 'all' || b.courtId === pmCourtFilter;

    return matchesSearch && matchesCourt;
  });

  const stats = [
    {
      label: "Today's Revenue",
      value: formatCurrency(todayRevenue),
      icon: IndianRupee,
      color: 'bg-emerald-50 text-emerald-600',
      iconBg: 'bg-emerald-100',
      sub: `${todayStats.count} checkouts`,
      clickable: true,
    },
    {
      label: "Today's Bookings",
      value: todayBookings,
      icon: Calendar,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
      sub: 'all courts',
    },
    {
      label: 'Courts Occupied',
      value: occupied,
      icon: Circle,
      color: 'bg-red-50 text-red-600',
      iconBg: 'bg-red-100',
      sub: `${available} available`,
    },
    {
      label: 'Courts Available',
      value: available,
      icon: CheckCircle,
      color: 'bg-green-50 text-green-700',
      iconBg: 'bg-green-100',
      sub: `of ${courts.length} total`,
    },
    {
      label: 'Pending Payments',
      value: pendingPayments,
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
      iconBg: 'bg-amber-100',
      sub: 'unpaid bookings',
    },
    {
      label: 'Low Stock Items',
      value: lowStock.length,
      icon: AlertTriangle,
      color: 'bg-orange-50 text-orange-600',
      iconBg: 'bg-orange-100',
      sub: 'need restocking',
    },
    {
      label: 'Total Loss (Missing)',
      value: formatCurrency(totalFinancialLoss),
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600 border border-red-100',
      iconBg: 'bg-red-100',
      sub: `${totalLostUnits} units lost`,
    },
  ];

  const quickActions = [
    { label: 'New Booking', icon: Calendar, to: '/courts', color: 'bg-[#0F5132] text-white' },
    { label: 'View Tabs', icon: IndianRupee, to: '/court-tabs', color: 'bg-emerald-500 text-white' },
    { label: 'Open POS', icon: Zap, to: '/pos', color: 'bg-blue-600 text-white' },
    { label: 'Live Courts', icon: Circle, to: '/live-courts', color: 'bg-purple-600 text-white' },
    { label: 'Inventory', icon: Package, to: '/inventory', color: 'bg-amber-500 text-white' },
    { label: `Tasks (${openTasks})`, icon: CheckCircle, to: '/tasks', color: 'bg-gray-700 text-white' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-gray-900">Good {getGreeting(now)}, Admin 👋</h2>
        <p className="text-gray-500 text-sm">Here's what's happening at The Courtyard today.</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        {stats.map((stat, i) => (
          <motion.button
            key={stat.label}
            custom={i}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            disabled={!stat.clickable}
            onClick={() => {
              if (stat.clickable) {
                setShowDatePicker(!showDatePicker);
              }
            }}
            className={`card flex flex-col justify-between text-left transition-all ${
              stat.clickable
                ? 'cursor-pointer hover:shadow-md hover:border-emerald-300 border-2 border-transparent active:scale-98'
                : 'border-2 border-transparent'
            }`}
          >
            <div className="flex items-start justify-between w-full">
              <div className={`p-2.5 rounded-xl ${stat.color} ${stat.iconBg}`}>
                <stat.icon size={20} />
              </div>
              <span className="text-2xl font-black text-gray-900 leading-none">{stat.value}</span>
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                {stat.label}
                {stat.clickable && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md">
                    QUERY
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{stat.sub}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Date Revenue Selector Section */}
      <AnimatePresence>
        {showDatePicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card bg-green-50/20 border-2 border-emerald-100 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                  <Calendar className="text-[#0F5132]" size={18} />
                  Check Revenue for Specified Date
                </h3>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="w-full sm:w-64">
                  <label className="label text-xs font-bold text-gray-500">Select Date</label>
                  <input
                    type="date"
                    value={selectedRevenueDate}
                    onChange={(e) => setSelectedRevenueDate(e.target.value)}
                    className="input bg-white border-gray-200"
                  />
                </div>
              </div>

              {selectedRevenueDate && (() => {
                const dateParts = selectedRevenueDate.split('-');
                const targetDate = new Date(
                  parseInt(dateParts[0]),
                  parseInt(dateParts[1]) - 1,
                  parseInt(dateParts[2])
                );
                const stats = getRevenueForDate(targetDate);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Total Revenue</p>
                      <p className="text-xl font-black text-[#0F5132] mt-1">{formatCurrency(stats.total)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{stats.count} checkout(s)</p>
                    </div>
                    <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Cash Payments</p>
                      <p className="text-xl font-black text-blue-600 mt-1">{formatCurrency(stats.cashTotal)}</p>
                    </div>
                    <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">UPI / Online</p>
                      <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrency(stats.upiTotal)}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3 text-sm">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(action.to)}
              className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-transform hover:-translate-y-0.5 shadow-sm font-semibold ${action.color}`}
            >
              <action.icon size={20} />
              <span className="text-xs">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Court Status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          className="card"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Circle size={16} className="text-[#0F5132]" />
            Court Status
          </h3>
          <div className="space-y-3">
            {courts.map((court) => {
              const liveStatus = getLiveStatus(court);
              const activeBooking = bookings.find(
                (b) => b.courtId === court.id && b.status === 'active' && new Date(b.startTime) <= now && new Date(b.endTime) > now
              );
              return (
                <div key={court.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{court.name}</p>
                    <p className="text-xs text-gray-500">
                      {activeBooking ? `${activeBooking.customerName} (Ongoing)` : 'No active game'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      liveStatus === 'occupied' ? 'bg-amber-100 text-amber-800' :
                      liveStatus === 'maintenance' ? 'bg-red-100 text-red-700' :
                      liveStatus === 'disabled' ? 'bg-gray-200 text-gray-600' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {liveStatus === 'occupied' ? 'live match' : liveStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => navigate('/live-courts')}
            className="mt-4 text-[#0F5132] text-sm font-medium flex items-center gap-1 hover:underline"
          >
            View Live Courts <ArrowRight size={14} />
          </button>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Clock size={16} className="text-[#0F5132]" />
            Recent Activity
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {activityLog.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  entry.type === 'booking' ? 'bg-blue-500' :
                  entry.type === 'checkout' ? 'bg-green-500' :
                  entry.type === 'inventory' ? 'bg-amber-500' :
                  'bg-gray-400'
                }`} />
                <div className="min-w-0">
                  <p className="text-xs text-gray-700 leading-tight">{entry.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{getTimeAgo(entry.timestamp)}</p>
                </div>
              </div>
            ))}
            {activityLog.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No recent activity</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Low Stock Warning */}
      {lowStock.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
        >
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">Low Stock Alert</p>
            <p className="text-amber-700 text-xs mt-0.5">
              {lowStock.map((i) => `${i.name} (${i.stock} left)`).join(', ')}
            </p>
          </div>
          <button
            onClick={() => navigate('/inventory')}
            className="text-amber-700 text-xs font-medium hover:underline flex-shrink-0"
          >
            View →
          </button>
        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PAYMENT MANAGEMENT SECTION
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="card space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-155 pb-3">
          <div>
            <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
              <IndianRupee size={20} className="text-[#0F5132]" />
              Payment Management
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Audit court prices, adjust discounts, and verify checkout totals for today's settled sessions</p>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          {/* Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={pmSearch}
              onChange={(e) => setPmSearch(e.target.value)}
              placeholder="Search customer/phone..."
              className="input pl-9 text-xs"
            />
          </div>

          {/* Court Filter */}
          <div>
            <select
              value={pmCourtFilter}
              onChange={(e) => setPmCourtFilter(e.target.value)}
              className="input text-xs"
            >
              <option value="all">All Courts</option>
              {courts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="overflow-x-auto border border-gray-100 rounded-2xl">
          <table className="w-full min-w-[1100px] text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-150 text-gray-500 font-bold uppercase tracking-wider text-left">
                <th className="px-4 py-3">Booking ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Court</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3 text-right">Duration</th>
                <th className="px-4 py-3 text-right">Court Price</th>
                <th className="px-4 py-3 text-center">Discounts</th>
                <th className="px-4 py-3 text-right">F&B Charges</th>
                <th className="px-4 py-3 text-right font-black text-gray-700">Final Total</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBookings.map((b) => {
                const court = courts.find(c => c.id === b.courtId);
                const { courtPrice, additionalCharges, discount, finalAmount } = getBookingPaymentDetails(b);

                return (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-[10px] text-gray-400" title={b.id}>
                      {b.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-gray-900">{b.customerName}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{b.phone}</div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-gray-700">
                      {court ? court.name : 'Unknown'}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">
                      <div>{new Date(b.startTime).toLocaleDateString('en-IN')}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium">
                      {b.duration} mins
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-gray-900">
                      {formatCurrency(courtPrice)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {discount ? (
                        <span className="badge badge-available">
                          {discount.name} ({discount.value}{discount.type === 'percentage' ? '%' : '₹'})
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-gray-600">
                      {formatCurrency(additionalCharges)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-[#0F5132]">
                      {formatCurrency(finalAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`badge uppercase tracking-wider text-[9px] ${
                          b.paymentStatus === 'paid' ? 'badge-available' : 'badge-occupied'
                        }`}>{b.paymentStatus}</span>
                        <span className={`text-[9px] uppercase font-bold tracking-wide ${
                          b.status === 'active' ? 'text-blue-500' :
                          b.status === 'completed' ? 'text-emerald-600' : 'text-red-400'
                        }`}>{b.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedBookingForEdit(b)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 cursor-pointer"
                        title="Audit / Edit Payment"
                      >
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-gray-400 text-xs">
                    No bookings found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* EDIT PAYMENT MODAL */}
      <AnimatePresence>
        {selectedBookingForEdit && (
          <EditPaymentModal
            booking={selectedBookingForEdit}
            onClose={() => setSelectedBookingForEdit(null)}
            courts={courts}
            getBookingPaymentDetails={getBookingPaymentDetails}
            currentUser={settings.currentUser}
            updateBookingPayment={updateBookingPayment}
            addPostCheckoutItem={addPostCheckoutItem}
            inventory={inventory}
            tabs={tabs}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EDIT PAYMENT MODAL COMPONENT
// ─────────────────────────────────────────────────────────────
interface EditPaymentModalProps {
  booking: Booking;
  onClose: () => void;
  courts: Court[];
  getBookingPaymentDetails: (b: Booking) => {
    courtPrice: number;
    additionalCharges: number;
    discount: DiscountApplication | null;
    finalAmount: number;
  };
  currentUser: string;
  updateBookingPayment: any;
  addPostCheckoutItem: any;
  inventory: any[];
  tabs: any[];
}

function EditPaymentModal({
  booking, onClose, courts, getBookingPaymentDetails, currentUser, updateBookingPayment,
  addPostCheckoutItem, inventory, tabs
}: EditPaymentModalProps) {
  const court = courts.find(c => c.id === booking.courtId);
  const { courtPrice, discount } = getBookingPaymentDetails(booking);

  // Get live additional charges from tabs (reactive)
  const bookingTab = tabs.find((t: any) => t.bookingId === booking.id);
  const liveAdditionalCharges = bookingTab ? bookingTab.items.reduce((s: number, item: any) => s + item.quantity * item.unitPrice, 0) : 0;

  // States
  const [editedCourtPrice, setEditedCourtPrice] = useState(courtPrice);
  const [discountName, setDiscountName] = useState(discount?.name || '');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(discount?.type || 'percentage');
  const [discountValue, setDiscountValue] = useState(discount?.value || 0);
  const [notes, setNotes] = useState(booking.notes || '');
  const [showAddItems, setShowAddItems] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  // Live calculation values
  const subtotal = Number(editedCourtPrice) + liveAdditionalCharges;
  const currentDiscountAmount = discountType === 'percentage'
    ? (subtotal * Number(discountValue)) / 100
    : Number(discountValue);
  const finalCalculatedAmount = Math.max(0, subtotal - currentDiscountAmount);

  // Filtered inventory for add items panel
  const availableItems = inventory.filter((item: any) =>
    item.stock > 0 && item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const handleSave = async () => {
    // Generate change action description
    const actions: string[] = [];
    if (editedCourtPrice !== courtPrice) {
      actions.push(`Court Price adjusted from ₹${courtPrice} to ₹${editedCourtPrice}`);
    }
    const oldDiscountDesc = discount ? `${discount.name} (${discount.value}${discount.type === 'percentage' ? '%' : '₹'})` : 'None';
    const newDiscountDesc = discountValue > 0 ? `${discountName || 'Discount'} (${discountValue}${discountType === 'percentage' ? '%' : '₹'})` : 'None';
    if (oldDiscountDesc !== newDiscountDesc) {
      actions.push(`Discount changed from [${oldDiscountDesc}] to [${newDiscountDesc}]`);
    }
    if (notes !== booking.notes) {
      actions.push(`Notes updated`);
    }

    if (actions.length === 0) {
      // No changes made
      onClose();
      return;
    }

    const logEntry = {
      user: currentUser || 'Admin',
      timestamp: new Date().toISOString(),
      action: actions.join('; ')
    };

    const newDiscountObj = discountValue > 0 ? {
      name: discountName || 'Discount',
      type: discountType,
      value: Number(discountValue)
    } : null;

    await updateBookingPayment(booking.id, Number(editedCourtPrice), newDiscountObj, notes, logEntry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal Card */}
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg z-10 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div>
            <h3 className="font-black text-gray-900 text-base">Audit / Edit Billing</h3>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">Booking ID: {booking.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Customer Snapshot */}
        <div className="bg-gray-50 rounded-xl p-3.5 text-xs grid grid-cols-2 gap-2 border border-gray-100">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Customer Name</span>
            <p className="font-semibold text-gray-800 mt-0.5">{booking.customerName}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Phone</span>
            <p className="font-semibold text-gray-800 mt-0.5">{booking.phone}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Court Name</span>
            <p className="font-semibold text-gray-800 mt-0.5">{court ? court.name : 'Unknown'}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Play Schedule</span>
            <p className="font-semibold text-gray-800 mt-0.5">
              {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-3.5 text-xs">
          {/* Edit Court Price */}
          <div>
            <label className="label font-bold text-gray-600">Base Court Price (₹)</label>
            <input
              type="number"
              value={editedCourtPrice}
              onChange={(e) => setEditedCourtPrice(parseFloat(e.target.value) || 0)}
              className="input"
              min={0}
            />
          </div>

          {/* Discount Block */}
          <div className="border border-gray-150 rounded-xl p-3 space-y-3 bg-white">
            <span className="font-bold text-gray-700 block">Apply / Modify Discount</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Discount Name</label>
                <input
                  type="text"
                  value={discountName}
                  onChange={(e) => setDiscountName(e.target.value)}
                  placeholder="e.g. Member Promo"
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="label text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="input text-xs"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Discount Value</label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                className="input"
                min={0}
              />
            </div>
          </div>

          {/* F&B Tab Charges — Interactive */}
          <div className="border border-gray-150 rounded-xl p-3 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={14} className="text-[#0F5132]" />
                <span className="font-bold text-gray-700">F&B Tab Charges</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-gray-900 text-sm">{formatCurrency(liveAdditionalCharges)}</span>
                <button
                  onClick={() => setShowAddItems(!showAddItems)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                    showAddItems ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {showAddItems ? <><Minus size={10} /> Close</> : <><Plus size={10} /> Add Items</>}
                </button>
              </div>
            </div>

            {/* Existing tab items list */}
            {bookingTab && bookingTab.items.length > 0 && (
              <div className="space-y-1">
                {bookingTab.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-[11px] bg-gray-50 rounded-lg px-2.5 py-1.5">
                    <span className="text-gray-700 font-medium">{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                    <span className="font-semibold text-gray-800">{formatCurrency(item.quantity * item.unitPrice)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Add items panel */}
            <AnimatePresence>
              {showAddItems && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-gray-100 pt-2.5 space-y-2">
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        placeholder="Search drinks, snacks..."
                        className="input pl-8 text-[11px] py-1.5"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {availableItems.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-2 hover:bg-gray-100 transition-colors">
                          <div>
                            <span className="text-[11px] font-semibold text-gray-800">{item.name}</span>
                            <span className="text-[10px] text-gray-400 ml-1.5">₹{item.sellingPrice} · {item.stock} left</span>
                          </div>
                          <button
                            onClick={() => {
                              addPostCheckoutItem(booking.id, {
                                inventoryItemId: item.id,
                                name: item.name,
                                quantity: 1,
                                unitPrice: item.sellingPrice,
                              });
                            }}
                            className="flex items-center gap-1 bg-[#0F5132] text-white px-2 py-1 rounded-md text-[10px] font-bold hover:bg-[#0a3d26] transition-colors cursor-pointer"
                          >
                            <Plus size={10} /> Add
                          </button>
                        </div>
                      ))}
                      {availableItems.length === 0 && (
                        <p className="text-gray-400 text-[10px] text-center py-3">No items found</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recalculated Final Receipt preview */}
          <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Subtotal (Court + F&B):</span>
              <span className="font-semibold text-gray-700">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-red-500 font-medium">
              <span>Discount Amount:</span>
              <span>- {formatCurrency(currentDiscountAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-emerald-100 text-sm font-black text-gray-900">
              <span>Recalculated Grand Total:</span>
              <span className="text-[#0F5132]">{formatCurrency(finalCalculatedAmount)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label font-bold text-gray-600">Booking Notes / Comments</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add booking notes..."
              className="input h-16 resize-none"
            />
          </div>
        </div>

        {/* Change Log Timeline */}
        <div className="border-t border-gray-150 pt-3 space-y-2">
          <span className="font-bold text-gray-900 text-xs flex items-center gap-1">
            <FileText size={14} className="text-[#0F5132]" />
            Change Log History
          </span>
          <div className="space-y-1.5 max-h-32 overflow-y-auto text-[10px] bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            {booking.changeLog && booking.changeLog.map((log, idx) => (
              <div key={idx} className="border-b border-gray-100 pb-1.5 last:border-0 last:pb-0">
                <div className="flex justify-between items-center text-gray-400 font-bold">
                  <span>{log.user}</span>
                  <span>{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-gray-600 mt-0.5">{log.action}</p>
              </div>
            ))}
            {(!booking.changeLog || booking.changeLog.length === 0) && (
              <p className="text-gray-400 text-center py-2">No audits or edits have been logged for this booking.</p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1 cursor-pointer">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1 cursor-pointer">Save Changes</button>
        </div>
      </motion.div>
    </div>
  );
}

function getGreeting(date: Date) {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
