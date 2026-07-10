// src/components/layout/BottomNav.tsx
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, CreditCard, Package, Activity } from 'lucide-react';
import { cn } from '@/utils';

const BOTTOM_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/courts', icon: Calendar, label: 'Courts' },
  { to: '/live-courts', icon: Activity, label: 'Live' },
  { to: '/court-tabs', icon: CreditCard, label: 'Tabs' },
  { to: '/inventory', icon: Package, label: 'Stock' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-30 lg:hidden">
      <div className="flex items-center justify-around py-1">
        {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px]',
                isActive
                  ? 'text-[#0F5132]'
                  : 'text-gray-400 hover:text-gray-600'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
