// src/components/layout/TopBar.tsx
import { Menu, Bell, Clock } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useState, useEffect } from 'react';

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
  const { getLowStockItems } = useStore();
  const title = PAGE_TITLES[location.pathname] ?? 'The Courtyard';
  const lowStock = getLowStockItems();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
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

      <div className="flex items-center gap-2">
        {lowStock.length > 0 && (
          <div className="relative">
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 relative">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        )}
        <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
          <div className="w-6 h-6 bg-[#0F5132] rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-xs">A</span>
          </div>
          <span className="text-sm font-medium text-gray-700">Admin</span>
        </div>
      </div>
    </header>
  );
}
