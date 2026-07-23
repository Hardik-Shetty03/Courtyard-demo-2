// src/pages/CourtTabs.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Minus, Trash2, Tag, ShoppingCart, IndianRupee,
  User, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatTime } from '@/utils';
import CheckoutModal from '@/components/checkout/CheckoutModal';

export default function CourtTabs() {
  const { courts, bookings, tabs, inventory, discounts, updateItemQuantity, removeItemFromTab, applyDiscount } = useStore();
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [checkoutCourtId, setCheckoutCourtId] = useState<string | null>(null);

  const occupiedCourts = courts.filter((c) => c.status === 'occupied');

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Court Tabs</h2>
        <p className="text-sm text-gray-500">Manage running tabs for occupied courts</p>
      </div>

      {occupiedCourts.length === 0 ? (
        <div className="card text-center py-12">
          <ShoppingCart size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No active court sessions</p>
          <p className="text-gray-400 text-sm mt-1">Book a court to start a tab</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {occupiedCourts.map((court) => {
            const booking = bookings.find((b) => b.courtId === court.id && b.status === 'active');
            const tab = tabs.find((t) => t.courtId === court.id && t.status === 'open');
            if (!booking || !tab) return null;

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
            const isExpanded = selectedCourtId === court.id;

            return (
              <motion.div
                key={court.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card flex flex-col gap-0 overflow-hidden p-0"
              >
                {/* Tab Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedCourtId(isExpanded ? null : court.id)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <h3 className="font-bold text-gray-900">{court.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                      <User size={11} /> {booking.customerName}
                      <span className="mx-1">·</span>
                      <Clock size={11} /> {formatTime(booking.startTime)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-black text-[#0F5132]">{formatCurrency(total)}</div>
                      <div className="text-xs text-gray-400">{tab.items.length} item(s)</div>
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
                      <div className="border-t border-gray-100 p-4 space-y-4">
                        {/* Court Charge Line */}
                        <div className="flex justify-between text-sm">
                          <div className="text-gray-600">
                            <span className="font-medium">Court Charge</span>
                            <span className="text-xs text-gray-400 ml-1">({court.name} @ ₹{court.hourlyRate}/hr)</span>
                          </div>
                          <span className="font-semibold">{formatCurrency(courtCharge)}</span>
                        </div>

                        {/* Items */}
                        {tab.items.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Items</p>
                            {tab.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                  <p className="text-xs text-gray-400">{formatCurrency(item.unitPrice)} each</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => updateItemQuantity(court.id, item.id, item.quantity - 1)}
                                    className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                                  <button
                                    onClick={() => updateItemQuantity(court.id, item.id, item.quantity + 1)}
                                    className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                                <div className="w-16 text-right text-sm font-semibold">
                                  {formatCurrency(item.quantity * item.unitPrice)}
                                </div>
                                <button
                                  onClick={() => removeItemFromTab(court.id, item.id)}
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
                            <span className="text-gray-500">Court</span>
                            <span>{formatCurrency(courtCharge)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">F&B</span>
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
                            <span>Total</span>
                            <span className="text-[#0F5132]">{formatCurrency(total)}</span>
                          </div>
                        </div>

                        {/* Discount Section */}
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Discount</p>
                          <div className="flex flex-wrap gap-1.5">
                            {tab.discount ? (
                              <button
                                onClick={() => applyDiscount(court.id, null)}
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
                                    applyDiscount(court.id, {
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
                            onClick={() => setCheckoutCourtId(court.id)}
                            className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
                          >
                            <IndianRupee size={16} />
                            Checkout — {formatCurrency(total)}
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

      {checkoutCourtId && (
        <CheckoutModal
          courtId={checkoutCourtId}
          onClose={() => setCheckoutCourtId(null)}
        />
      )}
    </div>
  );
}
