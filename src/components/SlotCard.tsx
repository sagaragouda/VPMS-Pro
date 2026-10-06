import React, { useState } from 'react';
import { ParkingSlot, Ticket, Sensor } from '../types/parking';
import { Bike, Car, Activity, Clock, ShieldCheck, Radio } from 'lucide-react';

interface SlotCardProps {
  slot: ParkingSlot;
  sensor?: Sensor;
  ticket?: Ticket;
  onClick: () => void;
}

export const SlotCard: React.FC<SlotCardProps> = ({ slot, sensor, ticket, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isOccupied = slot.status === 'OCCUPIED';
  const isBike = slot.slotType === 'BIKE';

  // Last status change timestamp from sensor or slot
  const lastChange = sensor?.lastStatusChange || slot.lastStatusChange || (ticket ? ticket.entryTime : '2026-06-02 14:30:00');

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 cursor-pointer overflow-hidden border ${
          isOccupied
            ? 'bg-gradient-to-b from-red-950/40 to-[#120a0f] border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            : 'bg-gradient-to-b from-[#111928]/80 to-[#0e1420] border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.06)] hover:border-cyan-400 hover:shadow-[0_0_18px_rgba(0,240,255,0.25)]'
        }`}
      >
        {/* Top row: Slot Number & Status Badge */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-sm font-bold tracking-wider text-white group-hover:text-cyan-300 transition-colors">
            {slot.slotNumber}
          </span>
          
          {isOccupied ? (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-red-950/80 border border-red-500/40 text-red-300">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              <span>Occupied</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-emerald-950/70 border border-emerald-500/30 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Available</span>
            </span>
          )}
        </div>

        {/* Middle row: Vehicle Type Icon & Text */}
        <div className="flex items-center space-x-2 my-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
              isOccupied
                ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                : 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/20'
            }`}
          >
            {isBike ? (
              <Bike className="w-4 h-4 stroke-[2.2]" />
            ) : (
              <Car className="w-4 h-4 stroke-[2.2]" />
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-gray-300">
              {slot.slotType}
            </span>
            <span className="text-[10px] text-gray-500">
              {isBike ? 'Two-Wheeler Slot' : 'Standard Bay'}
            </span>
          </div>
        </div>

        {/* Bottom row: Registration or Sensor telemetry */}
        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
          {isOccupied && ticket ? (
            <div className="flex items-center space-x-1 text-red-300 font-mono font-medium truncate">
              <span className="truncate">{ticket.registrationNumber}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-gray-400 font-mono text-[10px]">
              <Activity className="w-3 h-3 text-cyan-400/70" />
              <span>Ready for parking</span>
            </div>
          )}

          <span className="text-[10px] font-mono text-gray-500 group-hover:text-cyan-400 transition-colors">
            Floor {slot.floor}
          </span>
        </div>

        {/* Subtle Cyberpunk corner accent line */}
        <div
          className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${
            isOccupied ? 'border-red-500/60' : 'border-cyan-400/40'
          }`}
        ></div>
      </button>

      {/* Hover Tooltip / Floating Card: 'Last status change' timestamp pulling from sensor telemetry */}
      {isHovered && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-lg bg-[#070b12]/95 border border-cyan-400/60 shadow-[0_0_20px_rgba(0,240,255,0.3)] backdrop-blur-md text-[11px] font-mono text-gray-200 pointer-events-none transition-all duration-150 animate-in fade-in slide-in-from-bottom-2">
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#070b12]"></div>

          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
            <span className="text-cyan-400 font-bold flex items-center space-x-1">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>{sensor?.sensorCode || `SNR-${slot.slotNumber}`}</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              {sensor?.status || 'ONLINE'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-400 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-cyan-300" />
                <span>Last Status Change:</span>
              </span>
            </div>
            {/* Exact Timestamp badge */}
            <div className="text-xs font-bold text-white bg-black/50 px-1.5 py-1 rounded border border-white/10 text-center font-mono">
              {lastChange}
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
              <span>Battery: <strong className="text-emerald-400">{sensor?.batteryPercent ?? 98}%</strong></span>
              <span>Signal: <strong className="text-cyan-300">{sensor?.signalStrengthDbm ?? -52} dBm</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
