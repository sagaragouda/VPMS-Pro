import React from 'react';
import { Ticket } from '../types/parking';
import { X, Printer, CheckCircle2, QrCode, Shield, Car, Bike } from 'lucide-react';

interface TicketPrintModalProps {
  ticket: Ticket | null;
  onClose: () => void;
}

export const TicketPrintModal: React.FC<TicketPrintModalProps> = ({ ticket, onClose }) => {
  if (!ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-[#0d131f] border border-cyan-500/50 rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.25)] overflow-hidden text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-5 py-3 bg-[#111928] border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Official Parking Pass</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Ticket Receipt Area */}
        <div id="printable-ticket" className="p-6 space-y-4 bg-gradient-to-b from-[#101726] to-[#0c101a]">
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-white/20">
            <div className="flex items-center justify-center space-x-2 text-cyan-400 mb-1">
              <span className="font-extrabold text-xl tracking-tight text-white">
                VPMS <span className="text-cyan-400 font-mono">Pro</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-400 uppercase tracking-widest font-mono">
              Vehicle Entry Pass & Receipt
            </p>
          </div>

          {/* Ticket ID & Slot Highlight */}
          <div className="bg-[#141d2e] p-3 rounded-xl border border-cyan-500/30 text-center space-y-1">
            <span className="text-[11px] font-mono uppercase text-gray-400 tracking-wider">
              Allocated Bay
            </span>
            <div className="text-3xl font-black font-mono text-cyan-400 tracking-wider">
              {ticket.slotNumber}
            </div>
            <span className="text-xs font-mono text-emerald-400 block">
              Floor {ticket.floor} · {ticket.vehicleType}
            </span>
          </div>

          {/* Ticket Details */}
          <div className="space-y-2.5 text-xs font-mono pt-1">
            <div className="flex justify-between border-b border-white/5 pb-1.5">
              <span className="text-gray-400">Ticket ID:</span>
              <span className="font-bold text-white">{ticket.id}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1.5">
              <span className="text-gray-400">Registration:</span>
              <span className="font-bold text-cyan-300">{ticket.registrationNumber}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1.5">
              <span className="text-gray-400">Owner / Driver:</span>
              <span className="text-gray-200">{ticket.ownerName || 'Visitor'}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1.5">
              <span className="text-gray-400">Entry Time:</span>
              <span className="text-gray-200">{ticket.entryTime}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1.5">
              <span className="text-gray-400">Base Tariff:</span>
              <span className="text-gray-200">₹{ticket.baseRatePerHour}/hr standard</span>
            </div>
          </div>

          {/* Simulated Barcode */}
          <div className="pt-3 border-t border-dashed border-white/20 text-center space-y-2">
            <div className="h-12 w-full bg-[#151c2c] rounded flex items-center justify-center space-x-1 px-4 py-2 border border-white/5">
              {/* Barcode lines simulation */}
              <div className="w-1 h-8 bg-white"></div>
              <div className="w-0.5 h-8 bg-transparent"></div>
              <div className="w-2 h-8 bg-cyan-400"></div>
              <div className="w-1 h-8 bg-transparent"></div>
              <div className="w-1.5 h-8 bg-white"></div>
              <div className="w-1 h-8 bg-transparent"></div>
              <div className="w-3 h-8 bg-cyan-300"></div>
              <div className="w-0.5 h-8 bg-transparent"></div>
              <div className="w-1 h-8 bg-white"></div>
              <div className="w-2 h-8 bg-transparent"></div>
              <div className="w-2 h-8 bg-cyan-400"></div>
              <div className="w-1 h-8 bg-white"></div>
              <div className="w-0.5 h-8 bg-transparent"></div>
              <div className="w-3 h-8 bg-white"></div>
              <div className="w-1 h-8 bg-cyan-400"></div>
            </div>
            <span className="text-[10px] font-mono text-gray-500 tracking-widest block">
              *{ticket.id}-{ticket.registrationNumber}*
            </span>
          </div>

          <p className="text-[10px] text-gray-500 text-center italic">
            Present this ticket at the exit counter or kiosk when departing.
          </p>
        </div>

        {/* Modal Buttons */}
        <div className="px-5 py-3 bg-[#111928] border-t border-white/10 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-300 hover:text-white rounded transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="glow-cyan-btn px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};
