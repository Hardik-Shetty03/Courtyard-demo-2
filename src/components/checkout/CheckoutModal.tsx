// src/components/checkout/CheckoutModal.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Printer, CreditCard, Smartphone, Banknote, Tag } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency, calculateCourtCharge } from '@/utils';
import type { CheckoutData } from '@/types';

interface CheckoutModalProps {
  courtId: string;
  onClose: () => void;
}

export default function CheckoutModal({ courtId, onClose }: CheckoutModalProps) {
  const { courts, bookings, tabs, discounts, applyDiscount, checkout } = useStore();

  const court = courts.find((c) => c.id === courtId);
  const booking = bookings.find((b) => b.courtId === courtId && b.status === 'active');
  const tab = tabs.find((t) => t.courtId === courtId && t.status === 'open');

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [extraCharges, setExtraCharges] = useState(0);
  const [extraNote, setExtraNote] = useState('');
  const [done, setDone] = useState(false);

  if (!court || !booking || !tab) return null;

  const courtCharge = calculateCourtCharge(booking.startTime, court.hourlyRate);
  const foodAndDrinks = tab.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const subtotal = courtCharge + foodAndDrinks + extraCharges;

  let discountAmount = 0;
  if (tab.discount) {
    discountAmount = tab.discount.type === 'percentage'
      ? (subtotal * tab.discount.value) / 100
      : tab.discount.value;
  }

  const grandTotal = Math.max(0, subtotal - discountAmount);

  const handleCheckout = () => {
    const checkoutData: CheckoutData = {
      courtId,
      bookingId: booking.id,
      courtCharge,
      foodAndDrinks,
      discount: tab.discount,
      extraCharges,
      extraChargesNote: extraNote,
      grandTotal,
      paymentMethod,
    };
    checkout(checkoutData);
    setDone(true);
  };

  const PAYMENT_METHODS = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'upi', label: 'UPI', icon: Smartphone },
    { id: 'card', label: 'Card', icon: CreditCard },
  ] as const;

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm z-10 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Check size={32} className="text-emerald-600" />
          </motion.div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Complete!</h2>
          <p className="text-gray-500 text-sm mb-2">{court.name} — {booking.customerName}</p>
          <p className="text-3xl font-black text-[#0F5132] mb-1">{formatCurrency(grandTotal)}</p>
          <p className="text-sm text-gray-400 mb-6">via {paymentMethod.toUpperCase()}</p>
          <div className="space-y-2 text-left bg-gray-50 rounded-xl p-4 mb-6 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Court Charge</span><span>{formatCurrency(courtCharge)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">F&B</span><span>{formatCurrency(foodAndDrinks)}</span></div>
            {extraCharges > 0 && <div className="flex justify-between"><span className="text-gray-500">Extra</span><span>{formatCurrency(extraCharges)}</span></div>}
            {discountAmount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
            <div className="flex justify-between font-bold border-t border-gray-200 pt-2 mt-1"><span>Total Paid</span><span className="text-[#0F5132]">{formatCurrency(grandTotal)}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Check size={16} /> Done
            </button>
            <button className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <Printer size={16} /> Print
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 bg-[#0F5132]">
            <div>
              <h2 className="text-lg font-bold text-white">Checkout</h2>
              <p className="text-green-300 text-xs">{court.name} — {booking.customerName}</p>
            </div>
            <button onClick={onClose} className="text-green-300 hover:text-white p-1.5 rounded-lg hover:bg-green-900/40">
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Bill Breakdown */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Bill Breakdown</p>
              <div className="space-y-2 bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Court Charge</span>
                  <span className="font-semibold">{formatCurrency(courtCharge)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Food & Drinks</span>
                  <span className="font-semibold">{formatCurrency(foodAndDrinks)}</span>
                </div>
                {extraCharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Extra ({extraNote || 'Misc'})</span>
                    <span className="font-semibold">{formatCurrency(extraCharges)}</span>
                  </div>
                )}
                {tab.discount && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span className="flex items-center gap-1"><Tag size={12} />{tab.discount.name}</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2 mt-1">
                  <span>Grand Total</span>
                  <span className="text-[#0F5132] text-xl">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Items on tab */}
            {tab.items.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Items</p>
                <div className="space-y-1">
                  {tab.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs text-gray-600">
                      <span>{item.name} ×{item.quantity}</span>
                      <span>{formatCurrency(item.quantity * item.unitPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discount */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Discount</p>
              {tab.discount ? (
                <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl p-3">
                  <span className="text-sm text-red-700">{tab.discount.name} — -{formatCurrency(discountAmount)}</span>
                  <button onClick={() => applyDiscount(courtId, null)} className="text-xs text-red-600 hover:underline">Remove</button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {discounts.filter((d) => d.isActive).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        const amount = d.type === 'percentage' ? (subtotal * d.value) / 100 : d.value;
                        applyDiscount(courtId, { discountTypeId: d.id, name: d.name, type: d.type, value: d.value, amount });
                      }}
                      className="text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-green-50 hover:border-green-300 hover:text-green-800 transition-colors"
                    >
                      {d.name} ({d.type === 'percentage' ? `${d.value}%` : formatCurrency(d.value)})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Extra Charges */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Extra Charges</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={extraCharges || ''}
                  onChange={(e) => setExtraCharges(parseFloat(e.target.value) || 0)}
                  className="input flex-1"
                  placeholder="Amount (₹)"
                  min={0}
                />
                <input
                  value={extraNote}
                  onChange={(e) => setExtraNote(e.target.value)}
                  className="input flex-1"
                  placeholder="Reason"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setPaymentMethod(id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all duration-200 ${
                      paymentMethod === id
                        ? 'border-[#0F5132] bg-green-50 text-[#0F5132]'
                        : 'border-gray-200 text-gray-600 hover:border-green-300'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleCheckout}
              className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
            >
              Complete Payment — {formatCurrency(grandTotal)}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
