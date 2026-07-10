// src/pages/Inventory.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, RefreshCw, AlertTriangle, Package, Search, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/utils';
import type { InventoryItem } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  drinks: 'Drinks',
  food: 'Food',
  equipment: 'Equipment',
  other: 'Other',
};

export default function Inventory() {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, restockItem } = useStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [restockModal, setRestockModal] = useState<InventoryItem | null>(null);
  const [restockAmount, setRestockAmount] = useState(10);

  const filtered = inventory.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const lowStock = inventory.filter((i) => i.stock <= i.minStock);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Inventory</h2>
          <p className="text-sm text-gray-500">{inventory.length} items · {lowStock.length} low stock</p>
        </div>
        <button onClick={() => { setEditItem(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> <span className="hidden sm:inline">Add Item</span>
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Low Stock Alert</p>
            <p className="text-amber-700 text-xs mt-0.5">{lowStock.map(i => `${i.name} (${i.stock})`).join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Search items..."
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'drinks', 'food', 'equipment', 'other'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#0F5132] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#0F5132]'
              }`}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sell Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Buy Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Min</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((item) => {
                const isLow = item.stock <= item.minStock;
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package size={15} className="text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-gray-100 text-gray-600">{CATEGORY_LABELS[item.category]}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(item.sellingPrice)}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">{formatCurrency(item.purchasePrice)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-bold ${
                        item.stock === 0 ? 'text-red-600' : isLow ? 'text-amber-500' : 'text-gray-900'
                      }`}>
                        {item.stock}
                        {isLow && <AlertTriangle size={12} className="inline ml-1 mb-0.5" />}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">{item.minStock}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setRestockModal(item)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Restock"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => { setEditItem(item); setModalOpen(true); }}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteInventoryItem(item.id)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No items found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Modal */}
      <AnimatePresence>
        {modalOpen && (
          <InventoryModal
            item={editItem}
            onClose={() => setModalOpen(false)}
            onSave={(data) => {
              if (editItem) {
                updateInventoryItem(editItem.id, data);
              } else {
                addInventoryItem(data);
              }
              setModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Restock Modal */}
      <AnimatePresence>
        {restockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setRestockModal(null)} />
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm z-10">
              <h3 className="font-bold text-gray-900 mb-1">Restock: {restockModal.name}</h3>
              <p className="text-sm text-gray-500 mb-4">Current stock: {restockModal.stock} units</p>
              <label className="label">Add Quantity</label>
              <input type="number" value={restockAmount} onChange={(e) => setRestockAmount(Math.max(1, parseInt(e.target.value) || 1))} className="input mb-4" min={1} />
              <div className="flex gap-3">
                <button onClick={() => setRestockModal(null)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={() => { restockItem(restockModal.id, restockAmount); setRestockModal(null); }} className="btn-primary flex-1">Add Stock</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InventoryModal({
  item, onClose, onSave
}: {
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (data: Omit<InventoryItem, 'id'>) => void;
}) {
  const [form, setForm] = useState<Omit<InventoryItem, 'id'>>({
    name: item?.name ?? '',
    category: item?.category ?? 'drinks',
    sellingPrice: item?.sellingPrice ?? 0,
    purchasePrice: item?.purchasePrice ?? 0,
    stock: item?.stock ?? 0,
    minStock: item?.minStock ?? 10,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-[#0F5132]">
          <h2 className="text-lg font-bold text-white">{item ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} className="text-green-300 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Item Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="e.g. Gatorade" required />
          </div>
          <div>
            <label className="label">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as InventoryItem['category'] })} className="input">
              <option value="drinks">Drinks</option>
              <option value="food">Food</option>
              <option value="equipment">Equipment</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Selling Price (₹)</label>
              <input type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })} className="input" min={0} />
            </div>
            <div>
              <label className="label">Purchase Price (₹)</label>
              <input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })} className="input" min={0} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Current Stock</label>
              <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className="input" min={0} />
            </div>
            <div>
              <label className="label">Min Stock</label>
              <input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: parseInt(e.target.value) || 0 })} className="input" min={0} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button onClick={() => onSave(form)} className="btn-primary flex-1" disabled={!form.name}>{item ? 'Update' : 'Add Item'}</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
