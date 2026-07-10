// src/pages/StatusChecker.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarRange, CheckCircle2, XCircle, Clock,
  ArrowRight, Search, Sparkles
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatTime } from '@/utils';
import { useNavigate } from 'react-router-dom';
import type { Court, Booking } from '@/types';

// Hours options for dropdowns
const HOURS = Array.from({ length: 18 }, (_, i) => 6 + i); // 6 AM to 11 PM
const MINUTES = [0, 15, 30, 45];

function fmtTimeParts(h: number, m: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m.toString().padStart(2, '0');
  return `${displayH}:${displayM} ${ampm}`;
}

export default function StatusChecker() {
  const { courts, bookings } = useStore();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [startHour, setStartHour] = useState(18); // default 6:00 PM
  const [startMin, setStartMin] = useState(15);   // default 6:15 PM
  const [endHour, setEndHour] = useState(19);     // default 7:00 PM
  const [endMin, setEndMin] = useState(0);

  const [loading, setLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Results state
  const [results, setResults] = useState<{
    queryRange: { start: Date; end: Date };
    available: { court: Court }[];
    unavailable: { court: Court; conflict: Booking }[];
  } | null>(null);

  const handleCheckStatus = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setHasChecked(true);

    // Simulate premium Apple-like quick loading animation
    setTimeout(() => {
      const qStart = new Date(selectedDate);
      qStart.setHours(startHour, startMin, 0, 0);

      const qEnd = new Date(selectedDate);
      qEnd.setHours(endHour, endMin, 0, 0);

      const avail: { court: Court }[] = [];
      const unavail: { court: Court; conflict: Booking }[] = [];

      courts.forEach(court => {
        // Find if there is an active booking on this court on the selected date that overlaps
        const conflictBooking = bookings.find(b => {
          if (b.courtId !== court.id || b.status === 'cancelled') return false;
          const sameDay = new Date(b.startTime).toDateString() === qStart.toDateString();
          if (!sameDay) return false;

          const bStart = new Date(b.startTime).getTime();
          const bEnd = new Date(b.endTime).getTime();
          return qStart.getTime() < bEnd && qEnd.getTime() > bStart;
        });

        if (conflictBooking) {
          unavail.push({ court, conflict: conflictBooking });
        } else {
          avail.push({ court });
        }
      });

      setResults({
        queryRange: { start: qStart, end: qEnd },
        available: avail,
        unavailable: unavail
      });
      setLoading(false);
    }, 800);
  };

  const handleBookNow = (courtId: string) => {
    // Pass booking details to Courts timeline page via router state
    navigate('/courts', {
      state: {
        prefill: {
          courtId,
          date: selectedDate,
          startHour,
          startMinute: startMin,
          endHour,
          endMinute: endMin
        }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Title */}
      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-black text-gray-900 flex items-center justify-center sm:justify-start gap-2">
          🏓 Instant Court Status
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Select a time range to instantly view the availability of every court.
        </p>
      </div>

      {/* Glassmorphic Search Panel */}
      <form
        onSubmit={handleCheckStatus}
        className="relative bg-white/70 backdrop-blur-md border border-white/20 shadow-xl rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
      >
        <div>
          <label className="label text-xs uppercase font-bold text-gray-500 tracking-wider">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="input w-full"
            required
          />
        </div>

        <div>
          <label className="label text-xs uppercase font-bold text-gray-500 tracking-wider">Start Time</label>
          <div className="flex gap-2">
            <select
              value={startHour}
              onChange={e => setStartHour(parseInt(e.target.value))}
              className="input flex-1"
            >
              {HOURS.map(h => (
                <option key={h} value={h}>{fmtTimeParts(h, 0).replace(':00', '')}</option>
              ))}
            </select>
            <select
              value={startMin}
              onChange={e => setStartMin(parseInt(e.target.value))}
              className="input flex-1"
            >
              {MINUTES.map(m => (
                <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label text-xs uppercase font-bold text-gray-500 tracking-wider">End Time</label>
          <div className="flex gap-2">
            <select
              value={endHour}
              onChange={e => setEndHour(parseInt(e.target.value))}
              className="input flex-1"
            >
              {HOURS.concat(23).map(h => (
                <option key={h} value={h}>{fmtTimeParts(h, 0).replace(':00', '')}</option>
              ))}
            </select>
            <select
              value={endMin}
              onChange={e => setEndMin(parseInt(e.target.value))}
              className="input flex-1"
            >
              {MINUTES.map(m => (
                <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 h-[42px] flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-[#0f5132]/20 cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Search size={16} /> Check Status
            </>
          )}
        </button>
      </form>

      {/* Loading state placeholders */}
      {loading && (
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 animate-pulse rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-48 bg-gray-200 animate-pulse rounded-2xl" />
            <div className="h-48 bg-gray-200 animate-pulse rounded-2xl" />
            <div className="h-48 bg-gray-200 animate-pulse rounded-2xl" />
          </div>
        </div>
      )}

      {/* Results View */}
      <AnimatePresence>
        {!loading && hasChecked && results && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Quick Summary Banner */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xs uppercase font-black text-gray-400 tracking-wider mb-2.5">
                Quick Summary ({fmtTimeParts(startHour, startMin)} – {fmtTimeParts(endHour, endMin)})
              </p>
              <div className="flex flex-col gap-2">
                {results.available.map(({ court }) => (
                  <div key={court.id} className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span>{court.name} is Available</span>
                  </div>
                ))}
                {results.unavailable.map(({ court, conflict }) => (
                  <div key={court.id} className="flex items-center gap-2 text-red-700 text-sm font-semibold">
                    <XCircle size={16} className="text-red-500" />
                    <span>
                      {court.name} is Unavailable (Booked by {conflict.customerName} {formatTime(conflict.startTime)}–{formatTime(conflict.endTime)})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {courts.map((court, i) => {
                const unavail = results.unavailable.find(r => r.court.id === court.id);
                const isAvailable = !unavail;

                return (
                  <motion.div
                    key={court.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                    className={`card flex flex-col justify-between border-2 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                      isAvailable
                        ? 'border-emerald-200 shadow-emerald-50/50 hover:border-emerald-400'
                        : 'border-red-100 hover:border-red-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-900 text-lg">{court.name}</h3>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isAvailable ? 'Available' : 'Booked'}
                        </span>
                      </div>

                      <div className="space-y-2 py-3 border-t border-b border-gray-100 my-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Hourly Rate</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(court.hourlyRate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Timing Checked</span>
                          <span className="font-semibold text-gray-700">
                            {fmtTimeParts(startHour, startMin)} – {fmtTimeParts(endHour, endMin)}
                          </span>
                        </div>
                        {!isAvailable && unavail && (
                          <div className="bg-red-50 text-red-800 p-2.5 rounded-xl space-y-1 mt-2">
                            <p className="font-bold flex items-center gap-1">
                              <XCircle size={12} /> Conflict Found
                            </p>
                            <p className="opacity-90">
                              Booked by {unavail.conflict.customerName} ({formatTime(unavail.conflict.startTime)}–{formatTime(unavail.conflict.endTime)})
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      {isAvailable ? (
                        <button
                          onClick={() => handleBookNow(court.id)}
                          className="btn-primary w-full flex items-center justify-center gap-1 py-2.5 font-bold cursor-pointer"
                        >
                          Book Now <ArrowRight size={14} />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-400 bg-gray-50 text-xs font-semibold flex items-center justify-center"
                        >
                          Unavailable
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Timeline Visualizer */}
            <div className="card space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-base">
                <CalendarRange size={18} className="text-[#0F5132]" />
                Daily Booking Timeline Visualizer
              </h3>
              
              <div className="overflow-x-auto pb-2">
                <div className="min-w-[700px] space-y-3 pt-2">
                  {/* Hours timeline header */}
                  <div className="flex items-center text-center text-[10px] font-bold text-gray-400">
                    <div className="w-24 text-left font-bold text-gray-500 uppercase tracking-wider">Court</div>
                    <div className="flex-1 gap-0 text-center" style={{ display: 'grid', gridTemplateColumns: 'repeat(17, minmax(0, 1fr))' }}>
                      {Array.from({ length: 17 }, (_, i) => 6 + i).map(h => (
                        <span key={h}>{fmtTimeParts(h, 0).replace(':00', '')}</span>
                      ))}
                    </div>
                  </div>

                  {/* Lanes for each court */}
                  {courts.map(court => {
                    const courtBookings = bookings.filter(
                      b => b.courtId === court.id && b.status !== 'cancelled' && new Date(b.startTime).toDateString() === new Date(selectedDate).toDateString()
                    );

                    return (
                      <div key={court.id} className="flex items-center">
                        <div className="w-24 font-bold text-gray-700 text-sm">{court.name}</div>
                        <div className="flex-1 relative h-7 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          
                          {/* Booked regions */}
                          {courtBookings.map(b => {
                            const bStart = new Date(b.startTime);
                            const bEnd = new Date(b.endTime);

                            const startPercent = Math.max(0, ((bStart.getHours() - 6) * 60 + bStart.getMinutes()) / (17 * 60) * 100);
                            const endPercent = Math.min(100, ((bEnd.getHours() - 6) * 60 + bEnd.getMinutes()) / (17 * 60) * 100);
                            const widthPercent = endPercent - startPercent;

                            return (
                              <div
                                key={b.id}
                                style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                                className="absolute top-0 bottom-0 bg-red-500 border-l border-r border-red-600/25 flex items-center justify-center text-[9px] text-white font-black overflow-hidden truncate"
                                title={`Booked: ${b.customerName} (${formatTime(b.startTime)}–${formatTime(b.endTime)})`}
                              >
                                {widthPercent > 8 && b.customerName}
                              </div>
                            );
                          })}

                          {/* Selected time range glow highlighter overlay */}
                          {(() => {
                            const startPercent = Math.max(0, ((startHour - 6) * 60 + startMin) / (17 * 60) * 100);
                            const endPercent = Math.min(100, ((endHour - 6) * 60 + endMin) / (17 * 60) * 100);
                            const widthPercent = endPercent - startPercent;

                            return (
                              <div
                                style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                                className="absolute top-0 bottom-0 border-2 border-amber-400 bg-amber-400/10 pointer-events-none z-10 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                              />
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend footer */}
              <div className="flex items-center gap-5 text-xs text-gray-500 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-red-500" /> Booked</div>
                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-gray-100 border border-gray-200" /> Available</div>
                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded border-2 border-amber-400 bg-amber-400/10" /> Selected range</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
