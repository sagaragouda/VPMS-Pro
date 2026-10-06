import React from 'react';
import { ParkingSlot, Ticket, Sensor } from '../types/parking';
import { X, Bike, Car, BatteryCharging, Radio, Clock, ShieldCheck, ArrowUpRight, ArrowDownLeft, FileText } from 'lucide-react';

interface SlotDetailsModalProps {
  slot: ParkingSlot | null;
  sensor?: Sensor;
  ticket?: Ticket;
  onClose: () => void;
  onGoToExit: (ticketId: string) => void;
  onGoToEntry: (slotNumber: string) => void;
  onViewTicketPrint?: (ticket: Ticket) => void;
}

export const SlotDetailsModal: React.FC<SlotDetailsModalProps> = ({
  slot,
  sensor,
  ticket,
  onClose,
  onGoToExit,
  onGoToEntry,
  onViewTicketPrint,
}) => {
  if (!slot) return null;

  const isOccupied = slot.status === 'OCCUPIED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg cyber-card border border-cyan-500/40 shadow-[0_0_35px_rgba(0,240,255,0.2)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#111928]">
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              isOccupied ? 'bg-red-950/70 border border-red-500/40 text-red-400' : 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-400'
            }`}>
              {slot.slotType === 'BIKE' ? <Bike className="w-5 h-5" /> : <Car className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-mono text-lg font-bold text-white tracking-wider">{slot.slotNumber}</h3>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase font-semibold ${
                  isOccupied 
                    ? 'bg-red-950 text-red-300 border border-red-500/50' 
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                }`}>
                  {slot.status}
                </span>
              </div>
              <p className="text-xs text-gray-400">Level {slot.floor} · {slot.slotType} Parking Bay</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-5">
          {/* Occupied details if occupied */}
          {isOccupied && ticket ? (
            <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-red-300 font-semibold tracking-wide">
                <span>ACTIVE OCCUPANCY</span>
                <span className="font-mono">{ticket.id}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] text-gray-400 block">Registration Plate</span>
                  <span className="font-mono text-base font-bold text-white tracking-wider">{ticket.registrationNumber}</span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 block">Vehicle Type</span>
                  <span className="font-mono text-sm font-semibold text-gray-200">{ticket.vehicleType}</span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 block">Owner / Driver</span>
                  <span className="text-xs font-medium text-gray-300">{ticket.ownerName || 'Guest Visitor'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 block">Entry Time</span>
                  <span className="font-mono text-xs text-gray-300">{ticket.entryTime}</span>
                </div>
              </div>

              {onViewTicketPrint && (
                <div className="pt-2 border-t border-red-500/20 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onViewTicketPrint(ticket)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View / Print Ticket</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 flex items-center space-x-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-300">Bay is Ready for Allocation</h4>
                <p className="text-xs text-gray-400 mt-0.5">Sensor confirms bay is clear of obstacles and calibrated for entry.</p>
              </div>
            </div>
          )}

          {/* Sensor Diagnostics */}
          <div className="bg-[#0e1422] border border-white/10 rounded-xl p-4">
            <h4 className="text-xs font-mono uppercase text-gray-400 tracking-wider mb-3 flex items-center justify-between">
              <span>IoT Ultrasonic Sensor Monitored</span>
              <span className="text-cyan-400 font-mono">{sensor?.sensorCode || `SNR-${slot.slotNumber}`}</span>
            </h4>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-[#141b2b] p-2.5 rounded-lg border border-white/5">
                <div className="flex items-center justify-center text-emerald-400 mb-1">
                  <Radio className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-gray-400 block">Sensor Health</span>
                <span className="text-xs font-mono font-bold text-emerald-400">ACTIVE</span>
              </div>

              <div className="bg-[#141b2b] p-2.5 rounded-lg border border-white/5">
                <div className="flex items-center justify-center text-cyan-400 mb-1">
                  <BatteryCharging className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-gray-400 block">Battery Level</span>
                <span className="text-xs font-mono font-bold text-white">{sensor?.batteryPercent || 98}%</span>
              </div>

              <div className="bg-[#141b2b] p-2.5 rounded-lg border border-white/5">
                <div className="flex items-center justify-center text-purple-400 mb-1">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-gray-400 block">Signal Strength</span>
                <span className="text-xs font-mono font-bold text-white">{sensor?.signalStrengthDbm || -52} dBm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-[#111928] border-t border-white/10 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-medium"
          >
            Close
          </button>

          {isOccupied && ticket ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToExit(ticket.id);
              }}
              className="glow-cyan-btn px-4 py-2 rounded-lg text-sm flex items-center space-x-2"
            >
              <span>Process Exit & Billing</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToEntry(slot.slotNumber);
              }}
              className="glow-cyan-btn px-4 py-2 rounded-lg text-sm flex items-center space-x-2"
            >
              <span>Allocate Vehicle Here</span>
              <ArrowDownLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
