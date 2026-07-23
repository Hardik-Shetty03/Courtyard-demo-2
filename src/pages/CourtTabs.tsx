// src/pages/CourtTabs.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Minus, Trash2, Tag, ShoppingCart, IndianRupee,
  User, Clock, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatTime } from '@/utils';
import CheckoutModal from '@/components/checkout/CheckoutModal';

export default function CourtTabs() {
  const { courts, bookings, tabs, inventory, discounts, updateItemQuantity, removeItemFromTab, applyDiscount } = useStore();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [checkoutBookingId, setCheckoutBookingId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Refresh current time every 15s to keep the live status accurate
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  // Filter bookings: show only live/ongoing sessions, and past sessions that are unpaid
  const activeBookings = bookings.filter((b) => {
    if (b.status === 'completed') return false;
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    
    const isLive = start <= now && end > now;
    const isPastUnpaid = end <= now && b.paymentStatus === 'unpaid';
    
    return isLive || isPastUnpaid;
  });

  const isOverdue = (booking: typeof bookings[0]) => {
    return new Date(booking.endTime) < now && booking.paymentStatus === 'unpaid';
  };

  const getBookingDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Today";
    } else if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Court Tabs</h2>
        <p className="text-sm text-gray-500">Manage running tabs and settle payments for all active sessions</p>
      </div>

      {activeBookings.length === 0 ? (
        <div className="card text-center py-12">
          <ShoppingCart size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No active court sessions</p>
          <p className="text-gray-400 text-sm mt-1">Book a court to start a tab</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeBookings.map((booking) => {
            const court = courts.find((c) => c.id === booking.courtId);
            const tab = tabs.find((t) => t.bookingId === booking.id && t.status === 'open');
            if (!tab) return null;

            const tabTotal = tab.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
            const courtCharge = booking.totalCharge;
            const subtotal = courtCharge + tabTotal;

            let discountAmount = 0;
            if (tab.discount) {
              discountAmount = tab.discount.type === 'percentage'
                ? (subtotal * tab.discount.value) / 100
                : tab.discount.value;
            }
            const total = Math.max(0, subtotal - discountAmount);
            const isExpanded = selectedBookingId === booking.id;
            const overdue = isOverdue(booking);

            return (
              <motion.div
                key={booking.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card flex flex-col gap-0 overflow-hidden p-0 border-2 transition-all ${
                  overdue 
                    ? 'border-red-200 shadow-md bg-red-50/5' 
                    : 'border-transparent'
                }`}
              >
                {/* Tab Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/85 transition-colors"
                  onClick={() => setSelectedBookingId(isExpanded ? null : booking.id)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${overdue ? 'bg-red-600 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                      <h3 className="font-bold text-gray-900">{court ? court.name : 'Unknown Court'}</h3>
                      {overdue && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 bg-red-100 text-red-700 rounded-md">
                          <AlertTriangle size={8} /> Unpaid
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <User size={11} className="text-gray-400" />
                      <span className="font-medium text-gray-700">{booking.customerName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock size={10} />
                      <span>
                        {getBookingDateLabel(booking.startTime)} {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-black text-[#0F5132]">{formatCurrency(total)}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{tab.items.length} item(s) on tab</div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-100 p-4 space-y-4 bg-white">
                        {/* Court Charge Line */}
                        <div className="flex justify-between text-sm">
                          <div className="text-gray-600">
                            <span className="font-medium">Court Charge</span>
                            <span className="text-xs text-gray-400 ml-1">
                              ({court ? court.name : 'Court'} @ ₹{court ? court.hourlyRate : 500}/hr)
                            </span>
                          </div>
                          <span className="font-semibold text-gray-800">{formatCurrency(courtCharge)}</span>
                        </div>

                        {/* Items */}
                        {tab.items.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Tab Items</p>
                            {tab.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                  <p className="text-xs text-gray-400">{formatCurrency(item.unitPrice)} each</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => updateItemQuantity(booking.id, item.id, item.quantity - 1)}
                                    className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                                  <button
                                    onClick={() => updateItemQuantity(booking.id, item.id, item.quantity + 1)}
                                    className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                                <div className="w-16 text-right text-sm font-semibold">
                                  {formatCurrency(item.quantity * item.unitPrice)}
                                </div>
                                <button
                                  onClick={() => removeItemFromTab(booking.id, item.id)}
                                  className="text-red-400 hover:text-red-600 transition-colors p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Totals */}
                        <div className="border-t border-gray-100 pt-3 space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Court Fee</span>
                            <span>{formatCurrency(courtCharge)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">F&B Total</span>
                            <span>{formatCurrency(tabTotal)}</span>
                          </div>
                          {tab.discount && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span className="flex items-center gap-1">
                                <Tag size={12} /> {tab.discount.name}
                                {tab.discount.type === 'percentage' && ` (${tab.discount.value}%)`}
                              </span>
                              <span>-{formatCurrency(discountAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2 mt-1">
                            <span>Grand Total</span>
                            <span className="text-[#0F5132]">{formatCurrency(total)}</span>
                          </div>
                        </div>

                        {/* Discount Section */}
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Discount Preset</p>
                          <div className="flex flex-wrap gap-1.5">
                            {tab.discount ? (
                              <button
                                onClick={() => applyDiscount(booking.id, null)}
                                className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                Remove: {tab.discount.name}
                              </button>
                            ) : (
                              discounts.filter((d) => d.isActive).map((d) => (
                                <button
                                  key={d.id}
                                  onClick={() => {
                                    const amount = d.type === 'percentage' ? (subtotal * d.value) / 100 : d.value;
                                    applyDiscount(booking.id, {
                                      discountTypeId: d.id,
                                      name: d.name,
                                      type: d.type,
                                      value: d.value,
                                      amount,
                                    });
                                  }}
                                  className="text-xs bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-green-50 hover:border-green-300 hover:text-green-800 transition-colors"
                                >
                                  {d.name} ({d.type === 'percentage' ? `${d.value}%` : formatCurrency(d.value)})
                                </button>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => setCheckoutBookingId(booking.id)}
                            className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
                          >
                            <IndianRupee size={16} />
                            Checkout & Settle — {formatCurrency(total)}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {checkoutBookingId && (
        <CheckoutModal
          bookingId={checkoutBookingId}
          onClose={() => setCheckoutBookingId(null)}
        />
      )}
    </div>
  );
}
