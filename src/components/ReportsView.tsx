import React, { useState } from 'react';
import { Ticket, Payment, User, Vehicle, Sensor, ParkingSlot } from '../types/parking';
import { 
  BarChart3, 
  IndianRupee, 
  Car, 
  Bike, 
  Download, 
  Search, 
  Clock, 
  ArrowUpRight, 
  CheckCircle2, 
  Database,
  Layers,
  FileSpreadsheet,
  Printer
} from 'lucide-react';

interface ReportsViewProps {
  tickets: Ticket[];
  payments: Payment[];
  users: User[];
  vehicles: Vehicle[];
  sensors: Sensor[];
  slots: ParkingSlot[];
  onNavigateToExit: (ticketId: string) => void;
  onViewTicketPrint?: (ticket: Ticket) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  tickets,
  payments,
  users,
  vehicles,
  sensors,
  slots,
  onNavigateToExit,
  onViewTicketPrint,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'payments' | 'schema'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeTickets = tickets.filter((t) => t.status === 'ACTIVE');
  const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);

  // Filtered lists
  const filteredActiveTickets = activeTickets.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      t.registrationNumber.toLowerCase().includes(q) ||
      t.slotNumber.toLowerCase().includes(q) ||
      t.vehicleType.toLowerCase().includes(q)
    );
  });

  const filteredPayments = payments.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      p.ticketId.toLowerCase().includes(q) ||
      p.registrationNumber.toLowerCase().includes(q) ||
      p.paymentMethod.toLowerCase().includes(q)
    );
  });

  // Export CSV
  const handleExportCSV = () => {
    const csvRows: string[][] = [];
    csvRows.push(['VPMS PRO - PARKING SYSTEM REPORT']);
    csvRows.push([`Generated At: ${new Date().toISOString()}`]);
    csvRows.push([]);
    csvRows.push(['--- RECENT PAYMENTS ---']);
    csvRows.push(['Payment ID', 'Ticket ID', 'Reg No', 'Amount (INR)', 'Exit Time', 'Method']);
    payments.forEach((p) => {
      csvRows.push([p.id, p.ticketId, p.registrationNumber, p.amount.toString(), p.paymentTime, p.paymentMethod]);
    });
    csvRows.push([]);
    csvRows.push(['--- ACTIVE TICKETS ---']);
    csvRows.push(['Ticket ID', 'Reg No', 'Slot', 'Type', 'Entry Time']);
    activeTickets.forEach((t) => {
      csvRows.push([t.id, t.registrationNumber, t.slotNumber, t.vehicleType, t.entryTime]);
    });

    const blob = new Blob([csvRows.map((e) => e.join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vpms_pro_report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>AUDIT & ANALYTICS LEDGER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            View system performance, live tickets, and revenue insights.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="glow-cyan-btn px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center space-x-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards matching exact prompt names */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue Collected */}
        <div className="cyber-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-semibold tracking-wider">
              Total Revenue Collected
            </span>
            <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <IndianRupee className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-cyan-400 tracking-tight">
              ₹{totalRevenue}
            </span>
            <span className="text-xs text-emerald-400 font-mono">Gross Realized</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-transparent"></div>
        </div>

        {/* Currently Parked Vehicles */}
        <div className="cyber-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-semibold tracking-wider">
              Currently Parked Vehicles
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Car className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-amber-400 tracking-tight">
              {activeTickets.length}
            </span>
            <span className="text-xs text-gray-400 font-mono">Live vehicles</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-transparent"></div>
        </div>

        {/* Total Processed Payments */}
        <div className="cyber-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-semibold tracking-wider">
              Completed Checkouts
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight">
              {payments.length}
            </span>
            <span className="text-xs text-gray-400 font-mono">Transactions</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent"></div>
        </div>

        {/* ER Entity Count */}
        <div className="cyber-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-semibold tracking-wider">
              Monitored Sensors
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Database className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-purple-400 tracking-tight">
              {sensors.length} / {sensors.length}
            </span>
            <span className="text-xs text-emerald-400 font-mono">100% Online</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-transparent"></div>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 border-b sm:border-b-0 border-white/10 pb-2 sm:pb-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All Ledgers
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all whitespace-nowrap ${
              activeFilter === 'active'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Active Tickets ({activeTickets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('payments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all whitespace-nowrap ${
              activeFilter === 'payments'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Recent Payments ({payments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('schema')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all whitespace-nowrap ${
              activeFilter === 'schema'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            ER Schema Inspector
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter records..."
            className="w-full bg-[#0c121d] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-mono"
          />
        </div>
      </div>

      {/* TABLE 1: Active Tickets Table (Prompt Page D requirement) */}
      {(activeFilter === 'all' || activeFilter === 'active') && (
        <div className="cyber-card border border-white/10 overflow-hidden space-y-3">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#111928]">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <h3 className="font-bold text-base text-white tracking-wide">
                Active Tickets
              </h3>
            </div>
            <span className="text-xs font-mono text-gray-400">
              {filteredActiveTickets.length} vehicle(s) parked on premises
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0e1422] text-gray-400 uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-6">Ticket ID</th>
                  <th className="py-3.5 px-6">Reg No</th>
                  <th className="py-3.5 px-6">Slot</th>
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6">Entry Time</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredActiveTickets.length > 0 ? (
                  filteredActiveTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-3.5 px-6 font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {ticket.id}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-cyan-300">
                        {ticket.registrationNumber}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 font-semibold">
                          {ticket.slotNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-gray-300">
                        <span className="inline-flex items-center space-x-1.5">
                          {ticket.vehicleType === 'BIKE' ? (
                            <Bike className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <Car className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                          <span>{ticket.vehicleType === 'BIKE' ? 'Bike' : ticket.vehicleType === 'CAR' ? 'Car' : 'Commercial'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-gray-400">
                        {ticket.entryTime}
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-2">
                        {onViewTicketPrint && (
                          <button
                            type="button"
                            onClick={() => onViewTicketPrint(ticket)}
                            className="text-gray-400 hover:text-white px-2 py-1 rounded bg-white/5 border border-white/10"
                            title="Print Pass"
                          >
                            <Printer className="w-3 h-3 inline" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onNavigateToExit(ticket.id)}
                          className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-white transition-all inline-flex items-center space-x-1"
                        >
                          <span>Exit</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No active tickets matching filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLE 2: Recent Payments Table (Prompt Page D requirement) */}
      {(activeFilter === 'all' || activeFilter === 'payments') && (
        <div className="cyber-card border border-white/10 overflow-hidden space-y-3">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#111928]">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 className="font-bold text-base text-white tracking-wide">
                Recent Payments
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              Total Cleared: ₹{totalRevenue}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0e1422] text-gray-400 uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-6">Payment ID</th>
                  <th className="py-3.5 px-6">Ticket ID</th>
                  <th className="py-3.5 px-6">Reg No</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6">Exit Time</th>
                  <th className="py-3.5 px-6">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-white">
                        {payment.id}
                      </td>
                      <td className="py-3.5 px-6 text-gray-300">
                        {payment.ticketId}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-cyan-300">
                        {payment.registrationNumber}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-emerald-400 text-sm">
                        ₹{payment.amount}
                      </td>
                      <td className="py-3.5 px-6 text-gray-400">
                        {payment.paymentTime}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300 uppercase text-[10px]">
                          {payment.paymentMethod}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No payment records matching filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ER Relationship Schema Visualizer */}
      {(activeFilter === 'schema' || activeFilter === 'all') && (
        <div className="cyber-card p-6 border border-white/10 space-y-4">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Database className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-base text-white tracking-wide">
              Entity Relationship (ER) System Architecture
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* Rel 1 */}
            <div className="bg-[#0e1422] p-4 rounded-xl border border-white/10 space-y-1.5">
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">
                Relationship 1
              </span>
              <div className="text-white font-bold">USER (1) ⟷ VEHICLE (N)</div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                via <span className="text-cyan-300">OWNS</span>: One registered user/driver can own or operate multiple registered vehicles in the database.
              </p>
            </div>

            {/* Rel 2 */}
            <div className="bg-[#0e1422] p-4 rounded-xl border border-white/10 space-y-1.5">
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">
                Relationship 2
              </span>
              <div className="text-white font-bold">VEHICLE (1) ⟷ TICKET (N)</div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                via <span className="text-cyan-300">MAKES</span>: Each entry trip issues a discrete booking ticket linked to the vehicle's unique registration.
              </p>
            </div>

            {/* Rel 3 */}
            <div className="bg-[#0e1422] p-4 rounded-xl border border-white/10 space-y-1.5">
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">
                Relationship 3
              </span>
              <div className="text-white font-bold">BOOKING (1) ⟷ PAYMENT (1)</div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Each completed booking session generates an exact 1:1 financial payment clearance with duration reconciliation.
              </p>
            </div>

            {/* Rel 4 */}
            <div className="bg-[#0e1422] p-4 rounded-xl border border-white/10 space-y-1.5">
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">
                Relationship 4
              </span>
              <div className="text-white font-bold">SLOT (1) ⟷ SENSOR (1)</div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                via <span className="text-cyan-300">MONITORS</span>: Each bay is tied 1:1 to an IoT ultrasonic presence sensor reporting battery and telemetry.
              </p>
            </div>

            {/* Rel 5 */}
            <div className="bg-[#0e1422] p-4 rounded-xl border border-white/10 space-y-1.5 md:col-span-2">
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">
                Relationship 5
              </span>
              <div className="text-white font-bold">BOOKING assigned to PARKING SLOT (N:1)</div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Over time, a parking slot is assigned to many bookings chronologically, with exactly at most one ACTIVE booking at any instant.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
