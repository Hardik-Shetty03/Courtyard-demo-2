// src/pages/LiveCourts.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, User, IndianRupee, Activity, Phone, ToggleLeft } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatTime, getElapsedDisplay } from '@/utils';
import { useNavigate } from 'react-router-dom';
import type { Court, Booking } from '@/types';

export default function LiveCourts() {
  const { courts, bookings, tabs } = useStore();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

  // Refresh every 15 seconds to sync live court status dynamically based on current time
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(interval);
  }, []);

  const getLiveBooking = (courtId: string): Booking | undefined => {
    return bookings.find(
      (b) => b.courtId === courtId && b.status === 'active' && new Date(b.startTime) <= now && new Date(b.endTime) > now
    );
  };

  const getLiveStatus = (court: Court) => {
    if (court.isMaintenanceMode) return 'maintenance';
    if (!court.isEnabled) return 'disabled';
    const hasLiveMatch = !!getLiveBooking(court.id);
    return hasLiveMatch ? 'live match' : 'available';
  };

  const formatRemainingTime = (endTimeStr: string): string => {
    const diff = new Date(endTimeStr).getTime() - now.getTime();
    const totalMinutes = Math.max(0, Math.round(diff / 60000));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}m remaining`;
    return `${h}h ${m}m remaining`;
  };

  const occupied = courts.filter((c) => getLiveStatus(c) === 'live match').length;
  const available = courts.filter((c) => getLiveStatus(c) === 'available').length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Live Courts</h2>
          <p className="text-sm text-gray-500">Real-time status updates based on booking timeline</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <Activity size={14} className="text-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-700">Live</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="text-3xl font-black text-[#0F5132]">{occupied}</div>
          <div className="text-sm text-gray-500 mt-1 font-semibold">Live Matches</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-black text-emerald-500">{available}</div>
          <div className="text-sm text-gray-500 mt-1 font-semibold">Available Courts</div>
        </div>
      </div>

      {/* Court Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {courts.map((court, i) => {
          const liveBooking = getLiveBooking(court.id);
          const tab = tabs.find((t) => t.courtId === court.id && t.status === 'open');
          const tabTotal = tab ? tab.items.reduce((s, item) => s + item.quantity * item.unitPrice, 0) : 0;
          const courtCharge = liveBooking ? liveBooking.totalCharge : 0;
          const runningBill = courtCharge + tabTotal;

          const liveStatus = getLiveStatus(court);
          const isLiveMatch = liveStatus === 'live match';
          const isMaintenance = liveStatus === 'maintenance';
          const isDisabled = liveStatus === 'disabled';

          // Card color schemes
          let cardBorder = 'border-emerald-200';
          let statusBg = 'bg-emerald-50 text-emerald-700';
          let statusText = 'available';

          if (isLiveMatch) {
            cardBorder = 'border-amber-300';
            statusBg = 'bg-amber-100 text-amber-800 animate-pulse';
            statusText = 'live match';
          } else if (isMaintenance) {
            cardBorder = 'border-red-200';
            statusBg = 'bg-red-50 text-red-700';
            statusText = 'maintenance';
          } else if (isDisabled) {
            cardBorder = 'border-gray-200';
            statusBg = 'bg-gray-100 text-gray-500';
            statusText = 'disabled';
          }

          return (
            <motion.div
              key={court.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`card flex flex-col gap-4 border-2 ${cardBorder}`}
            >
              {/* Court header */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900">{court.name}</h3>
                <div className={`w-3.5 h-3.5 rounded-full ${
                  isLiveMatch ? 'bg-amber-400 animate-ping' :
                  isMaintenance ? 'bg-red-500' :
                  isDisabled ? 'bg-gray-400' : 'bg-emerald-500'
                }`} />
              </div>

              {/* Status indicator banner */}
              <div className={`rounded-xl p-4 text-center ${statusBg}`}>
                <span className="text-lg font-black uppercase tracking-wider">
                  {statusText}
                </span>
                {liveBooking && (
                  <p className="text-gray-700 text-sm font-semibold mt-1">
                    {liveBooking.customerName.toUpperCase()}
                  </p>
                )}
              </div>

              {/* Live Info details */}
              {liveBooking ? (
                <div className="space-y-3 bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                    <span className="flex items-center gap-1"><User size={13} /> {liveBooking.customerName}</span>
                    <span className="flex items-center gap-1"><Phone size={12} /> {liveBooking.phone}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span className="flex items-center gap-1"><Clock size={13} /> {formatTime(liveBooking.startTime)} – {formatTime(liveBooking.endTime)}</span>
                    <span className="text-[#0F5132] font-bold">{formatRemainingTime(liveBooking.endTime)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-gray-400 text-xs font-medium">Running Bill</span>
                    <span className="font-black text-base text-[#0F5132]">{formatCurrency(runningBill)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 py-8 text-center text-gray-400 text-xs">
                  {isMaintenance ? (
                    <p>🔧 Court is currently undergoing maintenance</p>
                  ) : isDisabled ? (
                    <p>🚫 Court is disabled in settings</p>
                  ) : (
                    <p>🟢 Ready for booking. No live matches ongoing.</p>
                  )}
                </div>
              )}

              {/* Pricing Rate footer */}
              <div className="flex items-center justify-between text-xs text-gray-400 mt-auto border-t border-gray-100 pt-2.5">
                <span>Rate: {formatCurrency(court.hourlyRate)}/hr</span>
                {liveBooking && tab && (
                  <span className="text-blue-600 font-semibold">{tab.items.length} item(s) on tab</span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {isLiveMatch ? (
                  <>
                    <button
                      onClick={() => navigate('/court-tabs')}
                      className="btn-primary flex-1 text-xs py-2.5"
                    >
                      Open Court Tab
                    </button>
                    <button
                      onClick={() => navigate('/pos')}
                      className="btn-secondary flex-1 text-xs py-2.5"
                    >
                      Add Items
                    </button>
                  </>
                ) : (
                  !isMaintenance && !isDisabled && (
                    <button
                      onClick={() => navigate('/courts')}
                      className="btn-primary w-full text-xs py-2.5"
                    >
                      Book Now
                    </button>
                  )
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
