import React, { useState } from 'react';
import { ParkingSlot, Ticket, Sensor } from '../types/parking';
import { SlotCard } from './SlotCard';
import { SlotDetailsModal } from './SlotDetailsModal';
import { 
  CircleParking, 
  IndianRupee, 
  Car, 
  AlertCircle, 
  Activity, 
  CheckCircle2, 
  Layers, 
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Cloud,
  LogIn,
  UserPlus,
  Calendar
} from 'lucide-react';
import carHeroImg from '../assets/images/cyberpunk_car_banner_1790441021473.jpg';
import { useAuth } from '../context/AuthContext';

interface DashboardViewProps {
  slots: ParkingSlot[];
  sensors: Sensor[];
  tickets: Ticket[];
  totalRevenue: number;
  onNavigateToEntry: (preferredSlot?: string) => void;
  onNavigateToExit: (ticketId?: string) => void;
  onViewTicketPrint?: (ticket: Ticket) => void;
  onOpenAuthModal?: () => void;
  onOpenBookingsModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  slots,
  sensors,
  tickets,
  totalRevenue,
  onNavigateToEntry,
  onNavigateToExit,
  onViewTicketPrint,
  onOpenAuthModal,
  onOpenBookingsModal,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);

  // Compute metrics
  const availableSlotsCount = slots.filter((s) => s.status === 'AVAILABLE').length;
  const occupiedSlotsCount = slots.filter((s) => s.status === 'OCCUPIED').length;

  const floor1Slots = slots.filter((s) => s.floor === 1);
  const floor2Slots = slots.filter((s) => s.floor === 2);

  const activeTicketsMap = new Map<string, Ticket>();
  tickets.filter((t) => t.status === 'ACTIVE').forEach((t) => {
    activeTicketsMap.set(t.slotNumber, t);
    activeTicketsMap.set(t.slotId, t);
  });

  const getSlotTicket = (slot: ParkingSlot) => {
    return activeTicketsMap.get(slot.slotNumber) || activeTicketsMap.get(slot.id);
  };

  const getSlotSensor = (slot: ParkingSlot) => {
    return sensors.find((s) => s.slotId === slot.id || s.slotId === `slot-${slot.slotNumber.toLowerCase()}`);
  };

  const selectedSensor = selectedSlot
    ? getSlotSensor(selectedSlot)
    : undefined;

  const selectedTicket = selectedSlot ? getSlotTicket(selectedSlot) : undefined;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner with Cyberpunk Car Image */}
      <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-[#090d16] shadow-[0_0_30px_rgba(0,240,255,0.15)]">
        {/* Background Image Container with Cyberpunk Overlays */}
        <div className="relative h-64 sm:h-72 lg:h-80 w-full overflow-hidden">
          <img
            src={carHeroImg}
            alt="Futuristic Cyberpunk Car"
            className="w-full h-full object-cover object-center filter brightness-90 contrast-110 scale-105 transition-transform duration-700 hover:scale-100"
          />
          {/* Subtle gradient fades & grid lines */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-[#0b0f17]/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0f17] via-[#0b0f17]/60 to-transparent"></div>
          <div className="absolute inset-0 cyber-grid-bg opacity-30"></div>

          {/* Watermark */}
          <div className="absolute top-4 right-6 pointer-events-none select-none">
            <span className="font-mono text-3xl sm:text-5xl font-black text-cyan-400/10 tracking-[0.25em] uppercase">
              CYBER-PARK
            </span>
          </div>

          {/* Banner Titles: Left Side */}
          <div className="absolute bottom-6 left-6 sm:left-8 max-w-xl z-10">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>COMMAND SENSOR GRID ONLINE</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Command Center
            </h1>
            <p className="text-gray-300 text-sm sm:text-base mt-1.5 font-light">
              Real-time overview of your parking facilities.
            </p>
          </div>

          {/* Overlay text card on the car banner: "Premium Parking Management" */}
          <div className="hidden md:flex absolute top-6 right-6 lg:top-8 lg:right-8 z-10 cyber-card p-4 border border-cyan-500/40 max-w-xs shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Premium Parking Management
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  AI-driven slot allocation for elite vehicles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Firebase Cloud Hub & User Status Card */}
      {currentUser ? (
        <div className="cyber-card p-4 sm:p-5 border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-[#0b1019] to-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex-shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Firebase Cloud Account Active
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-500/30 text-emerald-200">
                  Firestore Connected
                </span>
              </div>
              <p className="text-xs text-gray-300 font-mono mt-0.5">
                Logged in as <strong className="text-white">{userProfile?.name || currentUser.displayName || 'Driver'}</strong> ({currentUser.email}).
                {userProfile?.vehicleNumber ? ` Registered Plate: ${userProfile.vehicleNumber}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-center">
            {onOpenBookingsModal && (
              <button
                type="button"
                onClick={onOpenBookingsModal}
                className="px-3 py-2 rounded-xl text-xs font-mono font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>My Cloud Bookings</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigateToEntry()}
              className="glow-cyan-btn px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
            >
              <Car className="w-3.5 h-3.5 text-cyan-300" />
              <span>Book Slot</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="cyber-card p-4 sm:p-5 border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-[#0b1019] to-cyan-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-500/40 flex-shrink-0">
              <UserPlus className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Firebase Slot Booking & Cloud Passes
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-500/30">
                  vpms-pro-2923e
                </span>
              </div>
              <p className="text-xs text-gray-400 font-sans mt-0.5">
                Sign in or register before booking slots to save your user profile and reservation passes to Firebase Firestore.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-center">
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="glow-cyan-btn px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.3)]"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-300" />
                <span>Sign In / Sign Up</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigateToEntry()}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <span>Explore Bays</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Metric Cards (4 Cards across) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Revenue */}
        <div className="cyber-card p-5 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-semibold tracking-wider">
              Total Revenue
            </span>
            <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <IndianRupee className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-cyan-400 tracking-tight">
              ₹{totalRevenue}
            </span>
            <span className="text-xs text-emerald-400 font-mono">Real-time ledger</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-transparent"></div>
        </div>

        {/* 2. Available Slots */}
        <div className="cyber-card p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-semibold tracking-wider">
              Available Slots
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CircleParking className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight">
              {availableSlotsCount}
            </span>
            <span className="text-xs text-gray-400 font-mono">/ {slots.length} Total</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent"></div>
        </div>

        {/* 3. Occupied Slots */}
        <div className="cyber-card p-5 relative overflow-hidden group hover:border-red-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-semibold tracking-wider">
              Occupied Slots
            </span>
            <div className="w-9 h-9 rounded-lg bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400">
              <Car className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-red-400 tracking-tight">
              {occupiedSlotsCount}
            </span>
            <span className="text-xs text-red-400/80 font-mono">Active bays</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-transparent"></div>
        </div>

        {/* 4. System Status */}
        <div className="cyber-card p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-semibold tracking-wider">
              System Status
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight flex items-center space-x-2">
              <span>Optimal</span>
            </span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent"></div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="cyber-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-cyan-500/20">
        <div className="flex items-center space-x-3 text-sm text-gray-300">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>
            Click on any parking slot card below to inspect slot telemetry, view vehicle details, or execute instant checkout.
          </span>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onNavigateToEntry()}
            className="glow-cyan-btn px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center space-x-1.5 flex-1 sm:flex-initial"
          >
            <span>+ Check-In Vehicle</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateToExit()}
            className="px-4 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 flex items-center justify-center space-x-1.5 flex-1 sm:flex-initial transition-colors"
          >
            <span>Check-Out Vehicle</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floor-wise Slot Status Grid */}
      <div className="space-y-8">
        {/* FLOOR 1 SECTION */}
        <div className="cyber-card p-6 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <CircleParking className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
                  <span>Floor 1</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                    Ground Level
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  Two-Wheeler bays (B08-B10) & Four-Wheeler Standard bays (C01-C07)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded border border-emerald-500/30">
                {floor1Slots.filter((s) => s.status === 'AVAILABLE').length} Available
              </span>
              <span className="text-red-400 bg-red-950/50 px-2 py-1 rounded border border-red-500/30">
                {floor1Slots.filter((s) => s.status === 'OCCUPIED').length} Occupied
              </span>
            </div>
          </div>

          {/* Grid of Floor 1 Slots */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 pt-2">
            {floor1Slots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                sensor={getSlotSensor(slot)}
                ticket={getSlotTicket(slot)}
                onClick={() => setSelectedSlot(slot)}
              />
            ))}
          </div>
        </div>

        {/* FLOOR 2 SECTION */}
        <div className="cyber-card p-6 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Layers className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
                  <span>Floor 2</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                    Upper Deck
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  Two-Wheeler bays (B08-B10) & Four-Wheeler Standard bays (C01-C07)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded border border-emerald-500/30">
                {floor2Slots.filter((s) => s.status === 'AVAILABLE').length} Available
              </span>
              <span className="text-red-400 bg-red-950/50 px-2 py-1 rounded border border-red-500/30">
                {floor2Slots.filter((s) => s.status === 'OCCUPIED').length} Occupied
              </span>
            </div>
          </div>

          {/* Grid of Floor 2 Slots */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 pt-2">
            {floor2Slots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                sensor={getSlotSensor(slot)}
                ticket={getSlotTicket(slot)}
                onClick={() => setSelectedSlot(slot)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Slot Details Modal */}
      <SlotDetailsModal
        slot={selectedSlot}
        sensor={selectedSensor}
        ticket={selectedTicket}
        onClose={() => setSelectedSlot(null)}
        onGoToExit={(tId) => onNavigateToExit(tId)}
        onGoToEntry={(slotNum) => onNavigateToEntry(slotNum)}
        onViewTicketPrint={onViewTicketPrint}
      />
    </div>
  );
};
