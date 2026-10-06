import React, { useState, useEffect } from 'react';
import { ParkingSlot, Ticket, VehicleType, User, Vehicle } from '../types/parking';
import { formatDateTime } from '../services/parkingStore';
import { 
  ArrowDownLeft, 
  CheckCircle2, 
  Car, 
  Bike, 
  Truck, 
  Sparkles, 
  Printer, 
  MapPin, 
  ShieldCheck,
  ChevronRight,
  User as UserIcon,
  Tag,
  Cloud,
  Lock,
  LogIn,
  UserPlus,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveBookingToFirestore, checkIsVehicleBlacklisted, subscribeToBlacklist, sanitizePlateId } from '../services/firebase';
import { BlacklistedVehicle } from '../types/parking';
import { FirebaseAuthModal } from './FirebaseAuthModal';

interface VehicleEntryViewProps {
  availableSlots: ParkingSlot[];
  initialSlotNumber?: string;
  onGenerateTicket: (params: {
    registrationNumber: string;
    vehicleType: VehicleType;
    ownerName?: string;
    preferredSlotNumber?: string;
  }) => Ticket | null;
  onViewTicketPrint: (ticket: Ticket) => void;
  onNavigateToDashboard: () => void;
}

export const VehicleEntryView: React.FC<VehicleEntryViewProps> = ({
  availableSlots,
  initialSlotNumber,
  onGenerateTicket,
  onViewTicketPrint,
  onNavigateToDashboard,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('CAR');
  const [ownerName, setOwnerName] = useState('');
  const [selectedSlotNumber, setSelectedSlotNumber] = useState<string>(initialSlotNumber || '');
  const [errorMessage, setErrorMessage] = useState('');

  // Firebase Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<string | undefined>(undefined);

  // Success state modal
  const [authorizedTicket, setAuthorizedTicket] = useState<Ticket | null>(null);
  const [cloudSyncSaved, setCloudSyncSaved] = useState(false);

  // Active Blacklist State
  const [blacklistRecords, setBlacklistRecords] = useState<BlacklistedVehicle[]>([]);
  const [activeViolation, setActiveViolation] = useState<BlacklistedVehicle | null>(null);

  // Live Blacklist Subscription
  useEffect(() => {
    const unsub = subscribeToBlacklist((records) => {
      setBlacklistRecords(records.filter((r) => r.status === 'ACTIVE'));
    });
    return () => unsub();
  }, []);

  // Check violation status as user types registration plate
  useEffect(() => {
    const clean = registrationNumber.trim().toUpperCase();
    if (!clean) {
      setActiveViolation(null);
      return;
    }
    const sanitized = sanitizePlateId(clean);
    const found = blacklistRecords.find(
      (b) => b.id === sanitized || b.registrationNumber.toUpperCase() === clean
    );
    setActiveViolation(found || null);
  }, [registrationNumber, blacklistRecords]);

  // Autofill user details from Firebase User Profile
  useEffect(() => {
    if (userProfile) {
      if (userProfile.name && !ownerName) setOwnerName(userProfile.name);
      if (userProfile.vehicleNumber && !registrationNumber) setRegistrationNumber(userProfile.vehicleNumber);
    } else if (currentUser) {
      if (currentUser.displayName && !ownerName) setOwnerName(currentUser.displayName);
    }
  }, [userProfile, currentUser]);

  // Sync initial slot if passed from floor grid
  useEffect(() => {
    if (initialSlotNumber) {
      setSelectedSlotNumber(initialSlotNumber);
      // Auto-detect type
      if (initialSlotNumber.includes('-B')) {
        setVehicleType('BIKE');
      } else {
        setVehicleType('CAR');
      }
    }
  }, [initialSlotNumber]);

  // Filter slots suitable for chosen type
  const matchingSlots = availableSlots.filter((slot) => {
    if (vehicleType === 'BIKE') return slot.slotType === 'BIKE';
    return slot.slotType === 'CAR';
  });

  // Auto recommend first matching slot if not explicitly selected
  const recommendedSlot = matchingSlots[0]?.slotNumber || availableSlots[0]?.slotNumber || 'Full';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanReg = registrationNumber.trim().toUpperCase();
    if (!cleanReg) {
      setErrorMessage('Please enter a valid vehicle registration number');
      return;
    }

    // 1. BLACKLIST RULE VIOLATION ENFORCEMENT
    if (activeViolation) {
      setErrorMessage(
        `⛔ ENTRY DENIED: Vehicle ${cleanReg} is BLACKLISTED for rule violation: "${activeViolation.reason}" (${activeViolation.violationType.replace('_', ' ')}). Entry and slot reservations are prohibited.`
      );
      return;
    }

    const onlineBlacklistCheck = await checkIsVehicleBlacklisted(cleanReg);
    if (onlineBlacklistCheck) {
      setActiveViolation(onlineBlacklistCheck);
      setErrorMessage(
        `⛔ ENTRY DENIED: Vehicle ${cleanReg} is BLACKLISTED for rule violation: "${onlineBlacklistCheck.reason}" (${onlineBlacklistCheck.violationType.replace('_', ' ')}). Entry and slot reservations are prohibited.`
      );
      return;
    }

    if (availableSlots.length === 0) {
      setErrorMessage('No available parking slots in the facility! All bays are occupied.');
      return;
    }

    const slotToAssign = selectedSlotNumber || recommendedSlot;
    if (slotToAssign === 'Full') {
      setErrorMessage(`No available ${vehicleType} slots remaining.`);
      return;
    }

    // MANDATORY REQUIREMENT: If user is not authenticated, prompt sign in / sign up before booking!
    if (!currentUser) {
      setAuthModalReason(`Bay ${slotToAssign}`);
      setIsAuthModalOpen(true);
      return;
    }

    const ticket = onGenerateTicket({
      registrationNumber: cleanReg,
      vehicleType,
      ownerName: ownerName.trim() || userProfile?.name || currentUser.displayName || undefined,
      preferredSlotNumber: slotToAssign,
    });

    if (ticket) {
      setAuthorizedTicket(ticket);
      // Persist to Firebase Firestore
      setCloudSyncSaved(true);
      saveBookingToFirestore({
        id: ticket.id,
        ticketNumber: ticket.id,
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        userName: ownerName.trim() || userProfile?.name || currentUser.displayName || 'Driver',
        registrationNumber: cleanReg,
        vehicleType,
        slotId: ticket.slotId,
        slotNumber: ticket.slotNumber,
        floor: ticket.floor,
        entryTime: ticket.entryTime,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      }).catch((err) => {
        console.warn('Firestore booking write notice:', err);
      });
    } else {
      setErrorMessage('Failed to allocate slot. Please select an available slot.');
    }
  };

  const handleProcessNextVehicle = () => {
    setAuthorizedTicket(null);
    setRegistrationNumber(userProfile?.vehicleNumber || '');
    setOwnerName(userProfile?.name || currentUser?.displayName || '');
    setSelectedSlotNumber('');
    setErrorMessage('');
    setCloudSyncSaved(false);
  };

  const samplePlates = [
    { plate: 'KA22HA8784', type: 'BIKE' as VehicleType, owner: 'Sagar Inamati' },
    { plate: 'MH-12-AB-1234', type: 'CAR' as VehicleType, owner: 'Rahul Sharma' },
    { plate: 'DL-01-XY-4422', type: 'CAR' as VehicleType, owner: 'Priya Verma' },
    { plate: 'KA-04-MB-2024', type: 'CAR' as VehicleType, owner: 'Arjun Mehta' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-2">
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>INBOUND GATE TERMINAL</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Vehicle Entry Flow
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Register incoming vehicles and assign optimal parking slots.
        </p>
      </div>

      {/* Main Entry Card */}
      <div className="cyber-card p-6 sm:p-8 border border-white/10 relative overflow-hidden">
        {/* Subtle accent border line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-400 to-transparent"></div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-mono flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Firebase Authentication Status & Gate Banner */}
        {currentUser ? (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
                    Firebase User Connected
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-900/80 text-emerald-200">
                    Cloud Synced
                  </span>
                </div>
                <p className="text-xs text-gray-300 font-mono mt-0.5">
                  Logged in as <strong className="text-white">{userProfile?.name || currentUser.displayName || 'Driver'}</strong> ({currentUser.email})
                </p>
              </div>
            </div>

            {userProfile?.vehicleNumber && registrationNumber !== userProfile.vehicleNumber && (
              <button
                type="button"
                onClick={() => setRegistrationNumber(userProfile.vehicleNumber!)}
                className="px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 text-xs font-mono flex items-center space-x-1 cursor-pointer transition-colors self-start sm:self-center"
              >
                <Car className="w-3.5 h-3.5" />
                <span>Use Saved Plate: {userProfile.vehicleNumber}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-500/40">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                    User Sign In Required Before Booking
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-900/80 text-amber-200 font-bold">
                    Mandatory
                  </span>
                </div>
                <p className="text-xs text-gray-300 font-sans mt-0.5">
                  Please sign in or create an account with Firebase to reserve this slot and store your digital booking pass.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setAuthModalReason(selectedSlotNumber || recommendedSlot);
                setIsAuthModalOpen(true);
              }}
              className="glow-cyan-btn px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer self-start sm:self-center shadow-[0_0_12px_rgba(0,240,255,0.3)]"
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-300" />
              <span>Sign In / Sign Up</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Field 1: Registration Number */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="reg-number" className="block text-xs font-mono uppercase font-semibold text-gray-300 tracking-wider">
                Registration Number <span className="text-cyan-400">*</span>
              </label>
              <span className="text-[11px] text-gray-500 font-mono">Format: State Code - District - Series</span>
            </div>
            
            <div className="relative">
              <input
                id="reg-number"
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                placeholder="e.g. MH-12-AB-1234"
                required
                className="w-full bg-[#0c121d] border border-white/15 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-lg font-mono font-bold text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all uppercase tracking-wider"
              />
              <div className="absolute right-3.5 top-3.5 text-gray-500 font-mono text-xs px-2 py-1 rounded bg-white/5 border border-white/5">
                IND
              </div>
            </div>

            {/* Active Blacklist Live Warning */}
            {activeViolation && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs font-mono flex items-start space-x-2.5 animate-in fade-in duration-200 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-red-300 uppercase tracking-wide">
                      Blacklist Violation Alert
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-900 border border-red-400 text-white font-bold">
                      ENTRY BARRED
                    </span>
                  </div>
                  <p className="text-[11px] text-red-200 mt-1">
                    Vehicle <strong>{activeViolation.registrationNumber}</strong> is barred from entering the facility.
                  </p>
                  <p className="text-[10px] text-red-300/80 mt-0.5">
                    <strong>Reason:</strong> {activeViolation.reason} ({activeViolation.violationType.replace('_', ' ')})
                  </p>
                </div>
              </div>
            )}

            {/* Quick Fill Sample Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-gray-500 font-mono mr-1">Quick Sample:</span>
              {samplePlates.map((sample) => (
                <button
                  key={sample.plate}
                  type="button"
                  onClick={() => {
                    setRegistrationNumber(sample.plate);
                    setVehicleType(sample.type);
                    setOwnerName(sample.owner);
                  }}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-cyan-950/60 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 text-[11px] font-mono text-gray-400 transition-colors"
                >
                  {sample.plate}
                </button>
              ))}
            </div>
          </div>

          {/* Field 2: Vehicle Type */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase font-semibold text-gray-300 tracking-wider">
              Vehicle Type <span className="text-cyan-400">*</span>
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Car */}
              <button
                type="button"
                onClick={() => {
                  setVehicleType('CAR');
                  setSelectedSlotNumber('');
                }}
                className={`p-3.5 rounded-xl border text-left flex items-center space-x-3 transition-all ${
                  vehicleType === 'CAR'
                    ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                    : 'bg-[#0e1422] border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <div className={`p-2 rounded-lg ${vehicleType === 'CAR' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400'}`}>
                  <Car className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-white">Car</span>
                  <span className="text-[11px] text-gray-400 block leading-tight">SUV / Sedan / Hatchback</span>
                </div>
              </button>

              {/* Option 2: Bike */}
              <button
                type="button"
                onClick={() => {
                  setVehicleType('BIKE');
                  setSelectedSlotNumber('');
                }}
                className={`p-3.5 rounded-xl border text-left flex items-center space-x-3 transition-all ${
                  vehicleType === 'BIKE'
                    ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                    : 'bg-[#0e1422] border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <div className={`p-2 rounded-lg ${vehicleType === 'BIKE' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400'}`}>
                  <Bike className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-white">Bike</span>
                  <span className="text-[11px] text-gray-400 block leading-tight">Motorcycle / Scooter</span>
                </div>
              </button>

              {/* Option 3: Commercial */}
              <button
                type="button"
                onClick={() => {
                  setVehicleType('COMMERCIAL');
                  setSelectedSlotNumber('');
                }}
                className={`p-3.5 rounded-xl border text-left flex items-center space-x-3 transition-all ${
                  vehicleType === 'COMMERCIAL'
                    ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                    : 'bg-[#0e1422] border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <div className={`p-2 rounded-lg ${vehicleType === 'COMMERCIAL' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400'}`}>
                  <Truck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-white">Commercial</span>
                  <span className="text-[11px] text-gray-400 block leading-tight">Van / EV Shuttle</span>
                </div>
              </button>
            </div>
          </div>

          {/* Field 3: Owner Name (Optional) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="owner-name" className="block text-xs font-mono uppercase font-semibold text-gray-300 tracking-wider">
                Owner Name (Optional)
              </label>
              <span className="text-[11px] text-gray-500 font-mono">Linked to User profile</span>
            </div>
            
            <div className="relative">
              <input
                id="owner-name"
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-[#0c121d] border border-white/15 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
              <UserIcon className="w-4 h-4 text-gray-500 absolute right-3.5 top-3.5" />
            </div>
          </div>

          {/* Smart Slot Allocation preview & selector */}
          <div className="p-4 rounded-xl bg-[#0e1422] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-gray-400 tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI Recommended Slot</span>
              </span>
              <span className="text-xs font-mono text-emerald-400">
                {matchingSlots.length} bays available
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center font-mono text-xl font-black text-cyan-400">
                  {selectedSlotNumber || recommendedSlot}
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">
                    {selectedSlotNumber ? 'Manually Assigned' : 'Optimal Path Allocation'}
                  </span>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {selectedSlotNumber ? `Selected: ${selectedSlotNumber}` : `Auto-assigned nearest to ramp`}
                  </span>
                </div>
              </div>

              {/* Slot selector dropdown */}
              <div className="flex items-center space-x-2">
                <label htmlFor="slot-select" className="text-xs text-gray-400 font-mono">
                  Override Bay:
                </label>
                <select
                  id="slot-select"
                  value={selectedSlotNumber}
                  onChange={(e) => setSelectedSlotNumber(e.target.value)}
                  className="bg-[#141b2b] border border-white/15 text-white font-mono text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">Auto ({recommendedSlot})</option>
                  {matchingSlots.map((s) => (
                    <option key={s.id} value={s.slotNumber}>
                      {s.slotNumber} (Floor {s.floor})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Main Button: Vibrant cyan button or Red blocked button */}
          <button
            type="submit"
            disabled={availableSlots.length === 0 || activeViolation !== null}
            className={`w-full py-4 rounded-xl text-base font-bold tracking-wide uppercase flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              activeViolation
                ? 'bg-red-950/80 border border-red-500/50 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                : 'glow-cyan-btn shadow-[0_0_25px_rgba(0,240,255,0.4)]'
            }`}
          >
            {activeViolation ? (
              <>
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <span>Entry Prohibited (Blacklisted Vehicle)</span>
              </>
            ) : (
              <>
                <span>Generate Entry Ticket</span>
                <ChevronRight className="w-5 h-5 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Success State Modal ("Entry Authorized") */}
      {authorizedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md cyber-card border border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.25)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Large green checkmark inside a circle */}
            <div className="p-6 text-center border-b border-white/10 bg-gradient-to-b from-emerald-950/40 to-transparent">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-10 h-10 stroke-[2.3]" />
              </div>
              
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Entry Authorized
              </h2>
              <p className="text-sm text-gray-300 mt-1 font-light">
                Please proceed to the allocated slot.
              </p>
            </div>

            {/* Ticket Details List matching prompt specifications */}
            <div className="p-6 space-y-4">
              <div className="bg-[#0d1422] rounded-xl p-4 border border-white/10 space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-gray-400 text-xs">Ticket ID:</span>
                  <span className="font-bold text-white tracking-wider">{authorizedTicket.id}</span>
                </div>

                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-gray-400 text-xs">Registration:</span>
                  <span className="font-bold text-gray-100 tracking-wider">{authorizedTicket.registrationNumber}</span>
                </div>

                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-gray-400 text-xs">Allocated Slot:</span>
                  <span className="font-bold text-cyan-400 text-lg tracking-wider">
                    {authorizedTicket.slotNumber}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-gray-400 text-xs">Vehicle Type:</span>
                  <span className="font-semibold text-gray-200">{authorizedTicket.vehicleType}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs">Entry Time:</span>
                  <span className="text-gray-300 text-xs">{authorizedTicket.entryTime}</span>
                </div>
              </div>

              {/* Print Ticket & Floor link */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => onViewTicketPrint(authorizedTicket)}
                  className="text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1.5 py-1 px-2 rounded bg-cyan-950/40 border border-cyan-500/30"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Physical Pass</span>
                </button>

                <button
                  type="button"
                  onClick={onNavigateToDashboard}
                  className="text-gray-400 hover:text-gray-200 font-mono flex items-center space-x-1"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>View on Grid</span>
                </button>
              </div>

              {/* Cloud Sync Status Badge */}
              {cloudSyncSaved && (
                <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-between text-xs font-mono text-emerald-300">
                  <span className="flex items-center space-x-1.5">
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Booking saved to Firebase Firestore</span>
                  </span>
                  <span className="text-[10px] bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-200">
                    Live
                  </span>
                </div>
              )}

              {/* Action Button: "Process Next Vehicle" */}
              <button
                type="button"
                onClick={handleProcessNextVehicle}
                className="w-full glow-cyan-btn py-3.5 rounded-xl text-sm font-bold tracking-wider uppercase flex items-center justify-center space-x-2 mt-4 cursor-pointer"
              >
                <span>Process Next Vehicle</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Firebase Auth Modal for Slot Booking */}
      <FirebaseAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        bookingSlotNotice={authModalReason}
        onSuccess={() => {
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
};
