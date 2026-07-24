// src/pages/Tournaments.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Plus, Calendar, UserPlus, Trash2, ShoppingCart, CreditCard,
  Download, Clock, AlertTriangle, FileSpreadsheet, X
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/utils';
import type { Tournament, TournamentTabItem, TournamentPayment, TournamentParticipant } from '@/types';

// Helper to generate CSV content for a tournament
function generateTournamentCSV(t: Tournament): string {
  const lines: string[] = [];

  // Title Info
  lines.push(`TOURNAMENT REPORT: ${t.name.toUpperCase()}`);
  lines.push(`Start Date: ${new Date(t.startDate).toLocaleString('en-IN')}`);
  lines.push(`End Date: ${new Date(t.endDate).toLocaleString('en-IN')}`);
  lines.push(`Entry Fee per Player/Team: Rs. ${t.entryFee}`);
  lines.push('');

  // 1. PARTICIPANTS SUMMARY
  lines.push('--- PARTICIPANTS & REVENUE BREAKDOWN ---');
  lines.push('Participant ID,Name,Phone,Entry Fee,Food & Drink Cost,Total Due,Total Paid,Remaining Balance,Payment Status');

  let totalRevenue = 0;
  let totalPayments = 0;

  t.participants.forEach((p: TournamentParticipant) => {
    const tab = t.tabs.find((x: any) => x.participantName === p.name);
    const foodCost = tab ? tab.items.reduce((s: number, i: TournamentTabItem) => s + i.quantity * i.unitPrice, 0) : 0;
    const totalDue = Number(t.entryFee) + foodCost;
    
    // Sum payments for this participant
    const participantPaid = t.payments
      .filter((pay: TournamentPayment) => pay.notes?.includes(`for ${p.name}`) || pay.notes === p.name)
      .reduce((s: number, pay: TournamentPayment) => s + Number(pay.amount), 0);

    const balance = totalDue - participantPaid;
    const status = balance <= 0 ? 'Paid' : participantPaid > 0 ? 'Partially Paid' : 'Unpaid';

    lines.push(`${p.id},"${p.name}","${p.phone || ''}",${t.entryFee},${foodCost},${totalDue},${participantPaid},${balance},${status}`);
    
    totalRevenue += totalDue;
    totalPayments += participantPaid;
  });

  lines.push(`,,,TOTALS,,Rs. ${totalRevenue},Rs. ${totalPayments},Rs. ${totalRevenue - totalPayments},`);
  lines.push('');

  // 2. DETAILED FOOD & DRINK ORDERS
  lines.push('--- FOOD & DRINK TAB ORDERS ---');
  lines.push('Player/Team,Item Name,Quantity,Unit Price,Subtotal');

  t.tabs.forEach((tab: any) => {
    tab.items.forEach((item: TournamentTabItem) => {
      lines.push(`"${tab.participantName}","${item.name}",${item.quantity},${item.unitPrice},${item.quantity * item.unitPrice}`);
    });
  });
  lines.push('');

  // 3. PAYMENT TRANSACTIONS
  lines.push('--- PAYMENT TRANSACTIONS LOG ---');
  lines.push('Payment ID,Amount,Payment Method,Allocated to,Date,Notes');

  t.payments.forEach((p: TournamentPayment) => {
    lines.push(`${p.id},${p.amount},${p.paymentMethod.toUpperCase()},"${p.notes || 'Global'}",${new Date(p.createdAt).toLocaleString('en-IN')},"${p.notes || ''}"`);
  });

  return lines.join('\n');
}

// Function to trigger the CSV file download
function downloadCSV(t: Tournament) {
  try {
    const csvContent = generateTournamentCSV(t);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tournament_${t.name.replace(/\s+/g, '_')}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error('Failed to export tournament report:', e);
  }
}

export default function Tournaments() {
  const {
    tournaments, createTournament, updateTournament, deleteTournament,
    addTournamentParticipant, removeTournamentParticipant,
    addTournamentTabItem, removeTournamentTabItem, addTournamentPayment,
    inventory
  } = useStore();

  const [activeTab, setActiveTab] = useState<'active' | 'revenue'>('active');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  
  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [orderItemOpen, setOrderItemOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  // Forms state
  const [newTForm, setNewTForm] = useState({ name: '', startDate: '', endDate: '', entryFee: 1000 });
  const [participantForm, setParticipantForm] = useState({ name: '', phone: '' });
  const [selectedParticipantName, setSelectedParticipantName] = useState('');
  const [orderForm, setOrderForm] = useState({ itemId: '', quantity: 1 });
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'cash' as 'cash' | 'upi' | 'card', participant: '' });

  // ─────────────────────────────────────────────────────────────
  // AUTOMATED RETENTION CLEANUP JOB
  // Runs on component mount. Checks if any tournament ended more than 3 days ago.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const runCleanup = async () => {
      const now = new Date();
      for (const t of tournaments) {
        const endDate = new Date(t.endDate);
        // Compute difference in days
        const diffMs = now.getTime() - endDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        // If ended more than 3 days (72 hours) ago
        if (diffDays > 3) {
          console.log(`[AUTOMATED CLEANUP] Tournament "${t.name}" ended ${diffDays.toFixed(1)} days ago. Deleting permanently...`);
          await deleteTournament(t.id);
        }
      }
    };
    runCleanup();
  }, [tournaments, deleteTournament]);

  // Sync selected tournament changes in real-time
  const tDetails = selectedTournament ? tournaments.find((x: Tournament) => x.id === selectedTournament.id) || null : null;

  // Filter tournaments
  const now = new Date();
  const activeTournaments = tournaments.filter((t: Tournament) => new Date(t.endDate) >= now);
  const endedTournaments = tournaments.filter((t: Tournament) => new Date(t.endDate) < now);

  const getTournamentTotals = (t: Tournament) => {
    const totalEntryFee = t.participants.length * t.entryFee;
    const totalTabCost = t.tabs.reduce((sum: number, tab: any) => {
      return sum + tab.items.reduce((s: number, item: TournamentTabItem) => s + item.quantity * item.unitPrice, 0);
    }, 0);
    const totalAmount = totalEntryFee + totalTabCost;
    const totalPaid = t.payments.reduce((sum: number, p: TournamentPayment) => sum + Number(p.amount), 0);
    const balance = totalAmount - totalPaid;
    const status = balance <= 0 ? 'Paid' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid';

    return { totalEntryFee, totalTabCost, totalAmount, totalPaid, balance, status };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Tournament Management</h2>
          <p className="text-sm text-gray-500">Run events, track running tabs, and manage revenues separately</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="btn-primary flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} /> Create Tournament
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('active'); setSelectedTournament(null); }}
          className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'active'
              ? 'border-[#0F5132] text-[#0F5132]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Active Tournaments ({activeTournaments.length})
        </button>
        <button
          onClick={() => { setActiveTab('revenue'); setSelectedTournament(null); }}
          className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'revenue'
              ? 'border-[#0F5132] text-[#0F5132]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Tournament Revenue & Reports ({endedTournaments.length})
        </button>
      </div>

      {activeTab === 'active' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Tournament List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Active Events</h3>
            {activeTournaments.map((t: Tournament) => {
              const { totalAmount, totalPaid, balance, status } = getTournamentTotals(t);
              const isSelected = selectedTournament?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTournament(t)}
                  className={`card cursor-pointer transition-all border-2 ${
                    isSelected ? 'border-[#0F5132] bg-emerald-50/10 shadow-md' : 'border-transparent hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900">{t.name}</h4>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Calendar size={12} />
                        Ends {new Date(t.endDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <Trophy size={20} className={isSelected ? 'text-[#0F5132]' : 'text-gray-300'} />
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Total Bill</span>
                      <p className="font-bold text-gray-800">{formatCurrency(totalAmount)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Balance Due</span>
                      <p className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {formatCurrency(balance)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-semibold">{t.participants.length} players/teams</span>
                    <span className={`badge ${
                      status === 'Paid' ? 'badge-available' :
                      status === 'Partially Paid' ? 'badge-maintenance' : 'badge-occupied'
                    }`}>
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}
            {activeTournaments.length === 0 && (
              <div className="card text-center p-8 text-gray-400">
                <Trophy size={32} className="mx-auto mb-2 text-gray-200" />
                <p className="text-xs font-semibold">No active tournaments</p>
                <p className="text-[10px] mt-0.5">Click "Create Tournament" above to start.</p>
              </div>
            )}
          </div>

          {/* Active Tournament Details Panel */}
          <div className="lg:col-span-2">
            {tDetails ? (
              <div className="card space-y-6">
                <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                  <div>
                    <span className="badge badge-available uppercase tracking-wider text-[10px]">Active</span>
                    <h3 className="text-xl font-black text-gray-900 mt-1">{tDetails.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Event Schedule: {new Date(tDetails.startDate).toLocaleString('en-IN')} — {new Date(tDetails.endDate).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadCSV(tDetails)}
                    className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                    title="Export report CSV"
                  >
                    <Download size={14} /> Report
                  </button>
                </div>

                {/* Financial Summary */}
                {(() => {
                  const { totalEntryFee, totalTabCost, totalAmount, totalPaid, balance, status } = getTournamentTotals(tDetails);
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 rounded-2xl p-4">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Total Entry Fees</span>
                        <p className="text-lg font-black text-gray-900 mt-0.5">{formatCurrency(totalEntryFee)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Food & Drinks Tab</span>
                        <p className="text-lg font-black text-gray-900 mt-0.5">{formatCurrency(totalTabCost)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Total Paid</span>
                        <p className="text-lg font-black text-emerald-600 mt-0.5">{formatCurrency(totalPaid)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Balance Due</span>
                        <p className={`text-lg font-black mt-0.5 ${balance > 0 ? 'text-red-600 animate-pulse' : 'text-emerald-700'}`}>
                          {formatCurrency(balance)}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Participants & Tabs List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 text-sm">Player/Team Running Tabs</h4>
                    <button
                      onClick={() => setAddParticipantOpen(true)}
                      className="btn-secondary py-1.5 px-2.5 text-xs flex items-center gap-1 text-[#0F5132] font-semibold cursor-pointer"
                    >
                      <Plus size={14} /> Add Player/Team
                    </button>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 bg-white">
                    {tDetails.participants.map((p: TournamentParticipant) => {
                      const tab = tDetails.tabs.find((x: any) => x.participantName === p.name);
                      const foodCost = tab ? tab.items.reduce((s: number, i: TournamentTabItem) => s + i.quantity * i.unitPrice, 0) : 0;
                      const totalDue = tDetails.entryFee + foodCost;
                      
                      const paid = tDetails.payments
                        .filter((pay: TournamentPayment) => pay.notes === p.name)
                        .reduce((s: number, pay: TournamentPayment) => s + Number(pay.amount), 0);
                        
                      const balance = totalDue - paid;
                      const status = balance <= 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid';

                      return (
                        <div key={p.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800 text-sm">{p.name}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                                status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' :
                                'bg-red-100 text-red-800'
                              }`}>{status}</span>
                            </div>
                            {p.phone && <p className="text-[10px] text-gray-400">{p.phone}</p>}
                            
                            {/* Tab items display */}
                            {tab && tab.items.length > 0 && (
                              <div className="text-[11px] text-gray-500 bg-gray-50/55 p-2 rounded-lg mt-1 border border-gray-100/50">
                                <span className="font-semibold block text-[10px] text-gray-400">Ordered items:</span>
                                {tab.items.map((item: TournamentTabItem, idx: number) => (
                                  <span key={idx} className="inline-block bg-white border border-gray-150 px-1.5 py-0.5 rounded mr-1 mt-1 text-[10px]">
                                    {item.name} x{item.quantity} ({formatCurrency(item.quantity * item.unitPrice)})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4 justify-between md:justify-end text-xs">
                            <div className="text-right space-y-0.5">
                              <p className="text-[10px] text-gray-400">Total: {formatCurrency(totalDue)}</p>
                              <p className="text-[10px] text-emerald-600">Paid: {formatCurrency(paid)}</p>
                              <p className="font-bold text-gray-700">Due: {formatCurrency(balance)}</p>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Order Button */}
                              <button
                                onClick={() => {
                                  setSelectedParticipantName(p.name);
                                  setOrderItemOpen(true);
                                  setOrderForm({ itemId: '', quantity: 1 });
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 cursor-pointer"
                                title="Add drinks/snacks"
                              >
                                <ShoppingCart size={13} />
                              </button>
                              {/* Pay Button */}
                              {balance > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedParticipantName(p.name);
                                    setPaymentOpen(true);
                                    setPaymentForm({ amount: balance, method: 'cash', participant: p.name });
                                  }}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100 cursor-pointer"
                                  title="Log Payment"
                                >
                                  <CreditCard size={13} />
                                </button>
                              )}
                              {/* Remove Team Button */}
                              <button
                                onClick={() => removeTournamentParticipant(tDetails.id, p.id)}
                                className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Remove team"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {tDetails.participants.length === 0 && (
                      <div className="p-8 text-center text-gray-400 text-xs">
                        No players or teams registered in this event yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Payments Log */}
                <div className="space-y-2 border-t border-gray-150 pt-4">
                  <h4 className="font-bold text-gray-900 text-sm">Payments Log</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {tDetails.payments.map((p: TournamentPayment) => (
                      <div key={p.id} className="flex justify-between items-center text-xs p-2.5 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-bold text-gray-800">{formatCurrency(p.amount)} via {p.paymentMethod.toUpperCase()}</p>
                          <p className="text-[10px] text-gray-400">Allocated for: {p.notes}</p>
                        </div>
                        <span className="text-[10px] text-gray-400">{new Date(p.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    ))}
                    {tDetails.payments.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">No payments received yet.</p>
                    )}
                  </div>
                </div>

                {/* Delete Event Button */}
                <div className="pt-4 border-t border-gray-150 flex justify-end">
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to permanently delete tournament "${tDetails.name}"?`)) {
                        deleteTournament(tDetails.id);
                        setSelectedTournament(null);
                      }
                    }}
                    className="btn-danger py-2 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={14} /> Delete Event
                  </button>
                </div>
              </div>
            ) : (
              <div className="card text-center p-16 text-gray-400 border-2 border-dashed border-gray-250">
                <Trophy size={48} className="mx-auto mb-3 text-gray-200" />
                <p className="font-bold text-gray-600">Select an Event</p>
                <p className="text-xs mt-1 text-gray-400 max-w-sm mx-auto">
                  Click on an active tournament card from the sidebar to view running tabs, participants, and payments.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Ended Tournaments & Dedicated Revenue Page */
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <Clock size={20} className="text-[#0F5132] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-emerald-800 text-sm">Tournament Revenue Exclusivity & Retention Policy</p>
              <p className="text-emerald-700 text-xs mt-0.5">
                All tournament funds are isolated and excluded from daily dashboard business stats. 
                Ended tournaments are retained for a <strong>maximum of 3 days</strong>. 
                During this period, only the name and revenue summary are displayed (details are hidden). 
                After 3 days, records are permanently deleted (be sure to manually export the Excel report within this 3 days timespan if needed).
              </p>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tournament Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">End Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Revenue Due</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Paid</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unpaid Balance</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Retention Left</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {endedTournaments.map((t: Tournament) => {
                    const { totalAmount, totalPaid, balance } = getTournamentTotals(t);
                    const endDate = new Date(t.endDate);
                    const timeSinceEnd = new Date().getTime() - endDate.getTime();
                    const hoursLeft = Math.max(0, 72 - timeSinceEnd / (1000 * 60 * 60));
                    
                    return (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-bold text-gray-900 block">{t.name}</span>
                            <span className="text-[9px] text-red-500 bg-red-50 font-bold px-1.5 py-0.5 rounded">DETAILS LOCKED</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {endDate.toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatCurrency(totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-semibold">
                          {formatCurrency(totalPaid)}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${balance > 0 ? 'text-red-500' : 'text-emerald-700'}`}>
                          {formatCurrency(balance)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="badge badge-occupied text-xs">
                            {hoursLeft > 24 ? `${Math.round(hoursLeft / 24)} days` : `${Math.round(hoursLeft)} hours`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => downloadCSV(t)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-100 rounded-lg transition-colors flex items-center gap-1 text-xs cursor-pointer"
                              title="Export Detailed Excel Report"
                            >
                              <FileSpreadsheet size={13} /> Export Excel
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Permanently delete tournament "${t.name}" now?`)) {
                                  deleteTournament(t.id);
                                }
                              }}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete immediately"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {endedTournaments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400 text-xs">
                        No archived/ended tournaments in the 3-day retention buffer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TOURNAMENT MODAL */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setCreateModalOpen(false)} />
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-base">Create New Tournament</h3>
                <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={18} /></button>
              </div>

              <div>
                <label className="label">Tournament Name</label>
                <input
                  value={newTForm.name}
                  onChange={e => setNewTForm({ ...newTForm, name: e.target.value })}
                  placeholder="e.g. Monsoon Badminton Championship"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newTForm.startDate}
                    onChange={e => setNewTForm({ ...newTForm, startDate: e.target.value })}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newTForm.endDate}
                    onChange={e => setNewTForm({ ...newTForm, endDate: e.target.value })}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="label">Entry Fee per Player/Team (Rs.)</label>
                <input
                  type="number"
                  value={newTForm.entryFee}
                  onChange={e => setNewTForm({ ...newTForm, entryFee: parseInt(e.target.value) || 0 })}
                  className="input"
                  min={0}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setCreateModalOpen(false)} className="btn-ghost flex-1 cursor-pointer">Cancel</button>
                <button
                  onClick={() => {
                    if (!newTForm.name || !newTForm.startDate || !newTForm.endDate) return alert('Fill all fields');
                    createTournament(newTForm.name, newTForm.startDate, newTForm.endDate, newTForm.entryFee);
                    setCreateModalOpen(false);
                    setNewTForm({ name: '', startDate: '', endDate: '', entryFee: 1000 });
                  }}
                  className="btn-primary flex-1 cursor-pointer"
                >
                  Create Tournament
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD PARTICIPANT MODAL */}
      <AnimatePresence>
        {addParticipantOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setAddParticipantOpen(false)} />
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm z-10 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm">Add Player / Team</h3>
                <button onClick={() => setAddParticipantOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
              </div>

              <div>
                <label className="label">Player or Team Name</label>
                <input
                  value={participantForm.name}
                  onChange={e => setParticipantForm({ ...participantForm, name: e.target.value })}
                  placeholder="e.g. Smashers Club"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Contact Phone</label>
                <input
                  value={participantForm.phone}
                  onChange={e => setParticipantForm({ ...participantForm, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setAddParticipantOpen(false)} className="btn-ghost flex-1 cursor-pointer">Cancel</button>
                <button
                  onClick={() => {
                    if (!participantForm.name) return;
                    if (tDetails) {
                      // Check for duplicates
                      if (tDetails.participants.some((x: any) => x.name.toLowerCase() === participantForm.name.toLowerCase())) {
                        return alert('Participant name already exists!');
                      }
                      addTournamentParticipant(tDetails.id, participantForm.name, participantForm.phone);
                    }
                    setAddParticipantOpen(false);
                    setParticipantForm({ name: '', phone: '' });
                  }}
                  className="btn-primary flex-1 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD TAB ITEM (DRINKS & SNACKS) MODAL */}
      <AnimatePresence>
        {orderItemOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setOrderItemOpen(false)} />
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm z-10 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Add to Tab</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Player: {selectedParticipantName}</p>
                </div>
                <button onClick={() => setOrderItemOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
              </div>

              <div>
                <label className="label">Select Drink/Snack</label>
                <select
                  value={orderForm.itemId}
                  onChange={e => setOrderForm({ ...orderForm, itemId: e.target.value })}
                  className="input"
                >
                  <option value="">-- Choose Item --</option>
                  {inventory.map(i => (
                    <option key={i.id} value={i.id} disabled={i.stock === 0}>
                      {i.name} — Rs.{i.sellingPrice} ({i.stock} left)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Quantity</label>
                <input
                  type="number"
                  value={orderForm.quantity}
                  onChange={e => setOrderForm({ ...orderForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="input"
                  min={1}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setOrderItemOpen(false)} className="btn-ghost flex-1 cursor-pointer">Cancel</button>
                <button
                  onClick={() => {
                    const item = inventory.find(i => i.id === orderForm.itemId);
                    if (!item) return alert('Select an item');
                    if (item.stock < orderForm.quantity) return alert('Not enough stock available!');
                    
                    if (tDetails) {
                      addTournamentTabItem(tDetails.id, selectedParticipantName, {
                        name: item.name,
                        quantity: orderForm.quantity,
                        unitPrice: item.sellingPrice
                      }, item.id);
                    }
                    setOrderItemOpen(false);
                  }}
                  className="btn-primary flex-1 cursor-pointer"
                >
                  Add to Bill
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECORD PAYMENT MODAL */}
      <AnimatePresence>
        {paymentOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setPaymentOpen(false)} />
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm z-10 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Log Partial Payment</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Player: {selectedParticipantName}</p>
                </div>
                <button onClick={() => setPaymentOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
              </div>

              <div>
                <label className="label">Amount (Rs.)</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="input"
                  min={1}
                />
              </div>

              <div>
                <label className="label">Payment Method</label>
                <select
                  value={paymentForm.method}
                  onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value as any })}
                  className="input"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / Online</option>
                  <option value="card">Debit / Credit Card</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setPaymentOpen(false)} className="btn-ghost flex-1 cursor-pointer">Cancel</button>
                <button
                  onClick={() => {
                    if (paymentForm.amount <= 0) return alert('Enter a valid amount');
                    if (tDetails) {
                      addTournamentPayment(tDetails.id, {
                        amount: paymentForm.amount,
                        paymentMethod: paymentForm.method,
                        notes: selectedParticipantName // Notes will store the player name to link payment
                      });
                    }
                    setPaymentOpen(false);
                  }}
                  className="btn-primary flex-1 cursor-pointer"
                >
                  Log Payment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
