// src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee, Calendar, CheckCircle, Circle,
  Package, AlertTriangle, Zap, Clock, ArrowRight
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency, getTimeAgo } from '@/utils';
import { useNavigate } from 'react-router-dom';
import type { Court } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

export default function Dashboard() {
  const {
    courts, bookings, activityLog, getLowStockItems,
    completedCheckouts, tasks
  } = useStore();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  
  // Date Selector States for Revenue Check
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedRevenueDate, setSelectedRevenueDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

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
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
        <h3 className="font-bold text-gray-900 mb-3">Quick Actions</h3>
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
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
    </div>
  );
}

function getGreeting(date: Date) {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
