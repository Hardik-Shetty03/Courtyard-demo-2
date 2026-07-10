// src/pages/LiveCourts.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, User, IndianRupee, Activity, Phone } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatTime, getElapsedDisplay, calculateCourtCharge } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function LiveCourts() {
  const { courts, bookings, tabs } = useStore();
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  // Refresh every 30 seconds to update elapsed time and running bill
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const occupied = courts.filter((c) => c.status === 'occupied').length;
  const available = courts.filter((c) => c.status === 'available').length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Live Courts</h2>
          <p className="text-sm text-gray-500">Real-time view of all courts</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <Activity size={14} className="text-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-700">Live</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="text-3xl font-black text-red-500">{occupied}</div>
          <div className="text-sm text-gray-500 mt-1">Occupied</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-black text-emerald-500">{available}</div>
          <div className="text-sm text-gray-500 mt-1">Available</div>
        </div>
      </div>

      {/* Court Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {courts.map((court, i) => {
          const booking = bookings.find((b) => b.courtId === court.id && b.status === 'active');
          const tab = tabs.find((t) => t.courtId === court.id && t.status === 'open');
          const tabTotal = tab ? tab.items.reduce((s, item) => s + item.quantity * item.unitPrice, 0) : 0;
          const courtCharge = booking ? calculateCourtCharge(booking.startTime, court.hourlyRate) : 0;
          const runningBill = courtCharge + tabTotal;
          const isOccupied = court.status === 'occupied';

          return (
            <motion.div
              key={court.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`card flex flex-col gap-4 border-2 ${
                isOccupied ? 'border-red-200' :
                court.status === 'maintenance' ? 'border-amber-200' : 'border-emerald-200'
              }`}
            >
              {/* Court header */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900">{court.name}</h3>
                <div className={`w-4 h-4 rounded-full ${
                  isOccupied ? 'bg-red-500 animate-pulse' :
                  court.status === 'maintenance' ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse'
                }`} />
              </div>

              {/* Status big */}
              <div className={`rounded-xl p-5 text-center ${
                isOccupied ? 'bg-red-50' :
                court.status === 'maintenance' ? 'bg-amber-50' : 'bg-emerald-50'
              }`}>
                <span className={`text-2xl font-black uppercase ${
                  isOccupied ? 'text-red-600' :
                  court.status === 'maintenance' ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {court.status}
                </span>
                {booking && (
                  <p className="text-gray-600 text-sm font-medium mt-1">{booking.customerName}</p>
                )}
              </div>

              {/* Info */}
              {booking && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <User size={13} /> {booking.customerName}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Phone size={13} /> {booking.phone}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Clock size={13} />
                    {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-[#0F5132]">
                    <Activity size={13} />
                    {getElapsedDisplay(booking.startTime)} elapsed
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <IndianRupee size={11} /> Running Bill
                    </div>
                    <span className="font-black text-lg text-[#0F5132]">{formatCurrency(runningBill)}</span>
                  </div>
                </div>
              )}

              {/* Rate */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Rate: {formatCurrency(court.hourlyRate)}/hr</span>
                {booking && tab && (
                  <span className="text-blue-500">{tab.items.length} item(s) on tab</span>
                )}
              </div>

              {/* Actions */}
              {isOccupied && (
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/court-tabs')}
                    className="btn-primary flex-1 text-sm py-2"
                  >
                    View Tab
                  </button>
                  <button
                    onClick={() => navigate('/pos')}
                    className="btn-secondary flex-1 text-sm py-2"
                  >
                    Add Items
                  </button>
                </div>
              )}
              {!isOccupied && court.status === 'available' && (
                <button
                  onClick={() => navigate('/courts')}
                  className="btn-primary w-full text-sm py-2"
                >
                  Book Now
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
