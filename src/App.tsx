// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Layout from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Courts from '@/pages/Courts';
import LiveCourts from '@/pages/LiveCourts';
import CourtTabs from '@/pages/CourtTabs';
import POS from '@/pages/POS';
import Inventory from '@/pages/Inventory';
import DailyTasks from '@/pages/DailyTasks';
import Settings from '@/pages/Settings';
import StatusChecker from '@/pages/StatusChecker';
import Tournaments from '@/pages/Tournaments';
import BulkBooking from '@/pages/BulkBooking';


import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { playAlarmSound } from '@/utils/audio';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { initializeStore, bookings } = useStore();
  const playedAlarmsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    initializeStore();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        initializeStore();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initializeStore]);

  // Alarm sound triggers when an active unpaid booking ends (within a 2-minute window)
  useEffect(() => {
    const checkExpiredBookings = () => {
      const nowTime = new Date().getTime();
      bookings.forEach((b) => {
        if (b.status !== 'active') return;
        const endTime = new Date(b.endTime).getTime();
        const diff = nowTime - endTime;

        // Ended, ended in the last 2 minutes, unpaid, and alarm hasn't played in this session yet
        if (diff > 0 && diff < 120000 && b.paymentStatus === 'unpaid') {
          if (!playedAlarmsRef.current.has(b.id)) {
            playedAlarmsRef.current.add(b.id);
            playAlarmSound();
            console.log(`[ALARM] Booking for ${b.customerName} on court ${b.courtId} has ended!`);
          }
        }
      });
    };

    checkExpiredBookings();
    const interval = setInterval(checkExpiredBookings, 8000);
    return () => clearInterval(interval);
  }, [bookings]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/courts" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="courts" element={<Courts />} />
          <Route path="bulk-booking" element={<BulkBooking />} />
          <Route path="status-checker" element={<StatusChecker />} />
          <Route path="live-courts" element={<LiveCourts />} />
          <Route path="court-tabs" element={<CourtTabs />} />
          <Route path="pos" element={<POS />} />
          <Route path="tournaments" element={<Tournaments />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="tasks" element={<DailyTasks />} />
          <Route path="settings" element={<Settings />} />

        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
