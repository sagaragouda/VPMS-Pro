import React, { useEffect, useState } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Car, 
  CheckCircle2, 
  CircleParking, 
  Printer, 
  Cloud, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeToUserBookings } from '../services/firebase';
import { FirebaseBooking, Ticket } from '../types/parking';

interface UserBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewTicketPrint?: (ticket: Ticket) => void;
  onNavigateToEntry?: () => void;
}

export const UserBookingsModal: React.FC<UserBookingsModalProps> = ({
  isOpen,
  onClose,
  onViewTicketPrint,
  onNavigateToEntry,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [bookings, setBookings] = useState<FirebaseBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !currentUser) {
      setBookings([]);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserBookings(currentUser.uid, (data) => {
      setBookings(data);
      setLoading(false);
    }, (err) => {
      console.warn('Error fetching bookings from Firestore:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#0d131f] border border-cyan-500/40 p-6 shadow-[0_0_40px_rgba(0,240,255,0.2)] max-h-[90vh] flex flex-col">
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
          <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-white font-mono tracking-wide">
                My Cloud Bookings
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold">
                Firebase Firestore
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Account: <strong className="text-white">{userProfile?.name || currentUser?.displayName || currentUser?.email}</strong>
            </p>
          </div>
        </div>

        {/* List of bookings */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="py-12 text-center text-xs font-mono text-gray-400 space-y-2">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p>Fetching your cloud bookings from Firestore...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
                <CircleParking className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">No Cloud Bookings Yet</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                You have not booked any parking slots with this account yet. Reserve an available slot to save your digital pass.
              </p>
              {onNavigateToEntry && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToEntry();
                  }}
                  className="glow-cyan-btn px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                >
                  Book a Slot Now →
                </button>
              )}
            </div>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="cyber-card p-4 border-white/10 hover:border-cyan-500/40 bg-[#090d16] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-cyan-300">
                      {b.ticketNumber || b.id}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                        b.status === 'ACTIVE'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {b.status}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                      {b.vehicleType}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-300 font-mono">
                    <span className="flex items-center space-x-1">
                      <Car className="w-3.5 h-3.5 text-gray-400" />
                      <strong className="text-white">{b.registrationNumber}</strong>
                    </span>
                    <span className="flex items-center space-x-1">
                      <CircleParking className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Slot: <strong className="text-cyan-300">{b.slotNumber}</strong> (Floor {b.floor})</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-gray-500 font-mono">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span>Entry: {new Date(b.entryTime).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-center">
                  {onViewTicketPrint && (
                    <button
                      type="button"
                      onClick={() => {
                        onViewTicketPrint({
                          id: b.id,
                          vehicleId: `veh-${b.id}`,
                          slotId: b.slotId,
                          slotNumber: b.slotNumber,
                          floor: b.floor || 1,
                          registrationNumber: b.registrationNumber,
                          vehicleType: b.vehicleType,
                          ownerName: b.userName || userProfile?.name || 'Driver',
                          entryTime: b.entryTime,
                          exitTime: b.exitTime,
                          status: b.status,
                          baseRatePerHour: b.vehicleType === 'BIKE' ? 20 : b.vehicleType === 'CAR' ? 40 : 60,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-950/60 border border-white/10 hover:border-cyan-500/40 text-xs font-mono text-gray-300 hover:text-cyan-300 transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-cyan-400" />
                      <span>View Pass</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-3 mt-3 flex items-center justify-between text-[11px] font-mono text-gray-500">
          <span>Synced with Firebase Firestore in real-time</span>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
