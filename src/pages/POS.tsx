// src/pages/POS.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Plus, Check, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/utils';

export default function POS() {
  const { courts, inventory, addItemToTab, tabs, bookings } = useStore();
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');
  const [addedItem, setAddedItem] = useState<string | null>(null);

  const occupiedCourts = courts.filter((c) => c.status === 'occupied');
  const activeCourtId = selectedCourtId || occupiedCourts[0]?.id || '';

  const CATEGORIES = ['drinks', 'food', 'equipment', 'other'] as const;
  const categoryLabels: Record<string, string> = {
    drinks: '🥤 Drinks',
    food: '🍿 Food',
    equipment: '🎾 Equipment',
    other: '📦 Other',
  };

  const handleAddItem = (itemId: string) => {
    if (!activeCourtId) return;
    const item = inventory.find((i) => i.id === itemId);
    if (!item || item.stock <= 0) return;

    addItemToTab(activeCourtId, {
      inventoryItemId: item.id,
      name: item.name,
      quantity: 1,
      unitPrice: item.sellingPrice,
    });

    setAddedItem(itemId);
    setTimeout(() => setAddedItem(null), 1200);
  };

  const getTabForCourt = (courtId: string) => tabs.find((t) => t.courtId === courtId && t.status === 'open');
  const currentTab = getTabForCourt(activeCourtId);
  const tabTotal = currentTab ? currentTab.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) : 0;
  const activeBooking = bookings.find((b) => b.courtId === activeCourtId && b.status === 'active');

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Point of Sale</h2>
        <p className="text-sm text-gray-500">Quick-add items to a court tab</p>
      </div>

      {/* Court Selector */}
      <div className="card">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Select Court</p>
        {occupiedCourts.length === 0 ? (
          <p className="text-sm text-gray-500">No courts are currently occupied.</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {occupiedCourts.map((court) => {
              const booking = bookings.find((b) => b.courtId === court.id && b.status === 'active');
              const isSelected = activeCourtId === court.id;
              return (
                <button
                  key={court.id}
                  onClick={() => setSelectedCourtId(court.id)}
                  className={`flex flex-col px-4 py-2.5 rounded-xl border-2 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-[#0F5132] bg-green-50'
                      : 'border-gray-200 bg-white hover:border-green-300'
                  }`}
                >
                  <span className={`text-sm font-bold ${isSelected ? 'text-[#0F5132]' : 'text-gray-900'}`}>
                    {court.name}
                  </span>
                  <span className="text-xs text-gray-400">{booking?.customerName ?? '—'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Items Grid */}
        <div className="xl:col-span-2 space-y-4">
          {CATEGORIES.map((cat) => {
            const items = inventory.filter((i) => i.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="card">
                <p className="text-sm font-semibold text-gray-700 mb-3">{categoryLabels[cat]}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {items.map((item) => {
                    const outOfStock = item.stock <= 0;
                    const justAdded = addedItem === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => handleAddItem(item.id)}
                        disabled={outOfStock || !activeCourtId}
                        whileTap={{ scale: 0.95 }}
                        className={`relative p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                          outOfStock || !activeCourtId
                            ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                            : justAdded
                            ? 'border-emerald-400 bg-emerald-50'
                            : 'border-gray-200 bg-white hover:border-[#0F5132] hover:bg-green-50 active:scale-95'
                        }`}
                      >
                        {justAdded && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
                          >
                            <Check size={12} className="text-white" />
                          </motion.div>
                        )}
                        <p className="text-sm font-semibold text-gray-900 leading-tight">{item.name}</p>
                        <p className="text-[#0F5132] font-bold text-sm mt-1">{formatCurrency(item.sellingPrice)}</p>
                        <p className={`text-xs mt-0.5 ${item.stock <= item.minStock ? 'text-amber-500' : 'text-gray-400'}`}>
                          {outOfStock ? 'Out of stock' : `${item.stock} left`}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Tab Summary */}
        <div className="xl:col-span-1">
          <div className="card sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-[#0F5132]" />
                <p className="font-semibold text-gray-900">
                  {activeCourtId ? courts.find((c) => c.id === activeCourtId)?.name : 'No Court Selected'}
                </p>
              </div>
              {activeBooking && (
                <span className="text-xs text-gray-400">{activeBooking.customerName}</span>
              )}
            </div>

            {currentTab && currentTab.items.length > 0 ? (
              <div className="space-y-2 mb-4">
                {currentTab.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.name} ×{item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.quantity * item.unitPrice)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
                  <span>F&B Total</span>
                  <span className="text-[#0F5132]">{formatCurrency(tabTotal)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <Plus size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No items added yet</p>
                <p className="text-xs">Click an item above to add</p>
              </div>
            )}

            {activeCourtId && (
              <a
                href="/court-tabs"
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              >
                View Full Tab <ChevronRight size={16} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
