// src/components/layout/TopBar.tsx
import { Menu, Bell, Clock, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/courts': 'Court Booking',
  '/live-courts': 'Live Courts',
  '/court-tabs': 'Court Tabs',
  '/pos': 'Point of Sale',
  '/inventory': 'Inventory',
  '/tasks': 'Daily Tasks',
  '/settings': 'Settings',
};

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { getLowStockItems, bookings, courts } = useStore();
  const title = PAGE_TITLES[location.pathname] ?? 'The Courtyard';
  const lowStock = getLowStockItems();
  const [time, setTime] = useState(new Date());
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute dynamic active unpaid and expired sessions
  const expiredUnpaidBookings = bookings.filter((b) => {
    if (b.status !== 'active' || b.paymentStatus === 'paid') return false;
    return new Date(b.endTime) < new Date();
  });

  // Construct consolidated notifications array
  const notifications = [
    ...lowStock.map((item) => ({
      id: `stock-${item.id}`,
      type: 'stock',
      title: 'Low Stock Warning',
      message: `${item.name} has only ${item.stock} left in inventory.`,
      badge: 'Inventory',
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      link: '/inventory',
    })),
    ...expiredUnpaidBookings.map((b) => {
      const court = courts.find((c) => c.id === b.courtId);
      return {
        id: `booking-${b.id}`,
        type: 'booking',
        title: 'Overdue Unpaid Tab',
        message: `${b.customerName}'s session on ${court ? court.name : 'Court'} has ended but remains unpaid.`,
        badge: 'Payment Due',
        color: 'bg-red-50 border-red-200 text-red-800',
        icon: AlertCircle,
        iconColor: 'text-red-600',
        link: '/court-tabs',
      };
    }),
  ];

  return (
    <>
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={11} />
              <span>{time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 relative">
          {/* Notification Button */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className={`p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 relative cursor-pointer ${
                notificationsOpen ? 'bg-gray-100' : ''
              }`}
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown Panel */}
            <AnimatePresence>
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-150 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                      <span className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        Notifications
                        {notifications.length > 0 && (
                          <span className="bg-[#0F5132] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {notifications.length}
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                          <Bell size={24} className="mx-auto mb-2 text-gray-300" />
                          <p className="text-xs font-semibold">All caught up!</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">No critical notifications right now.</p>
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const Icon = notif.icon;
                          return (
                            <div
                              key={notif.id}
                              onClick={() => {
                                navigate(notif.link);
                                setNotificationsOpen(false);
                              }}
                              className="p-3.5 hover:bg-gray-50 transition-colors cursor-pointer text-left space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border ${notif.color}`}>
                                  {notif.badge}
                                </span>
                              </div>
                              <div className="flex items-start gap-2.5 pt-0.5">
                                <Icon size={14} className={`${notif.iconColor} flex-shrink-0 mt-0.5`} />
                                <div className="space-y-0.5">
                                  <p className="text-xs font-bold text-gray-800 leading-tight">{notif.title}</p>
                                  <p className="text-[11px] text-gray-500 leading-snug">{notif.message}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
            <div className="w-6 h-6 bg-[#0F5132] rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-xs">A</span>
            </div>
            <span className="text-sm font-medium text-gray-700">Admin</span>
          </div>
        </div>
      </header>
    </>
  );
}
