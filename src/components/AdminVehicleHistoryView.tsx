import React, { useState, useMemo, useEffect } from 'react';
import { 
  Ticket, 
  Payment, 
  ParkingSlot, 
  Sensor, 
  VehicleType 
} from '../types/parking';
import { 
  ShieldCheck, 
  History, 
  Search, 
  Filter, 
  Download, 
  Car, 
  Bike, 
  Truck, 
  IndianRupee, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Printer, 
  Lock, 
  Layers, 
  ArrowUpRight, 
  Sparkles,
  RefreshCw,
  Cloud
} from 'lucide-react';
import { subscribeToAllBookings } from '../services/firebase';
import { FirebaseBooking } from '../types/parking';

interface VehicleHistoryItem {
  id: string; // Ticket ID
  registrationNumber: string;
  vehicleType: VehicleType;
  ownerName?: string;
  slotNumber: string;
  floor: number;
  entryTime: string;
  exitTime?: string;
  durationFormatted: string;
  status: 'ACTIVE' | 'COMPLETED';
  feePaid?: number;
  paymentMethod?: string;
  paymentId?: string;
  cloudStored?: boolean;
  userEmail?: string;
}

interface AdminVehicleHistoryViewProps {
  tickets: Ticket[];
  payments: Payment[];
  slots: ParkingSlot[];
  onViewTicketPrint?: (ticket: Ticket) => void;
  onNavigateToExit?: (ticketId: string) => void;
  onNavigateToDashboard?: () => void;
}

export const AdminVehicleHistoryView: React.FC<AdminVehicleHistoryViewProps> = ({
  tickets,
  payments,
  slots,
  onViewTicketPrint,
  onNavigateToExit,
  onNavigateToDashboard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | VehicleType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [floorFilter, setFloorFilter] = useState<'ALL' | '1' | '2'>('ALL');
  const [cloudBookings, setCloudBookings] = useState<FirebaseBooking[]>([]);

  // Subscribe to real-time Firestore bookings
  useEffect(() => {
    const unsubscribe = subscribeToAllBookings((list) => {
      setCloudBookings(list);
    });
    return () => unsubscribe();
  }, []);

  // Build merged chronological vehicle history list (Local + Firestore)
  const historyData: VehicleHistoryItem[] = useMemo(() => {
    const paymentMap = new Map<string, Payment>();
    payments.forEach((p) => {
      paymentMap.set(p.ticketId, p);
    });

    const cloudMap = new Map<string, FirebaseBooking>();
    cloudBookings.forEach((cb) => {
      cloudMap.set(cb.id, cb);
      cloudMap.set(cb.ticketNumber, cb);
    });

    const localItems: VehicleHistoryItem[] = tickets.map((t) => {
      const payment = paymentMap.get(t.id);
      const cloudMatch = cloudMap.get(t.id);
      return {
        id: t.id,
        registrationNumber: t.registrationNumber,
        vehicleType: t.vehicleType,
        ownerName: t.ownerName || cloudMatch?.userName,
        slotNumber: t.slotNumber,
        floor: t.floor,
        entryTime: t.entryTime,
        exitTime: t.exitTime || payment?.paymentTime || cloudMatch?.exitTime,
        durationFormatted: payment?.durationFormatted || 'Active in bay',
        status: (cloudMatch?.status === 'COMPLETED' || t.status === 'COMPLETED') ? 'COMPLETED' : 'ACTIVE',
        feePaid: payment?.amount || cloudMatch?.fee,
        paymentMethod: payment?.paymentMethod,
        paymentId: payment?.id,
        cloudStored: !!cloudMatch,
        userEmail: cloudMatch?.userEmail,
      };
    });

    // Also include any Firestore bookings that were created remotely
    const localIds = new Set(tickets.map((t) => t.id));
    const extraCloudItems: VehicleHistoryItem[] = [];

    cloudBookings.forEach((cb) => {
      if (!localIds.has(cb.id) && !localIds.has(cb.ticketNumber)) {
        extraCloudItems.push({
          id: cb.id,
          registrationNumber: cb.registrationNumber,
          vehicleType: cb.vehicleType,
          ownerName: cb.userName,
          slotNumber: cb.slotNumber,
          floor: cb.floor || 1,
          entryTime: cb.entryTime,
          exitTime: cb.exitTime,
          durationFormatted: cb.status === 'COMPLETED' ? 'Completed' : 'Active in bay',
          status: cb.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
          feePaid: cb.fee,
          paymentMethod: 'FIREBASE_ONLINE',
          cloudStored: true,
          userEmail: cb.userEmail,
        });
      }
    });

    return [...localItems, ...extraCloudItems].sort(
      (a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
    );
  }, [tickets, payments, cloudBookings]);

  // Filtered dataset
  const filteredHistory = useMemo(() => {
    return historyData.filter((item) => {
      if (typeFilter !== 'ALL' && item.vehicleType !== typeFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (floorFilter !== 'ALL' && item.floor.toString() !== floorFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.registrationNumber.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.slotNumber.toLowerCase().includes(q) ||
        (item.ownerName && item.ownerName.toLowerCase().includes(q)) ||
        (item.paymentId && item.paymentId.toLowerCase().includes(q))
      );
    });
  }, [historyData, searchQuery, typeFilter, statusFilter, floorFilter]);

  // Aggregate stats
  const totalVehiclesCount = historyData.length;
  const activeParkedCount = historyData.filter((i) => i.status === 'ACTIVE').length;
  const completedExitsCount = historyData.filter((i) => i.status === 'COMPLETED').length;
  const totalAuditedRevenue = payments.reduce((acc, p) => acc + p.amount, 0);

  // CSV export of parking history
  const handleExportHistoryCSV = () => {
    const rows: string[][] = [
      ['VPMS PRO - EXECUTIVE ADMIN VEHICLE PARKING HISTORY AUDIT'],
      [`Timestamp: ${new Date().toISOString()}`],
      [],
      [
        'Ticket ID',
        'Registration No',
        'Vehicle Type',
        'Owner / Driver',
        'Slot Allocated',
        'Floor',
        'Status',
        'Entry Time',
        'Exit Time',
        'Duration',
        'Fee Collected (INR)',
        'Payment ID',
        'Payment Method',
      ],
    ];

    filteredHistory.forEach((item) => {
      rows.push([
        item.id,
        item.registrationNumber,
        item.vehicleType,
        item.ownerName || 'Visitor',
        item.slotNumber,
        `Floor ${item.floor}`,
        item.status,
        item.entryTime,
        item.exitTime || 'Parked',
        item.durationFormatted,
        item.feePaid !== undefined ? item.feePaid.toString() : 'Unpaid (Active)',
        item.paymentId || 'N/A',
        item.paymentMethod || 'N/A',
      ]);
    });

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vpms_pro_admin_parking_history_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Executive Admin Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-cyan-500/40 bg-gradient-to-r from-[#0d131f] via-[#101827] to-[#0d1422] p-6 shadow-[0_0_35px_rgba(0,240,255,0.15)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>CONFIDENTIAL ADMIN LEDGER · ACCESS RESTRICTED</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
              <span>Vehicle Parking History</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                Audited Log
              </span>
            </h1>
            <p className="text-gray-300 text-sm max-w-2xl font-light">
              Full chronological timeline of every vehicle entry, allocated parking bay, duration calculation, and checkout transaction records.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 self-start md:self-center">
            <button
              type="button"
              onClick={handleExportHistoryCSV}
              className="glow-cyan-btn px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-2 cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Parked Vehicles (All-time recorded) */}
        <div className="cyber-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-semibold tracking-wider">
              Total Logged Entries
            </span>
            <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <History className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-cyan-400 tracking-tight">
              {totalVehiclesCount}
            </span>
            <span className="text-xs text-gray-400 font-mono">Total sessions</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-transparent"></div>
        </div>

        {/* Currently Parked */}
        <div className="cyber-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-semibold tracking-wider">
              Currently Occupying Bay
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Car className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-amber-400 tracking-tight">
              {activeParkedCount}
            </span>
            <span className="text-xs text-amber-300 font-mono">Live vehicles</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-transparent"></div>
        </div>

        {/* Completed Departures */}
        <div className="cyber-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-semibold tracking-wider">
              Completed Checkouts
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight">
              {completedExitsCount}
            </span>
            <span className="text-xs text-emerald-300 font-mono">Cleared & Paid</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent"></div>
        </div>

        {/* Total Fee Audited */}
        <div className="cyber-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-semibold tracking-wider">
              Gross Realized Revenue
            </span>
            <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <IndianRupee className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-cyan-400 tracking-tight">
              ₹{totalAuditedRevenue}
            </span>
            <span className="text-xs text-emerald-400 font-mono">Settled funds</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-transparent"></div>
        </div>
      </div>

      {/* Search & Comprehensive Filters */}
      <div className="cyber-card p-4 border border-white/10 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Omnibar Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Reg No, Ticket ID, Owner Name, Slot Number..."
              className="w-full bg-[#0c121d] border border-white/10 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none uppercase"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#111928] border border-white/15 text-gray-300 rounded-lg px-2.5 py-2 focus:border-cyan-400 focus:outline-none"
            >
              <option value="ALL">Status: All</option>
              <option value="ACTIVE">Status: Parked (Active)</option>
              <option value="COMPLETED">Status: Completed (Exited)</option>
            </select>

            {/* Vehicle Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-[#111928] border border-white/15 text-gray-300 rounded-lg px-2.5 py-2 focus:border-cyan-400 focus:outline-none"
            >
              <option value="ALL">Type: All Types</option>
              <option value="CAR">Type: Cars</option>
              <option value="BIKE">Type: Two-Wheelers</option>
              <option value="COMMERCIAL">Type: Commercial</option>
            </select>

            {/* Floor Filter */}
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value as any)}
              className="bg-[#111928] border border-white/15 text-gray-300 rounded-lg px-2.5 py-2 focus:border-cyan-400 focus:outline-none"
            >
              <option value="ALL">Floor: All Levels</option>
              <option value="1">Floor: Floor 1 (Ground)</option>
              <option value="2">Floor: Floor 2 (Upper)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Historical Audit Table */}
      <div className="cyber-card border border-white/10 overflow-hidden space-y-3">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#111928]">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <h3 className="font-bold text-base text-white tracking-wide">
              Historical Records Ledger
            </h3>
          </div>
          <span className="text-xs font-mono text-cyan-300">
            Showing {filteredHistory.length} of {historyData.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0e1422] text-gray-400 uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3.5 px-5">Ticket ID</th>
                <th className="py-3.5 px-5">Reg Plate</th>
                <th className="py-3.5 px-5">Vehicle Type</th>
                <th className="py-3.5 px-5">Slot Bay</th>
                <th className="py-3.5 px-5">Owner / Driver</th>
                <th className="py-3.5 px-5">Entry Time</th>
                <th className="py-3.5 px-5">Exit Time</th>
                <th className="py-3.5 px-5">Duration</th>
                <th className="py-3.5 px-5">Fee Paid</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => {
                  const originalTicket = tickets.find((t) => t.id === item.id);
                  const isParked = item.status === 'ACTIVE';

                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      {/* Ticket ID */}
                      <td className="py-3.5 px-5 font-bold text-white group-hover:text-cyan-400 transition-colors">
                        <div className="flex items-center space-x-1.5">
                          <span>{item.id}</span>
                          {item.cloudStored && (
                            <span title="Stored in Firebase Firestore" className="p-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                              <Cloud className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Reg Plate */}
                      <td className="py-3.5 px-5 font-bold text-cyan-300 tracking-wider">
                        {item.registrationNumber}
                      </td>

                      {/* Vehicle Type */}
                      <td className="py-3.5 px-5 text-gray-300">
                        <span className="inline-flex items-center space-x-1.5">
                          {item.vehicleType === 'BIKE' ? (
                            <Bike className="w-3.5 h-3.5 text-cyan-400" />
                          ) : item.vehicleType === 'CAR' ? (
                            <Car className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <Truck className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                          <span>{item.vehicleType}</span>
                        </span>
                      </td>

                      {/* Slot Bay */}
                      <td className="py-3.5 px-5">
                        <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-semibold">
                          {item.slotNumber}
                        </span>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-5 text-gray-300">
                        <div>
                          <span>{item.ownerName || 'Visitor'}</span>
                          {item.userEmail && (
                            <span className="block text-[10px] text-gray-500 truncate max-w-[130px]">{item.userEmail}</span>
                          )}
                        </div>
                      </td>

                      {/* Entry Time */}
                      <td className="py-3.5 px-5 text-gray-400">
                        {item.entryTime}
                      </td>

                      {/* Exit Time */}
                      <td className="py-3.5 px-5 text-gray-400">
                        {item.exitTime || (
                          <span className="text-amber-400 font-semibold italic">Currently Parked</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-5 text-gray-300">
                        {item.durationFormatted}
                      </td>

                      {/* Fee Paid */}
                      <td className="py-3.5 px-5 font-bold">
                        {item.feePaid !== undefined ? (
                          <span className="text-emerald-400">₹{item.feePaid} ({item.paymentMethod})</span>
                        ) : (
                          <span className="text-gray-500 italic">Accruing</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5">
                        {isParked ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            <span>Parked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Departed</span>
                          </span>
                        )}
                      </td>

                      {/* Admin Action */}
                      <td className="py-3.5 px-5 text-right space-x-2 whitespace-nowrap">
                        {originalTicket && onViewTicketPrint && (
                          <button
                            type="button"
                            onClick={() => onViewTicketPrint(originalTicket)}
                            title="Inspect / Print Ticket Pass"
                            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isParked && onNavigateToExit && (
                          <button
                            type="button"
                            onClick={() => onNavigateToExit(item.id)}
                            className="px-2 py-1 rounded bg-amber-950 hover:bg-amber-900 border border-amber-500/40 text-amber-300 hover:text-white transition-all inline-flex items-center space-x-1 cursor-pointer"
                          >
                            <span>Clear Bay</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-gray-500 font-mono">
                    No historical vehicle sessions match the current query and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
