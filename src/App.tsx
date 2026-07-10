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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
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
          <Route path="live-courts" element={<LiveCourts />} />
          <Route path="court-tabs" element={<CourtTabs />} />
          <Route path="pos" element={<POS />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="tasks" element={<DailyTasks />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
