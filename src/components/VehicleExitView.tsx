import React, { useState, useEffect } from 'react';
import { Ticket, Payment, PaymentMethod, ParkingSlot } from '../types/parking';
import { calculateDurationAndFee, formatDateTime } from '../services/parkingStore';
import { 
  ArrowUpRight, 
  Search, 
  CheckCircle2, 
  X, 
  Banknote, 
  CreditCard, 
  QrCode, 
  Receipt, 
  Clock, 
  Car, 
  Bike, 
  Check, 
  ShieldCheck,
  ChevronRight,
  Printer
} from 'lucide-react';

interface VehicleExitViewProps {
  activeTickets: Ticket[];
  initialTicketId?: string;
  onProcessExit: (params: {
    ticketId: string;
    paymentMethod: PaymentMethod;
    amount: number;
    durationFormatted: string;
    exitTime: string;
  }) => Payment | null;
  onNavigateToDashboard: () => void;
  onNavigateToReports: () => void;
}

export const VehicleExitView: React.FC<VehicleExitViewProps> = ({
  activeTickets,
  initialTicketId,
  onProcessExit,
  onNavigateToDashboard,
  onNavigateToReports,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialTicketId || '');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [searchError, setSearchError] = useState('');
  const [paidPayment, setPaidPayment] = useState<Payment | null>(null);

  // Auto-select if initialTicketId passed or only 1 ticket exists
  useEffect(() => {
    if (initialTicketId) {
      const match = activeTickets.find((t) => t.id === initialTicketId || t.registrationNumber.toLowerCase() === initialTicketId.toLowerCase());
      if (match) {
        setSelectedTicket(match);
        setSearchQuery(match.id);
      }
    } else if (activeTickets.length === 1 && !selectedTicket && !paidPayment) {
      setSelectedTicket(activeTickets[0]);
      setSearchQuery(activeTickets[0].id);
    }
  }, [initialTicketId, activeTickets]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchError('');
    setPaidPayment(null);

    const query = searchQuery.trim().toUpperCase();
    if (!query) {
      setSearchError('Please enter a Ticket ID or Vehicle Registration Number');
      return;
    }

    const found = activeTickets.find(
      (t) => t.id.toUpperCase() === query || t.registrationNumber.toUpperCase().replace(/\s+/g, '') === query.replace(/\s+/g, '')
    );

    if (found) {
      setSelectedTicket(found);
    } else {
      setSelectedTicket(null);
      setSearchError(`No active parked vehicle found for query: "${query}".`);
    }
  };

  const handleSelectParkedVehicle = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSearchQuery(ticket.id);
    setSearchError('');
    setPaidPayment(null);
  };

  // Compute checkout details dynamically
  const exitTime = formatDateTime();
  const checkoutCalc = selectedTicket
    ? calculateDurationAndFee(selectedTicket.entryTime, selectedTicket.vehicleType)
    : { durationFormatted: '0h 0m', fee: 20 };

  const handleCheckoutSubmit = () => {
    if (!selectedTicket) return;

    const payment = onProcessExit({
      ticketId: selectedTicket.id,
      paymentMethod,
      amount: checkoutCalc.fee,
      durationFormatted: checkoutCalc.durationFormatted,
      exitTime,
    });

    if (payment) {
      setPaidPayment(payment);
      setSelectedTicket(null);
      setSearchQuery('');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-amber-950/70 border border-amber-500/30 text-amber-400 text-xs font-mono mb-2">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>OUTBOUND GATEWAY CHECKOUT</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Vehicle Exit Flow
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Compute fee tariffs, process payment clearance, and release parking bay.
        </p>
      </div>

      {/* Ticket Search Bar */}
      <div className="cyber-card p-5 border border-white/10 space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              placeholder="Search Ticket ID (e.g. TKT-0002) or Reg No (e.g. KA22HA8784)..."
              className="w-full bg-[#0c121d] border border-white/15 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 uppercase"
            />
          </div>
          <button
            type="submit"
            className="glow-cyan-btn px-6 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Find Ticket</span>
          </button>
        </form>

        {searchError && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono">
            {searchError}
          </div>
        )}

        {/* Quick select list of currently parked vehicles */}
        {activeTickets.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <span className="text-xs font-mono uppercase text-gray-400 block mb-2">
              Currently Parked Vehicles ({activeTickets.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {activeTickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectParkedVehicle(t)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center space-x-2 transition-all ${
                    selectedTicket?.id === t.id
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:border-cyan-500/40 hover:text-white'
                  }`}
                >
                  {t.vehicleType === 'BIKE' ? <Bike className="w-3.5 h-3.5" /> : <Car className="w-3.5 h-3.5" />}
                  <span>{t.id}</span>
                  <span className="text-gray-500">·</span>
                  <span className="font-bold">{t.registrationNumber}</span>
                  <span className="text-cyan-400">({t.slotNumber})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ticket Lookup / Checkout Summary Modal / Card */}
      {selectedTicket && (
        <div className="cyber-card border border-cyan-500/40 shadow-[0_0_35px_rgba(0,240,255,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Ticket Found Header with Cancel Option */}
          <div className="px-6 py-4 bg-[#111928] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Ticket Found
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="text-xs font-mono text-gray-400 hover:text-red-400 flex items-center space-x-1 px-2.5 py-1 rounded bg-white/5 hover:bg-red-950/40 border border-white/10 hover:border-red-500/30 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>

          {/* Detailed Fields List adhering precisely to prompt */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0d131f] p-4 rounded-xl border border-white/10 font-mono text-sm">
              {/* Ticket ID */}
              <div className="border-b sm:border-b-0 sm:border-r border-white/10 pb-3 sm:pb-0 sm:pr-4">
                <span className="text-xs text-gray-400 block mb-1">Ticket ID</span>
                <span className="text-base font-bold text-white">{selectedTicket.id}</span>
              </div>

              {/* Registration No */}
              <div>
                <span className="text-xs text-gray-400 block mb-1">Registration No</span>
                <span className="text-base font-bold text-cyan-300 tracking-wider">
                  {selectedTicket.registrationNumber}
                </span>
              </div>

              {/* Slot */}
              <div className="border-b sm:border-b-0 sm:border-r border-white/10 pb-3 sm:pb-0 sm:pr-4 pt-2">
                <span className="text-xs text-gray-400 block mb-1">Allocated Slot</span>
                <span className="text-base font-bold text-cyan-400">{selectedTicket.slotNumber}</span>
                <span className="text-[11px] text-gray-500 block">Level {selectedTicket.floor} · {selectedTicket.vehicleType}</span>
              </div>

              {/* Total Duration */}
              <div className="pt-2">
                <span className="text-xs text-gray-400 block mb-1">Total Duration</span>
                <span className="text-base font-bold text-amber-300 flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{checkoutCalc.durationFormatted}</span>
                </span>
              </div>

              {/* Entry Time */}
              <div className="border-t border-white/10 pt-3">
                <span className="text-xs text-gray-400 block mb-1">Entry Time</span>
                <span className="text-xs text-gray-200">{selectedTicket.entryTime}</span>
              </div>

              {/* Exit Time */}
              <div className="border-t border-white/10 pt-3">
                <span className="text-xs text-gray-400 block mb-1">Exit Time (Current)</span>
                <span className="text-xs text-gray-200">{exitTime}</span>
              </div>
            </div>

            {/* Total Fee in large bright cyan text */}
            <div className="bg-cyan-950/30 border border-cyan-500/40 rounded-xl p-5 flex items-center justify-between shadow-[0_0_20px_rgba(0,240,255,0.1)]">
              <div>
                <span className="text-xs font-mono uppercase text-gray-400 font-semibold tracking-wider block">
                  Total Fee Payable
                </span>
                <span className="text-xs text-cyan-300/80 font-mono">
                  Base tariff applied · Inclusive of GST
                </span>
              </div>

              <div className="text-right">
                <span className="text-4xl sm:text-5xl font-extrabold font-mono text-cyan-400 tracking-tight drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                  ₹{checkoutCalc.fee}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-mono uppercase font-semibold text-gray-300 tracking-wider">
                Select Payment Method
              </label>

              <div className="grid grid-cols-2 gap-4">
                {/* [icon] Cash */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-4 rounded-xl border flex items-center justify-center space-x-3 transition-all cursor-pointer ${
                    paymentMethod === 'CASH'
                      ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400'
                      : 'bg-[#0e1422] border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <Banknote className={`w-5 h-5 ${paymentMethod === 'CASH' ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <span className="font-bold text-sm">Cash</span>
                  {paymentMethod === 'CASH' && (
                    <Check className="w-4 h-4 text-cyan-400 ml-auto" />
                  )}
                </button>

                {/* [icon] Online */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ONLINE')}
                  className={`p-4 rounded-xl border flex items-center justify-center space-x-3 transition-all cursor-pointer ${
                    paymentMethod === 'ONLINE'
                      ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400'
                      : 'bg-[#0e1422] border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <CreditCard className={`w-5 h-5 ${paymentMethod === 'ONLINE' ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <span className="font-bold text-sm">Online (UPI / Card)</span>
                  {paymentMethod === 'ONLINE' && (
                    <Check className="w-4 h-4 text-cyan-400 ml-auto" />
                  )}
                </button>
              </div>
            </div>

            {/* Checkout Button: Full-width cyan button reading "Pay ₹20 & Exit Vehicle" */}
            <button
              type="button"
              onClick={handleCheckoutSubmit}
              className="w-full glow-cyan-btn py-4 rounded-xl text-base font-bold tracking-wide uppercase flex items-center justify-center space-x-2 cursor-pointer shadow-[0_0_25px_rgba(0,240,255,0.4)]"
            >
              <span>Pay ₹{checkoutCalc.fee} & Exit Vehicle</span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* Payment Success State Receipt */}
      {paidPayment && (
        <div className="cyber-card p-6 sm:p-8 border border-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.2)] space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Payment Settled & Vehicle Cleared
            </h2>
            <p className="text-xs text-gray-400">
              Transaction ID: <span className="font-mono text-cyan-400">{paidPayment.id}</span> · Parking bay has been released.
            </p>
          </div>

          <div className="bg-[#0e1422] p-4 rounded-xl border border-white/10 space-y-2.5 font-mono text-xs">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-gray-400">Payment ID:</span>
              <span className="font-bold text-white">{paidPayment.id}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-gray-400">Ticket Ref:</span>
              <span className="font-bold text-gray-200">{paidPayment.ticketId}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-gray-400">Registration:</span>
              <span className="font-bold text-cyan-400">{paidPayment.registrationNumber}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-gray-400">Amount Paid:</span>
              <span className="font-bold text-emerald-400 text-sm">₹{paidPayment.amount}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-gray-400">Payment Method:</span>
              <span className="font-bold text-white">{paidPayment.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Timestamp:</span>
              <span className="text-gray-300">{paidPayment.paymentTime}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setPaidPayment(null);
                setSearchQuery('');
              }}
              className="w-full sm:flex-1 glow-cyan-btn py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Process Another Exit
            </button>
            <button
              type="button"
              onClick={onNavigateToReports}
              className="w-full sm:flex-1 py-3 rounded-xl text-xs font-mono text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              View In Reports Ledger
            </button>
          </div>
        </div>
      )}

      {/* When no tickets are currently active and none selected */}
      {activeTickets.length === 0 && !selectedTicket && !paidPayment && (
        <div className="cyber-card p-12 text-center border-dashed border-white/10 space-y-3">
          <Car className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-gray-300">No Vehicles Currently Parked</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            All parking bays are currently vacant. Check-in incoming vehicles from the Vehicle Entry tab.
          </p>
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="glow-cyan-btn px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider mt-2"
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};
