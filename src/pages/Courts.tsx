// src/pages/Courts.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, CalendarDays, Plus, Clock,
  User, Phone, Users, IndianRupee, Edit2, X, CheckCircle2,
  ArrowLeftRight, AlarmClock, CreditCard, Trash2, FileText,
  AlertTriangle, Check,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatTime } from '@/utils';
import type { Booking, Court } from '@/types';
import CheckoutModal from '@/components/checkout/CheckoutModal';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const SLOT_H = 80;        // px per 1-hour slot
const START_H = 6;        // 6 AM
const END_H   = 23;       // 11 PM  (last slot: 22:00–23:00)
const NUM_SLOTS = END_H - START_H;  // 17

const SLOT_HOURS = Array.from({ length: NUM_SLOTS }, (_, i) => START_H + i);
// [6,7,8,...,22]

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function fmtHour(h: number): string {
  if (h === 12) return '12:00 PM';
  if (h === 0 || h === 24) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  return `${h - 12}:00 PM`;
}

function fmtHourShort(h: number): string {
  if (h === 12) return '12 PM';
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shiftDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDayLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtDayShort(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

// Get "is now between start and end" for a booking
function isCurrentlyOngoing(b: Booking): boolean {
  const now = Date.now();
  return new Date(b.startTime).getTime() <= now && now < new Date(b.endTime).getTime();
}

// ─────────────────────────────────────────────────────────────
// BOOKING CARD — absolutely positioned inside court column
// ─────────────────────────────────────────────────────────────
interface BookingCardProps {
  booking: Booking;
  onClick: () => void;
}

function BookingCard({ booking, onClick }: BookingCardProps) {
  const startDate = new Date(booking.startTime);
  const endDate   = new Date(booking.endTime);

  const startOffsetH = (startDate.getHours() - START_H) + startDate.getMinutes() / 60;
  const durationH    = (endDate.getHours() - startDate.getHours()) +
                       (endDate.getMinutes() - startDate.getMinutes()) / 60;

  const top    = startOffsetH * SLOT_H + 2;
  const height = Math.max(durationH * SLOT_H - 4, 36);

  const ongoing = isCurrentlyOngoing(booking);
  const isPast  = Date.now() > endDate.getTime();
  const paid    = booking.paymentStatus === 'paid';

  // Color scheme
  const colors = isPast && !paid
    ? { bg: 'bg-gray-400 hover:bg-gray-500', text: 'text-white', badge: 'bg-red-500' }
    : ongoing
    ? { bg: 'bg-amber-400 hover:bg-amber-500', text: 'text-amber-900', badge: 'bg-red-500' }
    : paid
    ? { bg: 'bg-[#0F5132] hover:bg-[#0a3d26]', text: 'text-white', badge: 'bg-green-200 text-green-800' }
    : { bg: 'bg-blue-500 hover:bg-blue-600', text: 'text-white', badge: 'bg-red-500 text-white' };

  const compact = height < 64;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      style={{ position: 'absolute', top, height, left: 4, right: 4, zIndex: 10 }}
      className={`${colors.bg} ${colors.text} rounded-xl text-left overflow-hidden shadow-md cursor-pointer transition-colors`}
    >
      <div className={`flex flex-col h-full ${compact ? 'px-2 py-1' : 'p-2.5'}`}>
        {/* Ongoing pulse indicator */}
        {ongoing && (
          <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full animate-ping opacity-75" />
        )}

        {/* Customer name */}
        <div className={`font-bold leading-tight truncate ${compact ? 'text-xs' : 'text-sm'}`}>
          {booking.customerName.toUpperCase()}
        </div>

        {/* Time */}
        {!compact && (
          <div className="text-xs opacity-90 mt-0.5">
            {fmtHour(startDate.getHours())} – {fmtHour(endDate.getHours())}
          </div>
        )}

        {/* Bottom row: Bill + Status */}
        {height >= 56 && (
          <div className="flex items-center justify-between mt-auto gap-1">
            <span className="text-xs font-semibold opacity-90">
              {formatCurrency(booking.totalCharge)}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors.badge}`}>
              {paid ? 'PAID' : 'UNPAID'}
            </span>
          </div>
        )}

        {/* Players count if tall enough */}
        {height >= 96 && (
          <div className="flex items-center gap-1 text-xs opacity-75 mt-0.5">
            <Users size={10} /> {booking.numberOfPlayers} players
          </div>
        )}
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────
// BOOKING DETAIL MODAL
// ─────────────────────────────────────────────────────────────
interface DetailModalProps {
  booking: Booking;
  courts: Court[];
  onClose: () => void;
  onEdit: (b: Booking) => void;
  onCheckout: (courtId: string) => void;
}

function BookingDetailModal({ booking, courts, onClose, onEdit, onCheckout }: DetailModalProps) {
  const { cancelBooking, extendBooking, moveBooking, markPaid, getTabTotal, getCourtCharge } = useStore();
  const [tab, setTab] = useState<'info' | 'actions'>('info');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showMovePanel, setShowMovePanel] = useState(false);

  const court = courts.find(c => c.id === booking.courtId);
  const startDate = new Date(booking.startTime);
  const endDate   = new Date(booking.endTime);
  const ongoing   = isCurrentlyOngoing(booking);
  const tabTotal  = getTabTotal(booking.courtId);
  const courtCharge = ongoing ? getCourtCharge(booking.courtId) : booking.totalCharge;
  const runningTotal = courtCharge + tabTotal;

  const otherCourts = courts.filter(c => c.id !== booking.courtId && c.isEnabled && !c.isMaintenanceMode);

  const STATUS_COLOR = booking.paymentStatus === 'paid'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-red-100 text-red-700';

  if (showCancelConfirm) {
    return (
      <ModalShell onClose={onClose}>
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Cancel Booking?</h3>
          <p className="text-gray-500 text-sm mb-6">
            This will cancel <span className="font-semibold">{booking.customerName}</span>'s booking
            on <span className="font-semibold">{court?.name}</span>. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowCancelConfirm(false)} className="btn-ghost flex-1">Keep</button>
            <button
              onClick={() => { cancelBooking(booking.id); onClose(); }}
              className="btn-danger flex-1"
            >
              Yes, Cancel
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  if (showMovePanel) {
    return (
      <ModalShell onClose={onClose} title="Move to Court">
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-500">Select a court to move this booking to:</p>
          {otherCourts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No other courts available</p>
          ) : (
            otherCourts.map(c => (
              <button
                key={c.id}
                onClick={() => { moveBooking(booking.id, c.id); onClose(); }}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-xl transition-colors"
              >
                <span className="font-semibold text-gray-900">{c.name}</span>
                <span className="text-sm text-gray-500">{formatCurrency(c.hourlyRate)}/hr</span>
              </button>
            ))
          )}
          <button onClick={() => setShowMovePanel(false)} className="btn-ghost w-full mt-2">Back</button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div className={`p-4 ${ongoing ? 'bg-amber-400' : 'bg-blue-500'}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-white/80 text-xs font-medium">{court?.name ?? '—'}</div>
            <h2 className="text-xl font-black text-white">{booking.customerName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR}`}>
                {booking.paymentStatus.toUpperCase()}
              </span>
              {ongoing && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/30 text-white animate-pulse">
                  ● LIVE
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Info grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <InfoRow icon={<Clock size={14} />} label="Start" value={fmtHour(startDate.getHours())} />
        <InfoRow icon={<Clock size={14} />} label="End" value={fmtHour(endDate.getHours())} />
        <InfoRow icon={<Users size={14} />} label="Players" value={`${booking.numberOfPlayers}`} />
        <InfoRow icon={<Phone size={14} />} label="Phone" value={booking.phone} />
        <InfoRow icon={<IndianRupee size={14} />} label="Court Rate" value={`${formatCurrency(court?.hourlyRate ?? 0)}/hr`} />
        <InfoRow icon={<IndianRupee size={14} />} label="Total Bill" value={formatCurrency(runningTotal)} highlight />
        {booking.notes && (
          <div className="col-span-2">
            <InfoRow icon={<FileText size={14} />} label="Notes" value={booking.notes} />
          </div>
        )}
      </div>

      {/* Bill breakdown */}
      <div className="mx-4 mb-4 bg-gray-50 rounded-xl p-3 space-y-1.5">
        <div className="flex justify-between text-sm"><span className="text-gray-500">Court Charge</span><span className="font-medium">{formatCurrency(courtCharge)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">F&amp;B Tab</span><span className="font-medium">{formatCurrency(tabTotal)}</span></div>
        <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
          <span>Total</span>
          <span className="text-[#0F5132]">{formatCurrency(runningTotal)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onEdit(booking)}
            className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Edit2 size={14} /> Edit
          </button>
          <button
            onClick={() => { extendBooking(booking.id, 1); onClose(); }}
            className="flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <AlarmClock size={14} /> +1 Hour
          </button>
          <button
            onClick={() => setShowMovePanel(true)}
            className="flex items-center justify-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <ArrowLeftRight size={14} /> Move Court
          </button>
          {booking.paymentStatus !== 'paid' && (
            <button
              onClick={() => { markPaid(booking.id); onClose(); }}
              className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Check size={14} /> Mark Paid
            </button>
          )}
        </div>

        <button
          onClick={() => onCheckout(booking.courtId)}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm"
        >
          <CreditCard size={16} /> Checkout — {formatCurrency(runningTotal)}
        </button>

        <button
          onClick={() => setShowCancelConfirm(true)}
          className="w-full flex items-center justify-center gap-1.5 text-red-500 hover:bg-red-50 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Trash2 size={14} /> Cancel Booking
        </button>
      </div>
    </ModalShell>
  );
}

function InfoRow({ icon, label, value, highlight = false }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <div className="flex items-center gap-1 text-gray-400 text-xs mb-0.5">{icon}{label}</div>
      <div className={`font-semibold text-sm ${highlight ? 'text-[#0F5132]' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

function ModalShell({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md z-10 overflow-hidden max-h-[92vh] overflow-y-auto"
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        )}
        {children}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BOOKING CREATE/EDIT MODAL (inline version with new fields)
// ─────────────────────────────────────────────────────────────
interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  courtId: string;
  startHour: number;
  selectedDate: Date;
  editBooking: Booking | null;
}

function CreateBookingModal({ open, onClose, courtId, startHour, selectedDate, editBooking }: CreateModalProps) {
  const { courts, createBooking, updateBooking } = useStore();
  const enabledCourts = courts.filter(c => c.isEnabled && !c.isMaintenanceMode);

  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    numberOfPlayers: 2,
    courtId: courtId,
    startHour: startHour,
    duration: 1,
    notes: '',
  });

  useEffect(() => {
    if (!open) return;
    if (editBooking) {
      const sh = new Date(editBooking.startTime).getHours();
      const durationH = editBooking.duration / 60;
      setForm({
        customerName: editBooking.customerName,
        phone: editBooking.phone,
        numberOfPlayers: editBooking.numberOfPlayers,
        courtId: editBooking.courtId,
        startHour: sh,
        duration: durationH,
        notes: editBooking.notes,
      });
    } else {
      setForm(f => ({ ...f, courtId, startHour, duration: 1 }));
    }
  }, [open, editBooking, courtId, startHour]);

  const selectedCourt = courts.find(c => c.id === form.courtId);
  const estimatedCharge = (selectedCourt?.hourlyRate ?? 500) * form.duration;

  const endHour = form.startHour + form.duration;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const base = new Date(selectedDate);
    base.setHours(form.startHour, 0, 0, 0);
    const endDate = new Date(base.getTime() + form.duration * 3600000);

    if (editBooking) {
      updateBooking(editBooking.id, {
        customerName: form.customerName,
        phone: form.phone,
        numberOfPlayers: form.numberOfPlayers,
        notes: form.notes,
        duration: form.duration * 60,
        endTime: endDate.toISOString(),
        totalCharge: estimatedCharge,
      });
    } else {
      createBooking({
        courtId: form.courtId,
        customerName: form.customerName,
        phone: form.phone,
        numberOfPlayers: form.numberOfPlayers,
        startTime: base.toISOString(),
        endTime: endDate.toISOString(),
        duration: form.duration * 60,
        notes: form.notes,
      });
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50" onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md z-10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0F5132]">
          <div>
            <h2 className="text-lg font-bold text-white">{editBooking ? 'Edit Booking' : 'New Booking'}</h2>
            <p className="text-green-300 text-xs">{fmtDayShort(selectedDate)}</p>
          </div>
          <button onClick={onClose} className="text-green-300 hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Customer Name */}
          <div>
            <label className="label flex items-center gap-1"><User size={12} className="text-gray-400" /> Customer Name</label>
            <input
              value={form.customerName}
              onChange={e => setForm({ ...form, customerName: e.target.value })}
              className="input" placeholder="e.g. Arjun Mehta" required
            />
          </div>

          {/* Phone + Players */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1"><Phone size={12} className="text-gray-400" /> Phone</label>
              <input
                type="tel" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="input" placeholder="98765..." required
              />
            </div>
            <div>
              <label className="label flex items-center gap-1"><Users size={12} className="text-gray-400" /> Players</label>
              <select value={form.numberOfPlayers} onChange={e => setForm({ ...form, numberOfPlayers: parseInt(e.target.value) })} className="input">
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} player{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>

          {/* Court */}
          <div>
            <label className="label">Court</label>
            <select
              value={form.courtId}
              onChange={e => setForm({ ...form, courtId: e.target.value })}
              className="input" disabled={!!editBooking}
            >
              {enabledCourts.map(c => (
                <option key={c.id} value={c.id}>{c.name} — ₹{c.hourlyRate}/hr</option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label className="label flex items-center gap-1"><Clock size={12} className="text-gray-400" /> Start Time</label>
            <div className="flex flex-wrap gap-1.5">
              {SLOT_HOURS.map(h => (
                <button
                  key={h} type="button"
                  onClick={() => setForm({ ...form, startHour: h })}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    form.startHour === h
                      ? 'bg-[#0F5132] text-white border-[#0F5132]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#0F5132]'
                  }`}
                >
                  {fmtHourShort(h)}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="label">Duration</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(d => (
                <button
                  key={d} type="button"
                  onClick={() => setForm({ ...form, duration: d })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                    form.duration === d
                      ? 'bg-[#0F5132] text-white border-[#0F5132]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-[#0F5132]'
                  }`}
                >
                  {d}h
                </button>
              ))}
            </div>
          </div>

          {/* Time Preview */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-green-600 font-medium">Booking Window</div>
              <div className="text-sm font-bold text-green-900">
                {fmtHour(form.startHour)} → {fmtHour(endHour)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-green-600 font-medium">Estimated Charge</div>
              <div className="text-xl font-black text-[#0F5132]">{formatCurrency(estimatedCharge)}</div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label flex items-center gap-1"><FileText size={12} className="text-gray-400" /> Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="input resize-none" rows={2}
              placeholder="e.g. VIP guest, equipment needed..."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1 py-3 text-base">
              {editBooking ? 'Update Booking' : 'Book Court'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COURT COLUMN — the per-court vertical strip
// ─────────────────────────────────────────────────────────────
interface CourtColProps {
  court: Court;
  dayBookings: Booking[];
  currentTimeTop: number | null;
  onBook: (courtId: string, hour: number) => void;
  onBookingClick: (b: Booking) => void;
}

function CourtColumn({ court, dayBookings, currentTimeTop, onBook, onBookingClick }: CourtColProps) {
  const courtBookings = dayBookings.filter(b => b.courtId === court.id);

  // Build set of hours that are occupied
  const occupiedHours = new Set<number>();
  courtBookings.forEach(b => {
    const sh = new Date(b.startTime).getHours();
    const eh = new Date(b.endTime).getHours();
    for (let h = sh; h < eh; h++) occupiedHours.add(h);
  });

  return (
    <div className="flex-1 min-w-[140px] border-r border-gray-100 last:border-r-0">
      {/* Court header */}
      <div className="h-10 bg-[#0F5132] flex items-center justify-center gap-1.5 sticky top-0 z-10 border-r border-[#0a3d26] last:border-r-0">
        <div className={`w-2 h-2 rounded-full ${
          court.status === 'occupied' ? 'bg-amber-400 animate-pulse' :
          court.isMaintenanceMode ? 'bg-red-400' :
          !court.isEnabled ? 'bg-gray-400' :
          'bg-emerald-400'
        }`} />
        <span className="text-white font-bold text-sm">{court.name}</span>
      </div>

      {/* Grid body */}
      <div style={{ position: 'relative', height: NUM_SLOTS * SLOT_H }}>

        {/* Hour slot grid lines */}
        {SLOT_HOURS.map((hour, i) => (
          <div
            key={hour}
            style={{ position: 'absolute', top: i * SLOT_H, left: 0, right: 0, height: SLOT_H }}
            className="border-b border-gray-100"
          />
        ))}

        {/* Current time red line (only on today's column) */}
        {currentTimeTop !== null && (
          <div
            style={{ position: 'absolute', top: currentTimeTop, left: 0, right: 0, zIndex: 6 }}
            className="pointer-events-none"
          >
            <div className="h-0.5 bg-red-500">
              <div className="absolute -left-0.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
            </div>
          </div>
        )}

        {/* Maintenance overlay */}
        {court.isMaintenanceMode && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 8 }} className="bg-red-50/80 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-400 text-2xl mb-1">🔧</div>
              <div className="text-red-400 text-xs font-semibold">Under Maintenance</div>
            </div>
          </div>
        )}

        {/* Disabled overlay */}
        {!court.isEnabled && !court.isMaintenanceMode && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 8 }} className="bg-gray-100/80 flex items-center justify-center">
            <div className="text-gray-400 text-xs font-semibold">Court Disabled</div>
          </div>
        )}

        {/* Book buttons for empty slots */}
        {court.isEnabled && !court.isMaintenanceMode && SLOT_HOURS.map((hour, i) => {
          if (occupiedHours.has(hour)) return null;
          return (
            <button
              key={hour}
              onClick={() => onBook(court.id, hour)}
              style={{ position: 'absolute', top: i * SLOT_H + 3, left: 3, right: 3, height: SLOT_H - 6, zIndex: 4 }}
              className="rounded-xl border-2 border-dashed border-emerald-200 bg-transparent hover:bg-emerald-50 hover:border-emerald-400 transition-all duration-150 group flex items-center justify-center"
            >
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={13} /> Book
              </span>
            </button>
          );
        })}

        {/* Booking cards */}
        <AnimatePresence>
          {courtBookings.map(b => (
            <BookingCard key={b.id} booking={b} onClick={() => onBookingClick(b)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COURTS PAGE
// ─────────────────────────────────────────────────────────────
export default function Courts() {
  const { courts, bookings } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mobileCourt, setMobileCourt] = useState(0);

  const [createModal, setCreateModal] = useState({
    open: false, courtId: '', startHour: 8, editBooking: null as Booking | null,
  });
  const [detailModal, setDetailModal] = useState<{ open: boolean; booking: Booking | null }>({
    open: false, booking: null,
  });
  const [checkoutCourtId, setCheckoutCourtId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  // Refresh every 60s for current-time indicator
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll to current time when viewing today
  useEffect(() => {
    const isToday = dateKey(new Date()) === dateKey(selectedDate);
    if (!isToday || !scrollRef.current) return;
    const now = new Date();
    const offset = Math.max(0, (now.getHours() - START_H - 1.5) * SLOT_H);
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = offset;
    });
  }, [selectedDate]);

  const dayKey = dateKey(selectedDate);
  const isToday = dateKey(new Date()) === dayKey;

  // Filter active bookings for selected date
  const dayBookings = bookings.filter(b =>
    b.status !== 'cancelled' && dateKey(new Date(b.startTime)) === dayKey
  );

  // Current time indicator position (px from top of grid)
  const now = new Date();
  const nowOffsetMinutes = (now.getHours() - START_H) * 60 + now.getMinutes();
  const currentTimeTop = isToday && nowOffsetMinutes >= 0 && nowOffsetMinutes <= NUM_SLOTS * 60
    ? (nowOffsetMinutes / 60) * SLOT_H
    : null;

  const openBook = useCallback((courtId: string, startHour: number) => {
    setCreateModal({ open: true, courtId, startHour, editBooking: null });
  }, []);

  const openEdit = useCallback((b: Booking) => {
    setDetailModal({ open: false, booking: null });
    setCreateModal({ open: true, courtId: b.courtId, startHour: new Date(b.startTime).getHours(), editBooking: b });
  }, []);

  const openCheckout = useCallback((courtId: string) => {
    setDetailModal({ open: false, booking: null });
    setCheckoutCourtId(courtId);
  }, []);

  // Stats for header
  const occupiedCount = courts.filter(c => c.status === 'occupied').length;
  const todayBookingCount = dayBookings.length;

  return (
    <div className="flex flex-col -m-4 h-[calc(100vh-56px)] overflow-hidden">

      {/* ── TOP BAR ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0 shadow-sm z-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 max-w-7xl mx-auto">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(d => shiftDays(d, -1))}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex flex-col text-center min-w-0">
              <span className="font-bold text-gray-900 text-sm sm:text-base leading-tight truncate">
                {isToday ? '📅 Today' : fmtDayShort(selectedDate)} —{' '}
                <span className="hidden sm:inline">{fmtDayLabel(selectedDate)}</span>
                <span className="sm:hidden">{selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </span>
              <span className="text-xs text-gray-400">{todayBookingCount} booking{todayBookingCount !== 1 ? 's' : ''} · {occupiedCount} court{occupiedCount !== 1 ? 's' : ''} occupied</span>
            </div>

            <button
              onClick={() => setSelectedDate(d => shiftDays(d, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            >
              <ChevronRight size={18} />
            </button>

            {!isToday && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-[#0F5132] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] transition-colors"
              >
                <CalendarDays size={13} /> Today
              </button>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {!isToday && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="sm:hidden flex items-center gap-1 px-3 py-1.5 bg-[#0F5132] text-white text-xs font-semibold rounded-lg"
              >
                <CalendarDays size={12} /> Today
              </button>
            )}
            <button
              onClick={() => openBook(courts[0]?.id ?? '', 8)}
              className="btn-primary flex items-center gap-2 py-2 text-sm"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">New Booking</span>
              <span className="sm:hidden">Book</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE COURT TABS ── */}
      <div className="flex sm:hidden bg-white border-b border-gray-100 flex-shrink-0 z-10">
        {courts.map((court, i) => {
          const courtBookings = dayBookings.filter(b => b.courtId === court.id);
          return (
            <button
              key={court.id}
              onClick={() => setMobileCourt(i)}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors relative ${
                mobileCourt === i
                  ? 'text-[#0F5132] border-b-2 border-[#0F5132]'
                  : 'text-gray-400'
              }`}
            >
              {court.name}
              {courtBookings.length > 0 && (
                <span className="ml-1 bg-blue-500 text-white text-[9px] font-bold px-1 rounded-full">
                  {courtBookings.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TIMETABLE GRID ── */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="flex" style={{ minWidth: '320px' }}>

          {/* ── TIME COLUMN (sticky left) ── */}
          <div className="w-[72px] sm:w-20 flex-shrink-0 bg-white border-r border-gray-100 sticky left-0 z-10">
            {/* Header spacer */}
            <div className="h-10 border-b border-gray-100 bg-[#0a3d26] flex items-center justify-center">
              <Clock size={13} className="text-green-400" />
            </div>

            {/* Time labels */}
            <div style={{ position: 'relative', height: NUM_SLOTS * SLOT_H }}>
              {[...SLOT_HOURS, END_H].map((hour, i) => (
                <div
                  key={hour}
                  style={{
                    position: 'absolute',
                    top: i * SLOT_H - 8,
                    left: 0, right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 8,
                  }}
                >
                  <span className="text-[11px] text-gray-400 font-medium leading-none">
                    {fmtHourShort(hour)}
                  </span>
                </div>
              ))}
              {/* Horizontal grid lines to match court columns */}
              {SLOT_HOURS.map((_, i) => (
                <div
                  key={i}
                  style={{ position: 'absolute', top: i * SLOT_H, left: 0, right: 0, height: SLOT_H }}
                  className="border-b border-gray-100"
                />
              ))}
            </div>
          </div>

          {/* ── COURT COLUMNS ── */}
          {courts.map((court, idx) => (
            <div
              key={court.id}
              className={`flex-1 min-w-[140px] sm:min-w-0 ${
                idx !== mobileCourt ? 'hidden sm:block' : 'block'
              }`}
            >
              <CourtColumn
                court={court}
                dayBookings={dayBookings}
                currentTimeTop={currentTimeTop}
                onBook={openBook}
                onBookingClick={b => setDetailModal({ open: true, booking: b })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── LEGEND BAR (Desktop footer) ── */}
      <div className="hidden sm:flex items-center gap-5 px-4 py-2 bg-white border-t border-gray-100 flex-shrink-0 text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded border-2 border-dashed border-emerald-400 bg-emerald-50" />Available</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500" />Booked</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-400" />Current Game</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#0F5132]" />Paid</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-400" />Past</div>
        <div className="flex items-center gap-1.5"><div className="w-0.5 h-3 bg-red-500" />Current Time</div>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {createModal.open && (
          <CreateBookingModal
            open={createModal.open}
            onClose={() => setCreateModal(s => ({ ...s, open: false }))}
            courtId={createModal.courtId}
            startHour={createModal.startHour}
            selectedDate={selectedDate}
            editBooking={createModal.editBooking}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailModal.open && detailModal.booking && (
          <BookingDetailModal
            booking={detailModal.booking}
            courts={courts}
            onClose={() => setDetailModal({ open: false, booking: null })}
            onEdit={openEdit}
            onCheckout={openCheckout}
          />
        )}
      </AnimatePresence>

      {checkoutCourtId && (
        <CheckoutModal
          courtId={checkoutCourtId}
          onClose={() => setCheckoutCourtId(null)}
        />
      )}
    </div>
  );
}
