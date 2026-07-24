// src/pages/Courts.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, CalendarDays, Plus, Clock,
  User, Phone, Users, IndianRupee, Edit2, X, CheckCircle2,
  ArrowLeftRight, AlarmClock, CreditCard, Trash2, FileText,
  AlertTriangle, Check, CalendarRange
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatTime } from '@/utils';
import { useLocation } from 'react-router-dom';
import type { Booking, Court } from '@/types';
import CheckoutModal from '@/components/checkout/CheckoutModal';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const SLOT_H = 80;        // px per 1-hour slot
const START_H = 5;        // 5 AM
const END_H   = 24;       // 12 AM (midnight)
const NUM_SLOTS = END_H - START_H;  // 19

const SLOT_HOURS = Array.from({ length: NUM_SLOTS }, (_, i) => START_H + i);

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
  if (h === 0 || h === 24) return '12 AM';
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

// Get "is now between start and end" for an active booking
function isCurrentlyOngoing(b: Booking): boolean {
  const now = Date.now();
  return b.status === 'active' && new Date(b.startTime).getTime() <= now && now < new Date(b.endTime).getTime();
}

// Find next available start time for a court based on conflicts
function findNextAvailableTime(courtId: string, desiredStart: Date, durationMinutes: number, bookings: Booking[]): Date {
  let candidateStart = new Date(desiredStart);
  let conflict = true;
  let iterations = 0;

  while (conflict && iterations < 50) {
    conflict = false;
    const candidateEnd = new Date(candidateStart.getTime() + durationMinutes * 60000);

    const overlapping = bookings.find(b => {
      if (b.courtId !== courtId || b.status === 'cancelled') return false;
      const sameDay = new Date(b.startTime).toDateString() === desiredStart.toDateString();
      if (!sameDay) return false;

      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      return candidateStart.getTime() < bEnd && candidateEnd.getTime() > bStart;
    });

    if (overlapping) {
      conflict = true;
      candidateStart = new Date(overlapping.endTime);
      iterations++;
    }
  }
  return candidateStart;
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
  const durationH    = (endDate.getTime() - startDate.getTime()) / 3600000;

  const top    = startOffsetH * SLOT_H + 2;
  const height = Math.max(durationH * SLOT_H - 4, 36);

  const ongoing = isCurrentlyOngoing(booking);
  const isPast  = Date.now() > endDate.getTime();
  const paid    = booking.paymentStatus === 'paid';

  // Status-based colors
  const colors = isPast && !paid
    ? { bg: 'bg-gray-400 hover:bg-gray-500', text: 'text-white', badge: 'bg-red-500 text-white' }
    : ongoing
    ? { bg: 'bg-amber-400 hover:bg-amber-500', text: 'text-amber-900', badge: 'bg-red-500 text-white animate-pulse' }
    : paid
    ? { bg: 'bg-[#0F5132] hover:bg-[#0a3d26]', text: 'text-white', badge: 'bg-emerald-600 text-white' }
    : { bg: 'bg-blue-500 hover:bg-blue-600', text: 'text-white', badge: 'bg-blue-700 text-white' };

  const compact = height < 64;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      style={{ position: 'absolute', top, height, left: 4, right: 4, zIndex: 10 }}
      className={`${colors.bg} ${colors.text} rounded-xl text-left overflow-hidden shadow-md cursor-pointer transition-colors border border-black/5`}
    >
      <div className={`flex flex-col h-full ${compact ? 'px-2 py-1' : 'p-2.5'}`}>
        {ongoing && (
          <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full animate-ping opacity-75" />
        )}

        <div className={`font-bold leading-tight truncate ${compact ? 'text-xs' : 'text-sm'}`}>
          {booking.customerName.toUpperCase()}
        </div>

        {!compact && (
          <div className="text-[11px] opacity-90 mt-0.5 font-medium">
            {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
          </div>
        )}

        {height >= 56 && (
          <div className="flex items-center justify-between mt-auto gap-1">
            <span className="text-xs font-bold opacity-95">
              {formatCurrency(booking.totalCharge)}
            </span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${colors.badge}`}>
              {paid ? 'PAID' : 'UNPAID'}
            </span>
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
  bookingsList: Booking[];
  onClose: () => void;
  onEdit: (b: Booking) => void;
  onCheckout: (bookingId: string) => void;
}

function BookingDetailModal({ booking, courts, bookingsList, onClose, onEdit, onCheckout }: DetailModalProps) {
  const { cancelBooking, extendBooking, moveBooking, markPaid, discounts, tabs } = useStore();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showMovePanel, setShowMovePanel] = useState(false);
  const [showPaymentMethodConfirm, setShowPaymentMethodConfirm] = useState(false);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>('none');

  const court = courts.find(c => c.id === booking.courtId);
  const startDate = new Date(booking.startTime);
  const endDate   = new Date(booking.endTime);
  const ongoing   = isCurrentlyOngoing(booking);
  
  const tab = tabs.find((t) => t.bookingId === booking.id && t.status === 'open');
  const tabTotal = tab ? tab.items.reduce((s, item) => s + item.quantity * item.unitPrice, 0) : 0;
  
  const courtCharge = booking.totalCharge;
  const runningTotal = courtCharge + tabTotal;

  const activeDiscounts = discounts.filter(d => d.isActive);
  const selectedDiscount = activeDiscounts.find(d => d.id === selectedDiscountId);
  let discountAmount = 0;
  if (selectedDiscount) {
    discountAmount = selectedDiscount.type === 'percentage'
      ? (courtCharge * selectedDiscount.value) / 100
      : selectedDiscount.value;
  }
  const finalTotal = Math.max(0, courtCharge + tabTotal - discountAmount);

  const otherCourts = courts.filter(c => c.id !== booking.courtId && c.isEnabled && !c.isMaintenanceMode);

  // Check if moving to target court creates a conflict
  const checkMoveConflict = (targetCourtId: string): boolean => {
    return bookingsList.some(b => {
      if (b.courtId !== targetCourtId || b.status === 'cancelled' || b.id === booking.id) return false;
      const sameDay = new Date(b.startTime).toDateString() === startDate.toDateString();
      if (!sameDay) return false;

      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      const curStart = startDate.getTime();
      const curEnd = endDate.getTime();
      return curStart < bEnd && curEnd > bStart;
    });
  };

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
          <p className="text-sm text-gray-500">Select an available court for this time range:</p>
          {otherCourts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No other courts available</p>
          ) : (
            otherCourts.map(c => {
              const hasConflict = checkMoveConflict(c.id);
              return (
                <button
                  key={c.id}
                  disabled={hasConflict}
                  onClick={() => { moveBooking(booking.id, c.id); onClose(); }}
                  className={`w-full flex items-center justify-between p-3 border rounded-xl transition-colors ${
                    hasConflict
                      ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                      : 'bg-gray-50 hover:bg-green-50 border-gray-200 hover:border-green-300 text-gray-900 cursor-pointer'
                  }`}
                >
                  <span className="font-semibold">{c.name}</span>
                  {hasConflict ? (
                    <span className="text-xs text-red-500 font-bold">⚠️ Overlap</span>
                  ) : (
                    <span className="text-xs text-gray-500">{formatCurrency(c.hourlyRate)}/hr</span>
                  )}
                </button>
              );
            })
          )}
          <button onClick={() => setShowMovePanel(false)} className="btn-ghost w-full mt-2">Back</button>
        </div>
      </ModalShell>
    );
  }

  if (showPaymentMethodConfirm) {
    const appliedDiscount = selectedDiscount ? {
      discountTypeId: selectedDiscount.id,
      name: selectedDiscount.name,
      type: selectedDiscount.type,
      value: selectedDiscount.value,
      amount: discountAmount,
    } : null;

    return (
      <ModalShell onClose={onClose}>
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Check size={28} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
          <p className="text-gray-500 text-sm">
            Select the payment method used by <span className="font-semibold">{booking.customerName}</span>:
          </p>

          {/* Discount / Offer Selection */}
          <div className="text-left space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Discount / Offer</label>
            <select
              value={selectedDiscountId}
              onChange={(e) => setSelectedDiscountId(e.target.value)}
              className="input bg-white border-gray-200 text-sm"
            >
              <option value="none">No Discount / Full Payment</option>
              {activeDiscounts.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.type === 'percentage' ? `${d.value}%` : `₹${d.value}`} off)
                </option>
              ))}
            </select>
          </div>

          {/* Breakdown display */}
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 text-sm space-y-1.5 text-left">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Court Charge:</span>
              <span className="font-medium text-gray-800">{formatCurrency(courtCharge)}</span>
            </div>
            {tabTotal > 0 && (
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Food & Drink Tab:</span>
                <span className="font-medium text-gray-800">{formatCurrency(tabTotal)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-xs text-red-600 font-medium">
                <span>Offer ({selectedDiscount?.name}):</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-1.5 flex justify-between items-center font-bold text-gray-900">
              <span>Amount Due:</span>
              <span className="text-[#0F5132] text-base">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { markPaid(booking.id, 'online', appliedDiscount); onClose(); }}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl font-semibold transition-all cursor-pointer hover:-translate-y-0.5"
            >
              <span className="text-xl">📱</span>
              <span className="text-xs">Online / UPI</span>
            </button>
            <button
              onClick={() => { markPaid(booking.id, 'cash', appliedDiscount); onClose(); }}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl font-semibold transition-all cursor-pointer hover:-translate-y-0.5"
            >
              <span className="text-xl">💵</span>
              <span className="text-xs">Cash</span>
            </button>
          </div>
          <button onClick={() => setShowPaymentMethodConfirm(false)} className="btn-ghost w-full pt-2">
            Back
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose}>
      <div className={`p-5 ${ongoing ? 'bg-amber-400 text-amber-950' : 'bg-blue-500 text-white'}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-bold opacity-80">{court?.name}</div>
            <h2 className="text-xl font-black">{booking.customerName.toUpperCase()}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${STATUS_COLOR}`}>
                {booking.paymentStatus.toUpperCase()}
              </span>
              {ongoing && (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white/20 text-white animate-pulse">
                  ● LIVE MATCH
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="opacity-80 hover:opacity-100 p-1">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-5 grid grid-cols-2 gap-3">
        <InfoRow icon={<Clock size={14} />} label="Start Time" value={formatTime(booking.startTime)} />
        <InfoRow icon={<Clock size={14} />} label="End Time" value={formatTime(booking.endTime)} />
        <InfoRow icon={<Users size={14} />} label="Players" value={`${booking.numberOfPlayers}`} />
        <InfoRow icon={<Phone size={14} />} label="Phone" value={booking.phone} />
        <InfoRow icon={<IndianRupee size={14} />} label="Hourly Rate" value={`${formatCurrency(court?.hourlyRate ?? 0)}/hr`} />
        <InfoRow icon={<IndianRupee size={14} />} label="Total Running Bill" value={formatCurrency(runningTotal)} highlight />
        {booking.notes && (
          <div className="col-span-2">
            <InfoRow icon={<FileText size={14} />} label="Notes" value={booking.notes} />
          </div>
        )}
      </div>

      <div className="mx-5 mb-5 bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
        <div className="flex justify-between text-xs text-gray-500"><span>Court Charge</span><span className="font-semibold text-gray-700">{formatCurrency(courtCharge)}</span></div>
        <div className="flex justify-between text-xs text-gray-500"><span>F&amp;B Tabs</span><span className="font-semibold text-gray-700">{formatCurrency(tabTotal)}</span></div>
        <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2.5">
          <span>Total Bill</span>
          <span className="text-[#0F5132]">{formatCurrency(runningTotal)}</span>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onEdit(booking)}
            className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-xs font-semibold transition-colors"
          >
            <Edit2 size={13} /> Edit
          </button>
          <button
            onClick={() => { extendBooking(booking.id, 1); onClose(); }}
            className="flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-xl text-xs font-semibold transition-colors"
          >
            <AlarmClock size={13} /> Extend 1h
          </button>
          <button
            onClick={() => setShowMovePanel(true)}
            className="flex items-center justify-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 py-3 rounded-xl text-xs font-semibold transition-colors"
          >
            <ArrowLeftRight size={13} /> Move Court
          </button>
          {booking.paymentStatus !== 'paid' && (
            <button
              onClick={() => setShowPaymentMethodConfirm(true)}
              className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl text-xs font-semibold transition-colors"
            >
              <Check size={13} /> Mark Paid
            </button>
          )}
        </div>

        <button
          onClick={() => onCheckout(booking.id)}
          className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm"
        >
          <CreditCard size={15} /> Checkout &amp; Pay — {formatCurrency(runningTotal)}
        </button>

        <button
          onClick={() => setShowCancelConfirm(true)}
          className="w-full flex items-center justify-center gap-1.5 text-red-500 hover:bg-red-50 py-2.5 rounded-xl text-xs font-semibold transition-colors"
        >
          <Trash2 size={13} /> Cancel Booking
        </button>
      </div>
    </ModalShell>
  );
}

function InfoRow({ icon, label, value, highlight = false }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <div className="flex items-center gap-1.5 text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">{icon}{label}</div>
      <div className={`font-bold text-sm ${highlight ? 'text-[#0F5132] text-base' : 'text-gray-900'}`}>{value}</div>
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
// BOOKING CREATE/EDIT MODAL
// ─────────────────────────────────────────────────────────────
interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  courtId: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  selectedDate: Date;
  editBooking: Booking | null;
  bookingsList: Booking[];
}

function CreateBookingModal({ open, onClose, courtId, startHour, startMinute, endHour, endMinute, selectedDate, editBooking, bookingsList }: CreateModalProps) {
  const { courts, createBooking, updateBooking } = useStore();
  const enabledCourts = courts.filter(c => c.isEnabled && !c.isMaintenanceMode);

  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    numberOfPlayers: 2,
    courtId: courtId,
    startHour: startHour,
    startMinute: startMinute,
    endHour: endHour,
    endMinute: endMinute,
    notes: '',
  });

  useEffect(() => {
    if (!open) return;
    if (editBooking) {
      const start = new Date(editBooking.startTime);
      const end = new Date(editBooking.endTime);
      setForm({
        customerName: editBooking.customerName,
        phone: editBooking.phone,
        numberOfPlayers: editBooking.numberOfPlayers,
        courtId: editBooking.courtId,
        startHour: start.getHours(),
        startMinute: start.getMinutes(),
        endHour: end.getHours(),
        endMinute: end.getMinutes(),
        notes: editBooking.notes,
      });
    } else {
      setForm({
        customerName: '',
        phone: '',
        numberOfPlayers: 2,
        courtId,
        startHour,
        startMinute,
        endHour,
        endMinute,
        notes: '',
      });
    }
  }, [open, editBooking, courtId, startHour, startMinute, endHour, endMinute]);

  const startD = new Date(selectedDate);
  startD.setHours(form.startHour, form.startMinute, 0, 0);

  const endD = new Date(selectedDate);
  endD.setHours(form.endHour, form.endMinute, 0, 0);

  const durationMin = Math.round((endD.getTime() - startD.getTime()) / 60000);
  const selectedCourt = courts.find(c => c.id === form.courtId);
  const estimatedCharge = Math.ceil(((durationMin > 0 ? durationMin : 0) / 60) * (selectedCourt?.hourlyRate ?? 500));

  // Overlap and conflict checks
  const bookingDateKey = selectedDate.toDateString();
  const startDayKey = startD.toDateString();
  const endDayKey = endD.toDateString();

  const isStartInvalid = startDayKey !== bookingDateKey || startD.getHours() < START_H;
  const isEndInvalid = !(
    (endDayKey === bookingDateKey && endD.getHours() < END_H) ||
    (endD.getTime() === new Date(new Date(selectedDate).setHours(END_H, 0, 0, 0)).getTime())
  );

  const isOutOfOperatingHours = isStartInvalid || isEndInvalid;
  const invalidTimeRange = durationMin <= 0;

  const conflict = bookingsList.find(b => {
    if (b.courtId !== form.courtId || b.status === 'cancelled') return false;
    if (editBooking && b.id === editBooking.id) return false;

    const sameDay = new Date(b.startTime).toDateString() === selectedDate.toDateString();
    if (!sameDay) return false;

    const bStart = new Date(b.startTime).getTime();
    const bEnd = new Date(b.endTime).getTime();
    return startD.getTime() < bEnd && endD.getTime() > bStart;
  });

  // Suggest next available slot if conflict exists
  let suggestion: Date | null = null;
  if (conflict && !invalidTimeRange && !isOutOfOperatingHours) {
    suggestion = findNextAvailableTime(form.courtId, startD, durationMin, bookingsList);
  }

  const applySuggestion = () => {
    if (!suggestion) return;
    const durMs = durationMin * 60000;
    const suggEnd = new Date(suggestion.getTime() + durMs);
    setForm(f => ({
      ...f,
      startHour: suggestion!.getHours(),
      startMinute: suggestion!.getMinutes(),
      endHour: suggEnd.getHours(),
      endMinute: suggEnd.getMinutes(),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invalidTimeRange || isOutOfOperatingHours || conflict) return;

    if (editBooking) {
      updateBooking(editBooking.id, {
        customerName: form.customerName,
        phone: form.phone,
        numberOfPlayers: form.numberOfPlayers,
        notes: form.notes,
        duration: durationMin,
        startTime: startD.toISOString(),
        endTime: endD.toISOString(),
        totalCharge: estimatedCharge,
      });
    } else {
      createBooking({
        courtId: form.courtId,
        customerName: form.customerName,
        phone: form.phone,
        numberOfPlayers: form.numberOfPlayers,
        startTime: startD.toISOString(),
        endTime: endD.toISOString(),
        duration: durationMin,
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

          {/* Start Time Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1"><Clock size={12} className="text-gray-400" /> Start Hour</label>
              <select value={form.startHour} onChange={e => setForm({ ...form, startHour: parseInt(e.target.value) })} className="input">
                {Array.from({ length: END_H - START_H }, (_, i) => START_H + i).map(h => (
                  <option key={h} value={h}>{fmtHour(h)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Start Minute</label>
              <select value={form.startMinute} onChange={e => setForm({ ...form, startMinute: parseInt(e.target.value) })} className="input">
                {[0, 15, 30, 45].map(m => (
                  <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* End Time Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1"><Clock size={12} className="text-gray-400" /> End Hour</label>
              <select value={form.endHour} onChange={e => setForm({ ...form, endHour: parseInt(e.target.value) })} className="input">
                {Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i).map(h => (
                  <option key={h} value={h}>{fmtHour(h)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">End Minute</label>
              <select value={form.endMinute} onChange={e => setForm({ ...form, endMinute: parseInt(e.target.value) })} className="input">
                {[0, 15, 30, 45].map(m => (
                  <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Conflict Display Box */}
          {conflict && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="font-semibold flex items-center gap-1">
                <AlertTriangle size={14} /> Time Conflict Detected
              </div>
              <p>
                This court is already booked by <span className="font-bold">{conflict.customerName}</span> from{' '}
                <span className="font-bold">{formatTime(conflict.startTime)}</span> to{' '}
                <span className="font-bold">{formatTime(conflict.endTime)}</span>.
              </p>
              {suggestion && (
                <div className="pt-1.5 border-t border-red-200 flex items-center justify-between gap-2">
                  <span>Suggested slot: <b>{formatTime(suggestion.toISOString())}</b></span>
                  <button
                    type="button"
                    onClick={applySuggestion}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors"
                  >
                    Use Suggested Time
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Time range warnings */}
          {invalidTimeRange && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs font-semibold flex items-center gap-1">
              <AlertTriangle size={14} /> End time must be strictly after the start time.
            </div>
          )}

          {isOutOfOperatingHours && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs font-semibold flex items-center gap-1">
              <AlertTriangle size={14} /> Bookings must stay within 6:00 AM – 11:00 PM.
            </div>
          )}

          {/* Time Preview */}
          {!invalidTimeRange && !isOutOfOperatingHours && !conflict && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-green-600 font-medium">Duration: {Math.floor(durationMin / 60)}h {durationMin % 60}m</div>
                <div className="text-sm font-bold text-green-900">
                  {formatTime(startD.toISOString())} → {formatTime(endD.toISOString())}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-green-600 font-medium">Court Charge</div>
                <div className="text-xl font-black text-[#0F5132]">{formatCurrency(estimatedCharge)}</div>
              </div>
            </div>
          )}

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

          {/* Submit buttons */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button
              type="submit"
              disabled={invalidTimeRange || isOutOfOperatingHours || !!conflict}
              className="btn-primary flex-1 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
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

  return (
    <div className="flex-1 min-w-[140px] border-r border-gray-100 last:border-r-0">
      <div className="h-10 bg-[#0F5132] flex items-center justify-center gap-1.5 sticky top-0 z-10 border-r border-[#0a3d26] last:border-r-0">
        <span className="text-white font-bold text-sm">{court.name}</span>
      </div>

      <div style={{ position: 'relative', height: NUM_SLOTS * SLOT_H }} className="bg-gray-50/20">

        {/* Hour slot grid lines */}
        {SLOT_HOURS.map((hour, i) => (
          <div
            key={hour}
            style={{ position: 'absolute', top: i * SLOT_H, left: 0, right: 0, height: SLOT_H }}
            className="border-b border-gray-100"
          />
        ))}

        {/* Current time red line */}
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

        {/* Hover Book Buttons on Slot Rows */}
        {court.isEnabled && !court.isMaintenanceMode && SLOT_HOURS.map((hour, i) => (
          <button
            key={hour}
            onClick={() => onBook(court.id, hour)}
            style={{ position: 'absolute', top: i * SLOT_H + 2, left: 2, right: 2, height: SLOT_H - 4, zIndex: 4 }}
            className="rounded-xl border border-transparent hover:border-emerald-300 hover:bg-emerald-50/30 transition-all duration-100 group flex items-start p-1.5"
          >
            <span className="text-[10px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              <Plus size={10} /> Book {fmtHourShort(hour)}
            </span>
          </button>
        ))}

        {/* Booking cards rendered proportionally */}
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
    open: false,
    courtId: '',
    startHour: 8,
    startMinute: 0,
    endHour: 9,
    endMinute: 0,
    editBooking: null as Booking | null,
  });
  const [detailModal, setDetailModal] = useState<{ open: boolean; booking: Booking | null }>({
    open: false, booking: null,
  });
  const [checkoutBookingId, setCheckoutBookingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());

  // Refresh every 15s to update current-time line position and sync ongoing game cards
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll to current time when viewing today
  useEffect(() => {
    const isToday = dateKey(new Date()) === dateKey(selectedDate);
    if (!isToday || !scrollRef.current) return;
    const offset = Math.max(0, (now.getHours() - START_H - 1.5) * SLOT_H);
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = offset;
    });
  }, [selectedDate]);

  const dayKey = dateKey(selectedDate);
  const isToday = dateKey(new Date()) === dayKey;

  const location = useLocation();
  const prefilledChecked = useRef(false);

  useEffect(() => {
    if (prefilledChecked.current) return;
    const prefill = location.state?.prefill;
    if (prefill) {
      prefilledChecked.current = true;
      const prefDate = new Date(prefill.date);
      setSelectedDate(prefDate);
      setCreateModal({
        open: true,
        courtId: prefill.courtId,
        startHour: prefill.startHour,
        startMinute: prefill.startMinute,
        endHour: prefill.endHour,
        endMinute: prefill.endMinute,
        editBooking: null
      });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Filter active bookings for selected date
  const dayBookings = bookings.filter(b =>
    b.status !== 'cancelled' && dateKey(new Date(b.startTime)) === dayKey
  );

  // Current time indicator position (px from top of grid)
  const nowOffsetMinutes = (now.getHours() - START_H) * 60 + now.getMinutes();
  const currentTimeTop = isToday && nowOffsetMinutes >= 0 && nowOffsetMinutes <= NUM_SLOTS * 60
    ? (nowOffsetMinutes / 60) * SLOT_H
    : null;

  const openBook = useCallback((courtId: string, startHour: number) => {
    setCreateModal({
      open: true,
      courtId,
      startHour,
      startMinute: 0,
      endHour: Math.min(END_H, startHour + 1),
      endMinute: 0,
      editBooking: null
    });
  }, []);

  const openEdit = useCallback((b: Booking) => {
    setDetailModal({ open: false, booking: null });
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    setCreateModal({
      open: true,
      courtId: b.courtId,
      startHour: start.getHours(),
      startMinute: start.getMinutes(),
      endHour: end.getHours(),
      endMinute: end.getMinutes(),
      editBooking: b
    });
  }, []);

  const openCheckout = useCallback((bookingId: string) => {
    setDetailModal({ open: false, booking: null });
    setCheckoutBookingId(bookingId);
  }, []);

  // Stats header calculation
  const getLiveStatus = (court: Court) => {
    if (court.isMaintenanceMode) return 'maintenance';
    if (!court.isEnabled) return 'disabled';
    const isOccupied = bookings.some(
      (b) => b.courtId === court.id && b.status === 'active' && new Date(b.startTime) <= now && new Date(b.endTime) > now
    );
    return isOccupied ? 'occupied' : 'available';
  };

  const occupiedCount = courts.filter(c => getLiveStatus(c) === 'occupied').length;
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
              <span className="text-xs text-gray-400">{todayBookingCount} booking{todayBookingCount !== 1 ? 's' : ''} · {occupiedCount} live match{occupiedCount !== 1 ? 'es' : ''}</span>
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
            <div className="h-10 border-b border-gray-100 bg-[#0a3d26] flex items-center justify-center">
              <Clock size={13} className="text-green-400" />
            </div>

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
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded border border-gray-200" />Available</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500" />Booked</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-400" />Live Match</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#0F5132]" />Paid</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-400" />Past</div>
        <div className="flex items-center gap-1.5"><div className="w-full h-0.5 bg-red-500" style={{ width: '12px' }} />Current Time</div>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {createModal.open && (
          <CreateBookingModal
            open={createModal.open}
            onClose={() => setCreateModal(s => ({ ...s, open: false }))}
            courtId={createModal.courtId}
            startHour={createModal.startHour}
            startMinute={createModal.startMinute}
            endHour={createModal.endHour}
            endMinute={createModal.endMinute}
            selectedDate={selectedDate}
            editBooking={createModal.editBooking}
            bookingsList={bookings}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailModal.open && detailModal.booking && (
          <BookingDetailModal
            booking={detailModal.booking}
            courts={courts}
            bookingsList={bookings}
            onClose={() => setDetailModal({ open: false, booking: null })}
            onEdit={openEdit}
            onCheckout={openCheckout}
          />
        )}
      </AnimatePresence>

      {checkoutBookingId && (
        <CheckoutModal
          bookingId={checkoutBookingId}
          onClose={() => setCheckoutBookingId(null)}
        />
      )}
    </div>
  );
}
