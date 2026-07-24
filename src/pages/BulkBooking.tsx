// src/pages/BulkBooking.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Calendar, Clock, User, Phone, IndianRupee, AlertTriangle,
  CheckCircle2, Info, Plus, Sparkles, Filter, FileText, Check, X, ShieldAlert
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatTime } from '@/utils';
import type { Booking } from '@/types';

const DAYS_MAP = [
  { id: 0, label: 'Sun', short: 'Sun', name: 'Sunday', isWeekend: true },
  { id: 1, label: 'Mon', short: 'Mon', name: 'Monday', isWeekend: false },
  { id: 2, label: 'Tue', short: 'Tue', name: 'Tuesday', isWeekend: false },
  { id: 3, label: 'Wed', short: 'Wed', name: 'Wednesday', isWeekend: false },
  { id: 4, label: 'Thu', short: 'Thu', name: 'Thursday', isWeekend: false },
  { id: 5, label: 'Fri', short: 'Fri', name: 'Friday', isWeekend: false },
  { id: 6, label: 'Sat', short: 'Sat', name: 'Saturday', isWeekend: true },
];

interface GeneratedSession {
  dateStr: string; // YYYY-MM-DD
  dateObj: Date;
  dayOfWeek: number; // 0-6
  dayName: string;
  courtId: string;
  courtName: string;
  startTimeISO: string;
  endTimeISO: string;
  durationMins: number;
  customPrice: number;
  hasConflict: boolean;
  conflictDetails?: {
    customerName: string;
    phone: string;
  };
}

export default function BulkBooking() {
  const { courts, bookings, createBulkBookings } = useStore();

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [numberOfPlayers, setNumberOfPlayers] = useState<number>(2);

  // Selected Court IDs (default all active courts selected)
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>(
    courts.map((c) => c.id)
  );

  // Date Range Defaults (Default: Tomorrow to 14 days from now)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultEnd = new Date();
  defaultEnd.setDate(defaultEnd.getDate() + 14);

  const [startDateStr, setStartDateStr] = useState<string>(
    tomorrow.toISOString().slice(0, 10)
  );
  const [endDateStr, setEndDateStr] = useState<string>(
    defaultEnd.toISOString().slice(0, 10)
  );

  // Time Range (Default: 09:00 to 10:00)
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('10:00');

  // Days Filter Toggles (0=Sun to 6=Sat) - Default all days enabled
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  // Custom Price (Default ₹600 per session)
  const [customPrice, setCustomPrice] = useState<number>(600);

  // Skip Conflicts Option
  const [skipConflicts, setSkipConflicts] = useState(true);

  // Execution UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick preset handlers for days
  const handlePresetAllDays = () => setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
  const handlePresetWeekdays = () => setSelectedDays([1, 2, 3, 4, 5]);
  const handlePresetWeekends = () => setSelectedDays([0, 6]);

  const toggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId].sort());
    }
  };

  const toggleCourt = (courtId: string) => {
    if (selectedCourtIds.includes(courtId)) {
      if (selectedCourtIds.length === 1) return; // keep at least one
      setSelectedCourtIds(selectedCourtIds.filter((id) => id !== courtId));
    } else {
      setSelectedCourtIds([...selectedCourtIds, courtId]);
    }
  };

  const selectAllCourts = () => setSelectedCourtIds(courts.map((c) => c.id));

  // Generate All Candidate Sessions & Detect Conflicts
  const generatedSessions = useMemo(() => {
    if (!startDateStr || !endDateStr || !startTimeStr || !endTimeStr) return [];
    if (selectedCourtIds.length === 0 || selectedDays.length === 0) return [];

    const sessions: GeneratedSession[] = [];
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (start > end) return [];

    // Calculate duration
    const [sH, sM] = startTimeStr.split(':').map(Number);
    const [eH, eM] = endTimeStr.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;
    const durationMins = endMins - startMins;

    if (durationMins <= 0) return [];

    // Loop through date range
    const curr = new Date(start);
    while (curr <= end) {
      const dayOfWeek = curr.getDay(); // 0-6

      if (selectedDays.includes(dayOfWeek)) {
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, '0');
        const dd = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const startTimeISO = `${dateStr}T${startTimeStr}:00`;
        const endTimeISO = `${dateStr}T${endTimeStr}:00`;
        const sessionStart = new Date(startTimeISO).getTime();
        const sessionEnd = new Date(endTimeISO).getTime();

        for (const courtId of selectedCourtIds) {
          const courtObj = courts.find((c) => c.id === courtId);

          // Check for conflicts against existing active bookings
          const conflictBooking = bookings.find((b) => {
            if (b.courtId !== courtId || b.status === 'cancelled') return false;
            const bStart = new Date(b.startTime).getTime();
            const bEnd = new Date(b.endTime).getTime();
            return sessionStart < bEnd && sessionEnd > bStart;
          });

          sessions.push({
            dateStr,
            dateObj: new Date(curr),
            dayOfWeek,
            dayName: DAYS_MAP[dayOfWeek].name,
            courtId,
            courtName: courtObj?.name || 'Court',
            startTimeISO,
            endTimeISO,
            durationMins,
            customPrice,
            hasConflict: !!conflictBooking,
            conflictDetails: conflictBooking
              ? {
                  customerName: conflictBooking.customerName,
                  phone: conflictBooking.phone,
                }
              : undefined,
          });
        }
      }

      curr.setDate(curr.getDate() + 1);
    }

    return sessions;
  }, [
    startDateStr,
    endDateStr,
    startTimeStr,
    endTimeStr,
    selectedDays,
    selectedCourtIds,
    customPrice,
    courts,
    bookings,
  ]);

  const availableSessions = generatedSessions.filter((s) => !s.hasConflict);
  const conflictingSessions = generatedSessions.filter((s) => s.hasConflict);

  const sessionsToCreate = skipConflicts ? availableSessions : generatedSessions;
  const grandTotalRevenue = sessionsToCreate.reduce((s, item) => s + item.customPrice, 0);

  // Submit Handler
  const handleCreateBulk = async () => {
    if (!customerName.trim()) {
      alert('Please enter a customer name.');
      return;
    }
    if (!phone.trim()) {
      alert('Please enter a phone number.');
      return;
    }
    if (sessionsToCreate.length === 0) {
      alert('No valid sessions available to create.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = sessionsToCreate.map((s) => ({
        courtId: s.courtId,
        customerName: customerName.trim(),
        phone: phone.trim(),
        startTime: s.startTimeISO,
        endTime: s.endTimeISO,
        duration: s.durationMins,
        numberOfPlayers,
        notes: notes ? `[BULK BOOKING] ${notes}` : '[BULK BOOKING]',
        totalCharge: s.customPrice,
      }));

      const res = await createBulkBookings(payload);
      setSuccessMessage(
        `Successfully created ${res.count} bulk booking sessions for ${customerName.trim()}!`
      );
    } catch (err: any) {
      console.error('Bulk booking error:', err);
      alert('Failed to create bulk bookings: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="text-[#0F5132]" size={24} />
            Bulk Booking Manager
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Schedule recurring multi-day court bookings with custom prices & day-of-week filters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-emerald-100 text-emerald-800 font-semibold px-3 py-1 text-xs">
            Multi-Slot Engine Active
          </span>
        </div>
      </div>

      {/* Success Alert Banner */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={22} />
              <div>
                <p className="font-bold text-emerald-900 text-sm">{successMessage}</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Bookings are now active and synced to the court timeline & database.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Customer Details Card */}
          <div className="card space-y-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
              <User size={16} className="text-[#0F5132]" />
              Customer & Group Info
            </h3>

            <div className="space-y-3">
              <div>
                <label className="label text-xs font-semibold">Customer / Club Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Apex Badminton Academy"
                  className="input text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs font-semibold">Phone Number *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="label text-xs font-semibold">Players Count</label>
                  <input
                    type="number"
                    value={numberOfPlayers}
                    onChange={(e) => setNumberOfPlayers(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input text-xs"
                    min={1}
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs font-semibold">Notes / Purpose</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Summer Coaching Camp 2026"
                  className="input text-xs"
                />
              </div>
            </div>
          </div>

          {/* Target Court Selection Card */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Calendar size={16} className="text-[#0F5132]" />
                Select Target Court(s)
              </h3>
              <button
                type="button"
                onClick={selectAllCourts}
                className="text-[11px] font-bold text-[#0F5132] hover:underline"
              >
                Select All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {courts.map((court) => {
                const isSelected = selectedCourtIds.includes(court.id);
                return (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => toggleCourt(court.id)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/50 border-[#0F5132] text-[#0F5132] ring-1 ring-[#0F5132]'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{court.name}</span>
                      {isSelected && <Check size={14} className="text-[#0F5132]" />}
                    </div>
                    <span className="text-[10px] opacity-75 mt-1">₹{court.hourlyRate}/hr std</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time Settings Card */}
          <div className="card space-y-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
              <Clock size={16} className="text-[#0F5132]" />
              Schedule & Date Range
            </h3>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs font-semibold">Start Date</label>
                <input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="label text-xs font-semibold">End Date</label>
                <input
                  type="date"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="input text-xs"
                />
              </div>
            </div>

            {/* Time Slot */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs font-semibold">Start Time</label>
                <input
                  type="time"
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="label text-xs font-semibold">End Time</label>
                <input
                  type="time"
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  className="input text-xs"
                />
              </div>
            </div>
          </div>

          {/* Days Filter & Custom Price Card */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Filter size={16} className="text-[#0F5132]" />
                Day Filters & Custom Pricing
              </h3>
            </div>

            {/* Days Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label text-xs font-semibold">Active Days of Week</label>
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={handlePresetAllDays}
                    className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    All Days
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetWeekdays}
                    className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Mon-Fri
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetWeekends}
                    className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 hover:bg-amber-200"
                  >
                    Sat & Sun
                  </button>
                </div>
              </div>

              {/* Day Checkboxes / Badges */}
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS_MAP.map((day) => {
                  const isSelected = selectedDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={`py-2.5 px-1 rounded-xl text-xs font-bold text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? day.isWeekend
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-[#0F5132] text-white shadow-sm'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <span>{day.short}</span>
                      <span className="text-[9px] opacity-80 mt-0.5">
                        {day.isWeekend ? 'W/E' : 'W/K'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Included Weekend Days:{' '}
                <span className="font-semibold text-amber-700">
                  {selectedDays.includes(6) ? 'Saturday ' : ''}
                  {selectedDays.includes(0) ? 'Sunday' : ''}
                  {!selectedDays.includes(6) && !selectedDays.includes(0) ? 'None' : ''}
                </span>
              </p>
            </div>

            {/* Custom Pricing Input */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="label text-xs font-bold text-gray-800 flex items-center gap-1">
                  <IndianRupee size={14} className="text-[#0F5132]" />
                  Custom Price per Session (₹)
                </label>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                  CUSTOM OVERRIDE
                </span>
              </div>
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="input font-bold text-base text-[#0F5132]"
                min={0}
                placeholder="Enter custom price per booking..."
              />
              <p className="text-[10px] text-gray-400">
                Staff custom pricing override. Each generated session will be billed at exactly ₹{customPrice}.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Schedule Preview & Conflicts (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card text-center p-3.5 border-2 border-emerald-100 bg-emerald-50/20">
              <span className="text-2xl font-black text-emerald-900">{generatedSessions.length}</span>
              <span className="text-xs text-emerald-700 font-semibold block mt-0.5">Total Sessions</span>
            </div>
            <div className="card text-center p-3.5 border-2 border-blue-100 bg-blue-50/20">
              <span className="text-2xl font-black text-blue-900">{availableSessions.length}</span>
              <span className="text-xs text-blue-700 font-semibold block mt-0.5">Available Slots</span>
            </div>
            <div className="card text-center p-3.5 border-2 border-amber-100 bg-amber-50/20">
              <span className="text-2xl font-black text-amber-900">{conflictingSessions.length}</span>
              <span className="text-xs text-amber-700 font-semibold block mt-0.5">Conflicts</span>
            </div>
            <div className="card text-center p-3.5 border-2 border-green-200 bg-green-100/30">
              <span className="text-xl font-black text-[#0F5132]">{formatCurrency(grandTotalRevenue)}</span>
              <span className="text-xs text-green-900 font-semibold block mt-0.5">Est. Total</span>
            </div>
          </div>

          {/* Preview Header & Submit Bar */}
          <div className="card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Sparkles size={16} className="text-[#0F5132]" />
                  Generated Bulk Schedule Preview
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Review calculated date slots before committing to database
                </p>
              </div>

              {conflictingSessions.length > 0 && (
                <label className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipConflicts}
                    onChange={(e) => setSkipConflicts(e.target.checked)}
                    className="rounded text-[#0F5132]"
                  />
                  <span>Skip Conflicting Slots ({conflictingSessions.length})</span>
                </label>
              )}
            </div>

            {/* Submissions Action Button */}
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-700">
                  Ready to create <span className="text-[#0F5132] text-sm">{sessionsToCreate.length}</span> booking session(s)
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Grand Total Revenue: <span className="font-bold text-gray-900">{formatCurrency(grandTotalRevenue)}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreateBulk}
                disabled={isSubmitting || sessionsToCreate.length === 0 || !customerName.trim()}
                className="btn-primary py-3 px-6 text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Plus size={16} /> Confirm & Create ({sessionsToCreate.length})
                  </>
                )}
              </button>
            </div>

            {/* Generated Sessions List Table */}
            <div className="overflow-x-auto border border-gray-100 rounded-xl max-h-96 overflow-y-auto">
              <table className="w-full text-xs min-w-[550px]">
                <thead className="sticky top-0 bg-gray-100 text-gray-500 uppercase font-bold text-[10px] tracking-wider z-10">
                  <tr>
                    <th className="px-3.5 py-2.5 text-left">Date & Day</th>
                    <th className="px-3.5 py-2.5 text-left">Court</th>
                    <th className="px-3.5 py-2.5 text-left">Time & Duration</th>
                    <th className="px-3.5 py-2.5 text-right">Custom Price</th>
                    <th className="px-3.5 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {generatedSessions.map((session, idx) => {
                    const isConflicting = session.hasConflict;
                    const isSkipped = isConflicting && skipConflicts;

                    return (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          isSkipped
                            ? 'bg-amber-50/40 opacity-60'
                            : isConflicting
                            ? 'bg-red-50/50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold text-gray-900">{session.dateStr}</div>
                          <div className="text-[10px] text-gray-400">{session.dayName}</div>
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-gray-700">
                          {session.courtName}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="font-medium text-gray-800">
                            {startTimeStr} – {endTimeStr}
                          </div>
                          <div className="text-[10px] text-gray-400">{session.durationMins} mins</div>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-[#0F5132]">
                          {formatCurrency(session.customPrice)}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          {isConflicting ? (
                            <span
                              className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[10px] font-bold"
                              title={`Conflict with ${session.conflictDetails?.customerName}`}
                            >
                              <ShieldAlert size={12} /> Conflict ({session.conflictDetails?.customerName})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <CheckCircle2 size={12} /> Available
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {generatedSessions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-400 text-xs">
                        No sessions generated. Please select dates, time, courts, and days of week.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
