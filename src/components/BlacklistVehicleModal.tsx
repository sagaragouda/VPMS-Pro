import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  Car, 
  AlertTriangle, 
  CheckCircle2, 
  FileText,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveBlacklistedVehicle, sanitizePlateId } from '../services/firebase';
import { BlacklistedVehicle, ViolationType } from '../types/parking';

interface BlacklistVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlate?: string;
  onSuccess?: (vehicle: BlacklistedVehicle) => void;
}

export const BlacklistVehicleModal: React.FC<BlacklistVehicleModalProps> = ({
  isOpen,
  onClose,
  initialPlate = '',
  onSuccess,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [plate, setPlate] = useState(initialPlate);
  const [violationType, setViolationType] = useState<ViolationType>('OVERSTAY');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPlate) {
      setPlate(initialPlate.toUpperCase());
    }
  }, [initialPlate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPlate = plate.trim().toUpperCase();
    if (!cleanPlate) {
      setError('Please provide a valid registration license plate number.');
      return;
    }

    if (!reason.trim()) {
      setError('Please specify the rule violation reason.');
      return;
    }

    setIsLoading(true);
    try {
      const sanitizedId = sanitizePlateId(cleanPlate);
      const blacklistedRecord: BlacklistedVehicle = {
        id: sanitizedId,
        registrationNumber: cleanPlate,
        violationType,
        reason: reason.trim(),
        blacklistedAt: new Date().toISOString(),
        blacklistedBy: currentUser?.email || 'inamatisagar6@gmail.com',
        status: 'ACTIVE',
        notes: notes.trim() || undefined,
      };

      await saveBlacklistedVehicle(blacklistedRecord);
      onSuccess?.(blacklistedRecord);
      onClose();
    } catch (err: any) {
      console.error('Failed to blacklist vehicle:', err);
      setError(err?.message || 'Failed to record blacklist in Firebase. Verify admin permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0e121c] border border-red-500/40 p-6 shadow-[0_0_50px_rgba(239,68,68,0.25)] font-sans">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5 pb-4 border-b border-white/10">
          <div className="p-2.5 rounded-xl bg-red-950 border border-red-500/40 text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-mono tracking-wide">
              Blacklist Vehicle for Rule Violation
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              Action authorized by Administrator ({currentUser?.email || 'inamatisagar6@gmail.com'})
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plate Number */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono uppercase text-gray-400">
              Vehicle Registration Plate <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="e.g. KA-01-MJ-9922"
                className="w-full bg-[#070a12] border border-white/15 focus:border-red-400 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white placeholder-gray-600 focus:outline-none uppercase tracking-wider"
              />
              <Car className="w-4 h-4 text-gray-500 absolute right-3 top-3" />
            </div>
          </div>

          {/* Violation Type */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono uppercase text-gray-400">
              Violation Classification <span className="text-red-400">*</span>
            </label>
            <select
              value={violationType}
              onChange={(e) => setViolationType(e.target.value as ViolationType)}
              className="w-full bg-[#070a12] border border-white/15 focus:border-red-400 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none"
            >
              <option value="OVERSTAY">Overstay / Exceeded Time Limit</option>
              <option value="UNAUTHORIZED_PARKING">Unauthorized Parking in Reserved/Restricted Bay</option>
              <option value="SPEEDING_RECKLESS">Speeding / Reckless Driving Inside Facility</option>
              <option value="UNPAID_EXIT">Unpaid Tariff / Gate Barrier Violation</option>
              <option value="IMPROPER_OBSTRUCTION">Improper Bay Obstruction / Double Parking</option>
              <option value="OTHER">Other Security / Safety Rule Violation</option>
            </select>
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono uppercase text-gray-400">
              Detailed Rule Violation Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the exact rule violation incident (e.g. Vehicle left for 72+ hours obstructing fire lane without valid tariff permit)."
              className="w-full bg-[#070a12] border border-white/15 focus:border-red-400 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none resize-none"
            />
          </div>

          {/* Administrative Notes */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono uppercase text-gray-400">
              Internal Admin Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. CCTV recording archived, security incident #SEC-402"
              className="w-full bg-[#070a12] border border-white/15 focus:border-red-400 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
            />
          </div>

          {/* Warning notice */}
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start space-x-2 text-[11px] text-red-300 font-mono">
            <Lock className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Enforcement Effect:</strong> Once blacklisted, this vehicle will be automatically barred from entering the facility or reserving any parking slots.
            </span>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Blacklisting...' : 'Confirm Blacklist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
