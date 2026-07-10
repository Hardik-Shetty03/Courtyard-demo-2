// src/pages/Dashboard.tsx
import { motion } from 'framer-motion';
import {
  IndianRupee, Calendar, CheckCircle, Circle,
  Package, AlertTriangle, Zap, Clock, ArrowRight
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency, getTimeAgo } from '@/utils';
import { useNavigate } from 'react-router-dom';

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

  const occupied = courts.filter((c) => c.status === 'occupied').length;
  const available = courts.filter((c) => c.status === 'available').length;
  const todayBookings = bookings.filter(
    (b) => new Date(b.createdAt).toDateString() === new Date().toDateString()
  ).length;
  const todayRevenue = completedCheckouts.reduce((s, c) => s + c.grandTotal, 0);
  const lowStock = getLowStockItems();
  const pendingPayments = courts.filter((c) => c.status === 'occupied').length;
  const openTasks = tasks.filter((t) => !t.completed).length;

  const stats = [
    {
      label: "Today's Revenue",
      value: formatCurrency(todayRevenue),
      icon: IndianRupee,
      color: 'bg-emerald-50 text-emerald-600',
      iconBg: 'bg-emerald-100',
      sub: `${completedCheckouts.length} checkouts`,
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
      sub: 'active sessions',
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
        <h2 className="text-xl font-bold text-gray-900">Good {getGreeting()}, Admin 👋</h2>
        <p className="text-gray-500 text-sm">Here's what's happening at The Courtyard today.</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="card hover:shadow-md transition-shadow"
          >
            <div className={`w-9 h-9 ${stat.iconBg} rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon size={18} className={stat.color.split(' ')[1]} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs font-medium text-gray-700 mt-0.5">{stat.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap size={16} className="text-[#0F5132]" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(({ label, icon: Icon, to, color }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className={`${color} rounded-xl p-3 flex flex-col items-center gap-2 hover:opacity-90 transition-all duration-200 active:scale-95`}
              >
                <Icon size={20} />
                <span className="text-xs font-medium text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Court Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Circle size={16} className="text-[#0F5132]" />
            Court Status
          </h3>
          <div className="space-y-3">
            {courts.map((court) => {
              const booking = bookings.find(
                (b) => b.courtId === court.id && b.status === 'active'
              );
              return (
                <div key={court.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{court.name}</p>
                    <p className="text-xs text-gray-500">
                      {booking ? booking.customerName : 'No booking'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${court.status === 'occupied' ? 'bg-red-100 text-red-700' : court.status === 'maintenance' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {court.status}
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
