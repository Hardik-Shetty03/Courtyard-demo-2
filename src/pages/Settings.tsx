// src/pages/Settings.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, MapPin, Tag, Pencil, Plus, Trash2, X, ToggleLeft, ToggleRight, Wrench
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/utils';
import type { DiscountType } from '@/types';

export default function Settings() {
  const { courts, updateCourt, addCourt, deleteCourt, discounts, addDiscountType, updateDiscountType, deleteDiscountType, settings, updateSettings, clearAllData } = useStore();
  const [editCourtId, setEditCourtId] = useState<string | null>(null);
  const [courtForm, setCourtForm] = useState({ name: '', hourlyRate: 0 });
  const [discountModal, setDiscountModal] = useState(false);
  const [courtModalOpen, setCourtModalOpen] = useState(false);
  const [newCourtForm, setNewCourtForm] = useState({ name: '', hourlyRate: 500, color: '#0F5132' });
  const [editDiscount, setEditDiscount] = useState<DiscountType | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [discForm, setDiscForm] = useState<Omit<DiscountType, 'id'>>({
    name: '', type: 'percentage', value: 0, isActive: true,
  });

  const openCourtEdit = (courtId: string) => {
    const court = courts.find((c) => c.id === courtId);
    if (!court) return;
    setCourtForm({ name: court.name, hourlyRate: court.hourlyRate });
    setEditCourtId(courtId);
  };

  const saveCourtEdit = () => {
    if (!editCourtId) return;
    updateCourt(editCourtId, { name: courtForm.name, hourlyRate: courtForm.hourlyRate });
    setEditCourtId(null);
  };

  const openDiscountEdit = (d: DiscountType) => {
    setEditDiscount(d);
    setDiscForm({ name: d.name, type: d.type, value: d.value, isActive: d.isActive });
    setDiscountModal(true);
  };

  const openNewDiscount = () => {
    setEditDiscount(null);
    setDiscForm({ name: '', type: 'percentage', value: 0, isActive: true });
    setDiscountModal(true);
  };

  const saveDiscount = () => {
    if (editDiscount) {
      updateDiscountType(editDiscount.id, discForm);
    } else {
      addDiscountType(discForm);
    }
    setDiscountModal(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Manage courts, discounts, and app configuration</p>
      </div>

      {/* App Settings */}
      <section className="card space-y-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon size={16} className="text-[#0F5132]" />
          App Settings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Facility Name</label>
            <input
              value={settings.facilityName}
              onChange={(e) => updateSettings({ facilityName: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Current User</label>
            <input
              value={settings.currentUser}
              onChange={(e) => updateSettings({ currentUser: e.target.value })}
              className="input"
            />
          </div>
        </div>
      </section>

      {/* Court Management */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <MapPin size={16} className="text-[#0F5132]" />
            Court Management
          </h3>
          <button onClick={() => setCourtModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm py-2">
            <Plus size={15} /> Add Court
          </button>
        </div>
        <div className="space-y-3">
          {courts.map((court) => (
            <motion.div key={court.id} layout className="border border-gray-100 rounded-xl p-4">
              {editCourtId === court.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Court Name</label>
                      <input
                        value={courtForm.name}
                        onChange={(e) => setCourtForm({ ...courtForm, name: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Hourly Rate (₹)</label>
                      <input
                        type="number"
                        value={courtForm.hourlyRate}
                        onChange={(e) => setCourtForm({ ...courtForm, hourlyRate: parseFloat(e.target.value) || 0 })}
                        className="input"
                        min={0}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveCourtEdit} className="btn-primary flex-1 py-2 text-sm">Save Changes</button>
                    <button onClick={() => setEditCourtId(null)} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        court.isMaintenanceMode ? 'bg-amber-400' :
                        court.isEnabled ? 'bg-emerald-500' : 'bg-gray-300'
                      }`} />
                      <span className="font-semibold text-gray-900">{court.name}</span>
                      {court.isMaintenanceMode && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Maintenance</span>}
                      {!court.isEnabled && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Disabled</span>}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{formatCurrency(court.hourlyRate)}/hour</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Maintenance Toggle */}
                    <button
                      onClick={() => updateCourt(court.id, {
                        isMaintenanceMode: !court.isMaintenanceMode,
                        status: !court.isMaintenanceMode ? 'maintenance' : 'available',
                      })}
                      title="Toggle Maintenance Mode"
                      className={`p-2 rounded-lg transition-colors ${
                        court.isMaintenanceMode ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500 hover:bg-amber-50'
                      }`}
                    >
                      <Wrench size={15} />
                    </button>
                    {/* Enable/Disable */}
                    <button
                      onClick={() => updateCourt(court.id, {
                        isEnabled: !court.isEnabled,
                        status: !court.isEnabled ? 'available' : 'disabled',
                      })}
                      title="Enable/Disable Court"
                      className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      {court.isEnabled ? <ToggleRight size={15} className="text-emerald-600" /> : <ToggleLeft size={15} />}
                    </button>
                    {/* Edit */}
                    <button
                      onClick={() => openCourtEdit(court.id)}
                      className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => { if (confirm(`Are you sure you want to delete ${court.name}?`)) deleteCourt(court.id); }}
                      title="Delete Court"
                      className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Discount Types */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Tag size={16} className="text-[#0F5132]" />
            Discount Types
          </h3>
          <button onClick={openNewDiscount} className="btn-primary flex items-center gap-2 text-sm py-2">
            <Plus size={15} /> Add
          </button>
        </div>
        <div className="space-y-2">
          {discounts.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${d.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                  <p className="text-xs text-gray-500">
                    {d.type === 'percentage' ? `${d.value}% off` : `₹${d.value} off`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateDiscountType(d.id, { isActive: !d.isActive })}
                  className={`p-1.5 rounded-lg transition-colors ${d.isActive ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-50'}`}
                >
                  {d.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                </button>
                <button onClick={() => openDiscountEdit(d)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => deleteDiscountType(d.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* System Reset Section */}
      <section className="card border-red-100 bg-red-50/20 space-y-4">
        <h3 className="font-bold text-red-900 flex items-center gap-2">
          <Trash2 size={16} className="text-red-600" />
          System Maintenance
        </h3>
        <p className="text-sm text-gray-600">
          Reset all stored data including active bookings, invoices, point-of-sale tabs, and inventory adjustments back to a clean state.
        </p>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="btn-danger w-full sm:w-auto px-6 py-2.5 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Trash2 size={16} /> Clear All Local Data
        </button>
      </section>

      {/* Discount Modal */}
      {discountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDiscountModal(false)} />
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm z-10"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{editDiscount ? 'Edit Discount' : 'New Discount'}</h3>
              <button onClick={() => setDiscountModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Discount Name</label>
                <input value={discForm.name} onChange={(e) => setDiscForm({ ...discForm, name: e.target.value })} className="input" placeholder="e.g. Friends & Family" />
              </div>
              <div>
                <label className="label">Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDiscForm({ ...discForm, type: 'percentage' })}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${discForm.type === 'percentage' ? 'bg-[#0F5132] text-white border-[#0F5132]' : 'border-gray-200 text-gray-700 hover:border-[#0F5132]'}`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    onClick={() => setDiscForm({ ...discForm, type: 'fixed' })}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${discForm.type === 'fixed' ? 'bg-[#0F5132] text-white border-[#0F5132]' : 'border-gray-200 text-gray-700 hover:border-[#0F5132]'}`}
                  >
                    Fixed (₹)
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Value {discForm.type === 'percentage' ? '(%)' : '(₹)'}</label>
                <input type="number" value={discForm.value} onChange={(e) => setDiscForm({ ...discForm, value: parseFloat(e.target.value) || 0 })} className="input" min={0} max={discForm.type === 'percentage' ? 100 : undefined} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDiscountModal(false)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={saveDiscount} className="btn-primary flex-1" disabled={!discForm.name}>{editDiscount ? 'Update' : 'Add'}</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowResetConfirm(false)} />
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm z-10 text-center"
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-red-600">
              <Trash2 size={24} />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Reset All Data?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This action will clear all local storage information, resetting active bookings, court bills, activities, and settings to their default empty states. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="btn-ghost flex-1">Cancel</button>
              <button
                onClick={() => {
                  clearAllData();
                  setShowResetConfirm(false);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl flex-1 text-sm transition-colors"
              >
                Yes, Reset Everything
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Court Modal */}
      {courtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCourtModalOpen(false)} />
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm z-10"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">Add New Court</h3>
              <button onClick={() => setCourtModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Court Name</label>
                <input
                  value={newCourtForm.name}
                  onChange={(e) => setNewCourtForm({ ...newCourtForm, name: e.target.value })}
                  className="input"
                  placeholder="e.g. Court 4"
                  required
                />
              </div>
              <div>
                <label className="label">Hourly Rate (₹)</label>
                <input
                  type="number"
                  value={newCourtForm.hourlyRate}
                  onChange={(e) => setNewCourtForm({ ...newCourtForm, hourlyRate: parseFloat(e.target.value) || 0 })}
                  className="input"
                  min={0}
                  required
                />
              </div>
              <div>
                <label className="label">Color Accent</label>
                <select
                  value={newCourtForm.color}
                  onChange={(e) => setNewCourtForm({ ...newCourtForm, color: e.target.value })}
                  className="input"
                >
                  <option value="#0F5132">Dark Green</option>
                  <option value="#166534">Medium Green</option>
                  <option value="#10B981">Emerald Green</option>
                  <option value="#3B82F6">Blue</option>
                  <option value="#8B5CF6">Purple</option>
                  <option value="#EC4899">Pink</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCourtModalOpen(false)} className="btn-ghost flex-1">Cancel</button>
                <button
                  onClick={async () => {
                    await addCourt(newCourtForm);
                    setCourtModalOpen(false);
                    setNewCourtForm({ name: '', hourlyRate: 500, color: '#0F5132' });
                  }}
                  className="btn-primary flex-1"
                  disabled={!newCourtForm.name}
                >
                  Add Court
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
