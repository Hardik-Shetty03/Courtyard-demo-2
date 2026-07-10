// src/components/layout/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Activity, CreditCard,
  Package, CheckSquare, Settings, LogOut, X, Dumbbell, Search
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/utils';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/courts', icon: Calendar, label: 'Court Booking' },
  { to: '/status-checker', icon: Search, label: 'Status Checker' },
  { to: '/live-courts', icon: Activity, label: 'Live Courts' },
  { to: '/court-tabs', icon: CreditCard, label: 'Court Tabs' },
  { to: '/pos', icon: Dumbbell, label: 'POS' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/tasks', icon: CheckSquare, label: 'Daily Tasks' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { settings, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-green-900/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-400 rounded-xl flex items-center justify-center">
            <span className="text-green-900 font-black text-lg">C</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">{settings.facilityName}</p>
            <p className="text-green-300 text-xs">Management System</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-green-300 hover:text-white p-1 rounded-lg hover:bg-green-900/40 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-green-900/30">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {settings.currentUser.charAt(0)}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{settings.currentUser}</p>
            <p className="text-green-400 text-xs">Receptionist</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer',
                isActive
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-green-200 hover:bg-green-900/50 hover:text-white'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-green-900/30">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-green-300 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 w-full"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#0a3d26] min-h-screen flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-[#0a3d26] z-50 lg:hidden flex flex-col"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
