import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  LogIn, 
  Car, 
  Bike, 
  Truck, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Printer, 
  Trash2, 
  RefreshCw, 
  Cloud, 
  IndianRupee, 
  Plus, 
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  X,
  Database,
  Terminal,
  Play,
  Table,
  FileCode
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sqlApi, SqlStats, SqlQueryResult } from '../services/sqlApi';
import { 
  subscribeToAllBookings, 
  subscribeToBlacklist, 
  cancelBookingInFirestore, 
  revokeBlacklistedVehicle, 
  deleteBlacklistedVehicle,
  saveBlacklistedVehicle,
  sendResetPasswordEmail,
  ADMIN_EMAIL,
  ADMIN_DEFAULT_PASS
} from '../services/firebase';
import { Ticket, ParkingSlot, Payment, FirebaseBooking, BlacklistedVehicle, VehicleType } from '../types/parking';
import { BlacklistVehicleModal } from './BlacklistVehicleModal';

interface AdminPortalViewProps {
  slots: ParkingSlot[];
  tickets: Ticket[];
  payments: Payment[];
  onViewTicketPrint?: (ticket: Ticket) => void;
  onNavigateToExit?: (ticketId: string) => void;
  onCancelLocalBooking?: (ticketId: string) => void;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  slots,
  tickets,
  payments,
  onViewTicketPrint,
  onNavigateToExit,
  onCancelLocalBooking,
}) => {
  const { currentUser, userProfile, isAdmin, signInWithEmail, signInWithGoogle, logOut } = useAuth();

  // Admin Login Form State
  const [adminEmail, setAdminEmail] = useState(ADMIN_EMAIL);
  const [adminPassword, setAdminPassword] = useState(ADMIN_DEFAULT_PASS);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Forgot Password State
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setResetError(null);
    setResetEmailSent(null);
    setIsSendingReset(true);
    const targetEmail = adminEmail.trim() || ADMIN_EMAIL;
    try {
      await sendResetPasswordEmail(targetEmail);
      setResetEmailSent(`Official password reset instructions dispatched to ${targetEmail}. Please check your inbox or spam folder.`);
    } catch (err: any) {
      console.warn('Password reset notice:', err);
      const msg = err?.message || String(err);
      if (msg.includes('user-not-found')) {
        setResetEmailSent(`If an account is associated with ${targetEmail}, a reset email has been queued.`);
      } else {
        setResetError(msg || 'Failed to dispatch reset email. Please verify network and email.');
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  // Portal Navigation Tabs
  const [activePortalTab, setActivePortalTab] = useState<'bookings' | 'blacklist' | 'sql_terminal'>('bookings');

  // SQL Relational Backend States
  const [sqlStats, setSqlStats] = useState<SqlStats | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string>(
    'SELECT floor, slot_type, COUNT(*) as total_slots, SUM(CASE WHEN status = \'OCCUPIED\' THEN 1 ELSE 0 END) as occupied_count FROM parking_slots GROUP BY floor, slot_type;'
  );
  const [sqlResult, setSqlResult] = useState<SqlQueryResult | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [isRunningQuery, setIsRunningQuery] = useState(false);
  const [isSyncingSql, setIsSyncingSql] = useState(false);
  const [selectedInspectTable, setSelectedInspectTable] = useState<string>('parking_slots');

  // Load SQL stats on mount
  useEffect(() => {
    sqlApi.getStats().then((stats) => {
      if (stats) setSqlStats(stats);
    });
  }, []);

  const handleExecuteSqlQuery = async (overrideQuery?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : sqlQuery).trim();
    if (!q) return;
    setIsRunningQuery(true);
    setSqlError(null);
    try {
      const res = await sqlApi.runQuery(q);
      setSqlResult(res);
      const updatedStats = await sqlApi.getStats();
      if (updatedStats) setSqlStats(updatedStats);
    } catch (err: any) {
      setSqlError(err?.message || 'SQL Execution failed');
      setSqlResult(null);
    } finally {
      setIsRunningQuery(false);
    }
  };

  const handleSyncToSql = async () => {
    setIsSyncingSql(true);
    try {
      const ok = await sqlApi.syncState({ slots, tickets, payments });
      if (ok) {
        setActionSuccess('Synchronized slots, tickets, and payments to Relational SQLite backend!');
        setTimeout(() => setActionSuccess(null), 4000);
        const updatedStats = await sqlApi.getStats();
        if (updatedStats) setSqlStats(updatedStats);
      } else {
        setSqlError('Failed to synchronize with SQL backend.');
      }
    } catch (err: any) {
      setSqlError(err?.message || 'Sync error');
    } finally {
      setIsSyncingSql(false);
    }
  };

  const handleInspectTable = (tableName: string) => {
    setSelectedInspectTable(tableName);
    const q = `SELECT * FROM ${tableName} ORDER BY 1 DESC LIMIT 20;`;
    setSqlQuery(q);
    handleExecuteSqlQuery(q);
  };

  // Firestore Real-Time Data
  const [cloudBookings, setCloudBookings] = useState<FirebaseBooking[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistedVehicle[]>([]);

  // Filter States for Bookings
  const [bookingSearch, setBookingSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | VehicleType>('ALL');

  // Filter States for Blacklist
  const [blacklistSearch, setBlacklistSearch] = useState('');

  // Blacklist Modal State
  const [isBlacklistModalOpen, setIsBlacklistModalOpen] = useState(false);
  const [targetPlateForBlacklist, setTargetPlateForBlacklist] = useState('');

  // Action status message
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Subscribe to real-time Firestore bookings
  useEffect(() => {
    let unsubBookings: () => void = () => {};
    if (currentUser) {
      unsubBookings = subscribeToAllBookings((data) => {
        setCloudBookings(data);
      });
    } else {
      setCloudBookings([]);
    }

    const unsubBlacklist = subscribeToBlacklist((data) => {
      setBlacklist(data);
    });

    return () => {
      unsubBookings();
      unsubBlacklist();
    };
  }, [currentUser]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      if (adminEmail.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        setLoginError(`Access Restricted: Only administrator email (${ADMIN_EMAIL}) is permitted.`);
        setIsLoggingIn(false);
        return;
      }
      await signInWithEmail(adminEmail.trim(), adminPassword);
    } catch (err: any) {
      console.error('Admin login attempt:', err);
      // Guarantee access for configured master credentials
      if (
        adminEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
        adminPassword.trim() === ADMIN_DEFAULT_PASS
      ) {
        localStorage.setItem('vpms_master_admin_session', 'true');
        window.location.reload();
        return;
      }
      const msg = err?.message || '';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        setLoginError('Invalid password. Please verify admin password.');
      } else {
        setLoginError(msg || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAutoFillCredentials = () => {
    setAdminEmail(ADMIN_EMAIL);
    setAdminPassword(ADMIN_DEFAULT_PASS);
  };

  // Merge local tickets with Cloud Firestore bookings
  const mergedBookings = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Add local tickets
    tickets.forEach((t) => {
      map.set(t.id, {
        id: t.id,
        ticketNumber: t.id,
        registrationNumber: t.registrationNumber,
        vehicleType: t.vehicleType,
        ownerName: t.ownerName || 'Visitor',
        userEmail: undefined,
        slotNumber: t.slotNumber,
        floor: t.floor,
        entryTime: t.entryTime,
        exitTime: t.exitTime,
        status: t.status,
        baseRatePerHour: t.baseRatePerHour,
        isCloudSynced: false,
      });
    });

    // 2. Add or update with Firestore bookings
    cloudBookings.forEach((cb) => {
      const existing = map.get(cb.id) || map.get(cb.ticketNumber);
      map.set(cb.id, {
        id: cb.id,
        ticketNumber: cb.ticketNumber || cb.id,
        registrationNumber: cb.registrationNumber,
        vehicleType: cb.vehicleType,
        ownerName: cb.userName || existing?.ownerName || 'Driver',
        userEmail: cb.userEmail,
        slotNumber: cb.slotNumber,
        floor: cb.floor || 1,
        entryTime: cb.entryTime,
        exitTime: cb.exitTime || existing?.exitTime,
        status: cb.status,
        fee: cb.fee,
        isCloudSynced: true,
      });
    });

    const list = Array.from(map.values());
    list.sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
    return list;
  }, [tickets, cloudBookings]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return mergedBookings.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && b.vehicleType !== typeFilter) return false;

      if (!bookingSearch.trim()) return true;
      const q = bookingSearch.toLowerCase();
      return (
        b.registrationNumber.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.slotNumber.toLowerCase().includes(q) ||
        (b.ownerName && b.ownerName.toLowerCase().includes(q)) ||
        (b.userEmail && b.userEmail.toLowerCase().includes(q))
      );
    });
  }, [mergedBookings, statusFilter, typeFilter, bookingSearch]);

  // Filter blacklist
  const filteredBlacklist = useMemo(() => {
    return blacklist.filter((b) => {
      if (!blacklistSearch.trim()) return true;
      const q = blacklistSearch.toLowerCase();
      return (
        b.registrationNumber.toLowerCase().includes(q) ||
        b.reason.toLowerCase().includes(q) ||
        b.violationType.toLowerCase().includes(q)
      );
    });
  }, [blacklist, blacklistSearch]);

  // Quick lookup for blacklisted plates
  const activeBlacklistSet = useMemo(() => {
    const s = new Set<string>();
    blacklist.forEach((b) => {
      if (b.status === 'ACTIVE') {
        s.add(b.registrationNumber.toUpperCase());
        s.add(b.id.toUpperCase());
      }
    });
    return s;
  }, [blacklist]);

  // Cancel booking handler
  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm(`Are you sure you want to cancel booking ${bookingId} and release the slot?`)) {
      return;
    }
    try {
      await cancelBookingInFirestore(bookingId);
      onCancelLocalBooking?.(bookingId);
      setActionSuccess(`Booking ${bookingId} successfully cancelled and marked in cloud.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`Could not cancel booking: ${err?.message}`);
    }
  };

  // Revoke Blacklist handler
  const handleToggleBlacklistStatus = async (item: BlacklistedVehicle) => {
    try {
      if (item.status === 'ACTIVE') {
        await revokeBlacklistedVehicle(item.id);
        setActionSuccess(`Blacklist penalty for ${item.registrationNumber} REVOKED.`);
      } else {
        await saveBlacklistedVehicle({
          ...item,
          status: 'ACTIVE',
          blacklistedAt: new Date().toISOString(),
          blacklistedBy: currentUser?.email || ADMIN_EMAIL,
        });
        setActionSuccess(`Vehicle ${item.registrationNumber} re-enforced on active blacklist.`);
      }
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`Operation failed: ${err?.message}`);
    }
  };

  // Delete Blacklist record
  const handleDeleteBlacklistRecord = async (item: BlacklistedVehicle) => {
    if (!window.confirm(`Permanently delete blacklist record for ${item.registrationNumber}?`)) {
      return;
    }
    try {
      await deleteBlacklistedVehicle(item.id);
      setActionSuccess(`Vehicle ${item.registrationNumber} removed from blacklist registry.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`Could not delete record: ${err?.message}`);
    }
  };

  // =========================================================================
  // VIEW 1: ADMIN ACCESS GATE (When not authenticated as Admin)
  // =========================================================================
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-in fade-in duration-300 font-sans">
        <div className="cyber-card p-8 border-cyan-500/40 bg-[#0c121e] relative overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.15)]">
          {/* Top glowing bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-amber-400 to-red-500"></div>

          {/* Shield Badge */}
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center mx-auto text-cyan-400 mb-5 shadow-[0_0_25px_rgba(0,240,255,0.3)]">
            <Lock className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SECURE ACCESS GATE</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-wide font-mono uppercase">
              VPMS Master Admin Portal
            </h1>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Restricted portal for facility administrators to inspect all live bookings and enforce vehicle blacklist rules.
            </p>
          </div>

          {/* If logged in as someone else */}
          {currentUser && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-mono flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span>Signed in as <strong>{currentUser.email}</strong> (Non-Admin).</span>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  Only <strong>{ADMIN_EMAIL}</strong> has master administrative access.
                </p>
                <button
                  type="button"
                  onClick={() => logOut()}
                  className="mt-2 text-xs font-bold text-amber-400 underline hover:text-white cursor-pointer"
                >
                  Sign Out & Log In as Admin →
                </button>
              </div>
            </div>
          )}

          {loginError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-mono flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Credentials quick fill helper & credentials information */}
          <div className="mb-5 p-4 rounded-xl bg-[#111827] border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-cyan-400 uppercase font-bold tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Authorized Master Credentials</span>
              </span>
              <button
                type="button"
                onClick={handleAutoFillCredentials}
                className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold flex items-center space-x-1.5 cursor-pointer transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Fill</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono bg-[#070b13] p-3 rounded-lg border border-white/10">
              <div>
                <span className="text-gray-400 text-[10px] block uppercase font-bold">Admin Email</span>
                <span className="text-white font-semibold select-all break-all">{ADMIN_EMAIL}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block uppercase font-bold">Admin Password</span>
                <span className="text-cyan-300 font-semibold select-all break-all">{ADMIN_DEFAULT_PASS}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-mono uppercase text-gray-400 font-semibold">
                Admin Email Address
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="inamatisagar6@gmail.com"
                className="w-full bg-[#070b13] border border-white/15 focus:border-cyan-400 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono uppercase text-gray-400 font-semibold">
                  Master Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  {showAdminPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide Password</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show Password</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showAdminPassword ? "text" : "password"}
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#070b13] border border-white/15 focus:border-cyan-400 rounded-xl pl-4 pr-11 py-3 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  title={showAdminPassword ? "Hide password (Non-visible)" : "Show password (Visible)"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  {showAdminPassword ? (
                    <EyeOff className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Forgot password trigger row */}
              <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                <span className="text-gray-500">
                  Key: <span className="text-gray-400 font-semibold select-all">{ADMIN_DEFAULT_PASS}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPasswordModal(true);
                    setResetError(null);
                    setResetEmailSent(null);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <KeyRound className="w-3 h-3 text-cyan-400" />
                  <span>Forgot Password?</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full glow-cyan-btn py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 shadow-[0_0_20px_rgba(0,240,255,0.3)] mt-2"
            >
              {isLoggingIn ? (
                <span>Authenticating Admin...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Access Admin Control Center</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Google Sign In */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <span className="relative bg-[#0c121e] px-2 text-[10px] font-mono text-gray-500 uppercase">
              Or with Google
            </span>
          </div>

          <button
            type="button"
            onClick={async () => {
              setLoginError(null);
              try {
                await signInWithGoogle();
              } catch (err: any) {
                setLoginError(err?.message || 'Google Sign-in failed.');
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-semibold text-xs tracking-wider flex items-center justify-center space-x-2.5 transition-all cursor-pointer shadow-md"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google ({ADMIN_EMAIL})</span>
          </button>

          {/* Forgot Password Reset Modal */}
          {showForgotPasswordModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="relative w-full max-w-md rounded-2xl bg-[#0d131f] border border-cyan-500/40 p-6 shadow-[0_0_40px_rgba(0,240,255,0.25)] space-y-4">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-mono tracking-wide">
                      Reset Admin Password
                    </h3>
                    <p className="text-xs text-gray-400">
                      Firebase Authentication Password Recovery
                    </p>
                  </div>
                </div>

                {resetError && (
                  <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                {resetEmailSent ? (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-start space-x-2.5">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                      <div>
                        <p className="font-semibold">{resetEmailSent}</p>
                        <p className="text-[11px] text-emerald-400/90 mt-1">
                          Click the secure link in your email to choose a new password. You can also log in immediately using the master key: <span className="font-mono font-bold select-all bg-emerald-900/60 px-1 py-0.5 rounded">{ADMIN_DEFAULT_PASS}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(false)}
                      className="w-full py-2.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold uppercase transition-all cursor-pointer"
                    >
                      Return to Login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-3.5">
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Enter your administrator email address below. We'll send an official Firebase password reset link directly to your inbox.
                    </p>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono uppercase text-gray-400 font-semibold">
                        Account Email
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="inamatisagar6@gmail.com"
                          className="w-full bg-[#070b13] border border-white/15 focus:border-cyan-400 rounded-xl pl-4 pr-10 py-2.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
                        />
                        <Mail className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#090e18] border border-white/10 text-xs font-mono text-gray-400 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 block">Default Master Password</span>
                      <p className="text-white font-semibold select-all">{ADMIN_DEFAULT_PASS}</p>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowForgotPasswordModal(false)}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-mono text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSendingReset}
                        className="flex-1 glow-cyan-btn py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSendingReset ? (
                          <span>Sending...</span>
                        ) : (
                          <>
                            <Mail className="w-3.5 h-3.5" />
                            <span>Send Reset Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED MASTER ADMIN CONTROL PORTAL
  // =========================================================================
  const activeBookingsCount = mergedBookings.filter((b) => b.status === 'ACTIVE').length;
  const activeBlacklistCount = blacklist.filter((b) => b.status === 'ACTIVE').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      {/* Top Admin Header Bar */}
      <div className="cyber-card p-6 border-cyan-500/40 bg-gradient-to-r from-[#0d1424] via-[#090e1a] to-[#120a16] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_30px_rgba(0,240,255,0.15)]">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-cyan-950 border-2 border-cyan-400 text-cyan-400 flex items-center justify-center font-bold text-xl shadow-[0_0_20px_rgba(0,240,255,0.4)]">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-white font-mono tracking-wide">
                MASTER ADMIN PORTAL
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold uppercase">
                Authorized
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Active Administrator: <strong className="text-cyan-300">{currentUser?.email}</strong> · Database: <span className="text-emerald-400 font-bold">vpms-pro-2923e</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-start md:self-center">
          <button
            type="button"
            onClick={() => {
              setTargetPlateForBlacklist('');
              setIsBlacklistModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-300 text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>Blacklist Vehicle</span>
          </button>

          <button
            type="button"
            onClick={() => logOut()}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-mono transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Action Success Toast Feedback */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* KPI Stats Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="cyber-card p-4 bg-[#0a0f19]">
          <span className="text-[11px] font-mono text-gray-400 uppercase block">Total Bookings</span>
          <span className="text-2xl font-black font-mono text-cyan-400 mt-1 block">
            {mergedBookings.length}
          </span>
          <span className="text-[10px] text-gray-500 font-mono">Cloud + Local</span>
        </div>

        <div className="cyber-card p-4 bg-[#0a0f19]">
          <span className="text-[11px] font-mono text-gray-400 uppercase block">Currently Parked</span>
          <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
            {activeBookingsCount}
          </span>
          <span className="text-[10px] text-amber-500/80 font-mono">Active In-Bay</span>
        </div>

        <div className="cyber-card p-4 bg-[#0a0f19] border-red-500/30">
          <span className="text-[11px] font-mono text-red-300 uppercase block">Blacklisted Vehicles</span>
          <span className="text-2xl font-black font-mono text-red-400 mt-1 block">
            {activeBlacklistCount}
          </span>
          <span className="text-[10px] text-red-500/80 font-mono">Barred from Entry</span>
        </div>

        <div className="cyber-card p-4 bg-[#0a0f19]">
          <span className="text-[11px] font-mono text-gray-400 uppercase block">Cloud Synchronized</span>
          <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
            {cloudBookings.length}
          </span>
          <span className="text-[10px] text-emerald-500/80 font-mono">Firestore Records</span>
        </div>
      </div>

      {/* Tabs Navigation: Bookings vs Blacklist */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          type="button"
          onClick={() => setActivePortalTab('bookings')}
          className={`pb-3 px-4 text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activePortalTab === 'bookings'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>All Bookings Control ({mergedBookings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePortalTab('blacklist')}
          className={`pb-3 px-4 text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activePortalTab === 'blacklist'
              ? 'border-red-400 text-red-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Vehicle Blacklist & Violations ({blacklist.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActivePortalTab('sql_terminal');
            if (!sqlStats) sqlApi.getStats().then((s) => s && setSqlStats(s));
          }}
          className={`pb-3 px-4 text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activePortalTab === 'sql_terminal'
              ? 'border-purple-400 text-purple-300'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Database className="w-4 h-4 text-purple-400" />
          <span>Relational SQL Engine & Terminal</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL BOOKINGS CONTROL LEDGER                                        */}
      {/* ========================================================================= */}
      {activePortalTab === 'bookings' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="cyber-card p-4 border-white/10 bg-[#0c121e] flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                placeholder="Search plate, ticket, owner, bay..."
                className="w-full bg-[#070b13] border border-white/15 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[#070b13] border border-white/15 text-white font-mono text-xs rounded-xl px-3 py-2 focus:border-cyan-400 focus:outline-none"
              >
                <option value="ALL">Status: All Bookings</option>
                <option value="ACTIVE">Status: Active In-Bay</option>
                <option value="COMPLETED">Status: Completed Exits</option>
                <option value="CANCELLED">Status: Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-[#070b13] border border-white/15 text-white font-mono text-xs rounded-xl px-3 py-2 focus:border-cyan-400 focus:outline-none"
              >
                <option value="ALL">Type: All Vehicles</option>
                <option value="CAR">Car</option>
                <option value="BIKE">Bike</option>
                <option value="COMMERCIAL">Commercial</option>
              </select>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="cyber-card border border-white/10 overflow-hidden bg-[#0a0f19]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0e1422] text-gray-400 uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Plate / Blacklist Status</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Bay & Floor</th>
                    <th className="py-3 px-4">Driver / Email</th>
                    <th className="py-3 px-4">Entry Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500 font-mono">
                        No bookings match the specified criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => {
                      const isBlacklisted = activeBlacklistSet.has(b.registrationNumber.toUpperCase());
                      return (
                        <tr key={b.id} className="hover:bg-white/5 transition-colors">
                          {/* Ticket */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-white">{b.ticketNumber || b.id}</span>
                              {b.isCloudSynced && (
                                <span title="Saved in Firebase Firestore" className="p-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                                  <Cloud className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Plate & Blacklist status */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-cyan-300 tracking-wider">
                                {b.registrationNumber}
                              </span>
                              {isBlacklisted && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-500/50 font-bold uppercase animate-pulse">
                                  Blacklisted
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Type */}
                          <td className="py-3 px-4 text-gray-300">
                            {b.vehicleType}
                          </td>

                          {/* Bay */}
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-semibold">
                              {b.slotNumber} (F{b.floor})
                            </span>
                          </td>

                          {/* Driver / Email */}
                          <td className="py-3 px-4">
                            <div>
                              <span className="text-white font-medium">{b.ownerName}</span>
                              {b.userEmail && (
                                <span className="block text-[10px] text-gray-400 truncate max-w-[130px]">
                                  {b.userEmail}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Entry Time */}
                          <td className="py-3 px-4 text-gray-400">
                            {b.entryTime}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                                b.status === 'ACTIVE'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                  : b.status === 'COMPLETED'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-red-950 text-red-300 border border-red-500/40'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>

                          {/* Admin Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* 1. Blacklist Vehicle Button */}
                              <button
                                type="button"
                                title="Blacklist this vehicle for rule violations"
                                onClick={() => {
                                  setTargetPlateForBlacklist(b.registrationNumber);
                                  setIsBlacklistModalOpen(true);
                                }}
                                className="px-2 py-1 rounded bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 text-[11px] font-mono flex items-center space-x-1 cursor-pointer transition-colors"
                              >
                                <ShieldAlert className="w-3 h-3 text-red-400" />
                                <span>Blacklist</span>
                              </button>

                              {/* 2. Cancel Booking */}
                              {b.status === 'ACTIVE' && (
                                <button
                                  type="button"
                                  title="Cancel booking and free slot"
                                  onClick={() => handleCancelBooking(b.id)}
                                  className="px-2 py-1 rounded bg-white/5 hover:bg-red-950/40 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-300 text-[11px] font-mono cursor-pointer transition-colors"
                                >
                                  Cancel
                                </button>
                              )}

                              {/* 3. Exit link if active */}
                              {b.status === 'ACTIVE' && onNavigateToExit && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToExit(b.id)}
                                  className="px-2 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono cursor-pointer"
                                >
                                  Exit
                                </button>
                              )}

                              {/* 4. Print pass */}
                              {onViewTicketPrint && (
                                <button
                                  type="button"
                                  title="View audit ticket"
                                  onClick={() => {
                                    onViewTicketPrint({
                                      id: b.id,
                                      vehicleId: `veh-${b.id}`,
                                      slotId: `slot-${b.slotNumber}`,
                                      slotNumber: b.slotNumber,
                                      floor: b.floor || 1,
                                      registrationNumber: b.registrationNumber,
                                      vehicleType: b.vehicleType,
                                      ownerName: b.ownerName,
                                      entryTime: b.entryTime,
                                      exitTime: b.exitTime,
                                      status: b.status,
                                      baseRatePerHour: b.vehicleType === 'BIKE' ? 20 : b.vehicleType === 'CAR' ? 40 : 60,
                                    });
                                  }}
                                  className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VEHICLE BLACKLIST & RULE VIOLATIONS REGISTRY                       */}
      {/* ========================================================================= */}
      {activePortalTab === 'blacklist' && (
        <div className="space-y-4">
          {/* Header & Controls */}
          <div className="cyber-card p-4 border-red-500/30 bg-[#0e111a] flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={blacklistSearch}
                onChange={(e) => setBlacklistSearch(e.target.value)}
                placeholder="Search blacklisted plate, reason..."
                className="w-full bg-[#070a12] border border-white/15 focus:border-red-400 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            </div>

            <button
              type="button"
              onClick={() => {
                setTargetPlateForBlacklist('');
                setIsBlacklistModalOpen(true);
              }}
              className="w-full md:w-auto px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle to Blacklist</span>
            </button>
          </div>

          {/* Blacklist Table */}
          <div className="cyber-card border border-red-500/30 overflow-hidden bg-[#090d16]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#120a16] text-gray-400 uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Registration Plate</th>
                    <th className="py-3 px-4">Violation Classification</th>
                    <th className="py-3 px-4">Rule Violation Details</th>
                    <th className="py-3 px-4">Instituted By</th>
                    <th className="py-3 px-4">Date Blacklisted</th>
                    <th className="py-3 px-4">Ban Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBlacklist.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500 font-mono">
                        No vehicles are currently listed on the blacklist.
                      </td>
                    </tr>
                  ) : (
                    filteredBlacklist.map((item) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        {/* Plate */}
                        <td className="py-3 px-4">
                          <span className="font-bold text-red-400 text-sm tracking-wider">
                            {item.registrationNumber}
                          </span>
                        </td>

                        {/* Violation Type */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-red-950 border border-red-500/40 text-red-300 font-semibold text-[10px]">
                            {item.violationType.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="py-3 px-4 text-gray-200 max-w-xs">
                          <p className="truncate" title={item.reason}>
                            {item.reason}
                          </p>
                          {item.notes && (
                            <span className="text-[10px] text-gray-500 block truncate" title={item.notes}>
                              Note: {item.notes}
                            </span>
                          )}
                        </td>

                        {/* Admin */}
                        <td className="py-3 px-4 text-gray-400">
                          {item.blacklistedBy}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-gray-400">
                          {new Date(item.blacklistedAt).toLocaleDateString()}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                              item.status === 'ACTIVE'
                                ? 'bg-red-950 text-red-300 border border-red-500/50 animate-pulse'
                                : 'bg-gray-800 text-gray-400 border border-gray-700'
                            }`}
                          >
                            {item.status === 'ACTIVE' ? 'Active Ban' : 'Revoked / Inactive'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => handleToggleBlacklistStatus(item)}
                              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer border ${
                                item.status === 'ACTIVE'
                                  ? 'bg-amber-950/60 hover:bg-amber-900 border-amber-500/40 text-amber-300'
                                  : 'bg-emerald-950/60 hover:bg-emerald-900 border-emerald-500/40 text-emerald-300'
                              }`}
                            >
                              {item.status === 'ACTIVE' ? 'Lift Ban' : 'Re-enforce'}
                            </button>

                            <button
                              type="button"
                              title="Delete blacklist record"
                              onClick={() => handleDeleteBlacklistRecord(item)}
                              className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/40 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RELATIONAL SQL ENGINE & QUERY TERMINAL                              */}
      {/* ========================================================================= */}
      {activePortalTab === 'sql_terminal' && (
        <div className="space-y-6">
          {/* SQL Engine Info Card */}
          <div className="cyber-card p-5 border-purple-500/30 bg-gradient-to-r from-[#110e1f] via-[#0d0f1c] to-[#090d16] space-y-4 shadow-[0_0_25px_rgba(168,85,247,0.15)]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-xl bg-purple-950/80 border border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h2 className="text-base font-bold text-white font-mono tracking-wide">
                      RELATIONAL SQL BACKEND ENGINE
                    </h2>
                    <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>ONLINE</span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Engine: <strong className="text-purple-300">Node SQLite 3 (ACID Relational Storage)</strong> · Path: <code className="text-gray-300 bg-black/40 px-1 py-0.5 rounded text-[11px]">data/parking_system.db</code>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2.5 self-start lg:self-center">
                <button
                  type="button"
                  onClick={handleSyncToSql}
                  disabled={isSyncingSql}
                  className="px-3.5 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSql ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSql ? 'Syncing...' : 'Sync Live State to SQL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => sqlApi.getStats().then((s) => s && setSqlStats(s))}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs transition-colors cursor-pointer"
                  title="Refresh SQL Statistics"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Relational Table Stats Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {[
                { name: 'parking_slots', label: 'Parking Slots', count: sqlStats?.tables.parking_slots ?? 0, color: 'text-cyan-400' },
                { name: 'tickets', label: 'Tickets / Bookings', count: sqlStats?.tables.tickets ?? 0, color: 'text-amber-400' },
                { name: 'payments', label: 'Payment Records', count: sqlStats?.tables.payments ?? 0, color: 'text-emerald-400' },
                { name: 'blacklist', label: 'Blacklist Entries', count: sqlStats?.tables.blacklist ?? 0, color: 'text-red-400' },
                { name: 'audit_logs', label: 'Audit Log Trail', count: sqlStats?.tables.audit_logs ?? 0, color: 'text-purple-400' },
              ].map((tbl) => (
                <button
                  key={tbl.name}
                  type="button"
                  onClick={() => handleInspectTable(tbl.name)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedInspectTable === tbl.name
                      ? 'bg-purple-950/60 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                      : 'bg-[#0a0d16] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-400 uppercase">{tbl.label}</span>
                    <Table className="w-3 h-3 text-gray-500" />
                  </div>
                  <span className={`text-xl font-mono font-black mt-1 block ${tbl.color}`}>
                    {tbl.count}
                  </span>
                  <span className="text-[9px] font-mono text-gray-500 block">Click to inspect</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive SQL Terminal Card */}
          <div className="cyber-card p-5 border-white/15 bg-[#090d16] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Interactive SQL Query Terminal
                </h3>
              </div>
              <span className="text-[11px] font-mono text-gray-400">
                Execute SELECT queries, aggregations, relational JOINs, or schema probes
              </span>
            </div>

            {/* Quick Query Preset Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-gray-400 font-bold">
                Analytical Query Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: 'Occupancy by Floor',
                    query: "SELECT floor, slot_type, COUNT(*) as total_slots, SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied_count FROM parking_slots GROUP BY floor, slot_type;",
                  },
                  {
                    label: 'Revenue by Vehicle Type',
                    query: 'SELECT vehicle_type, COUNT(*) as bookings_count, ROUND(AVG(base_rate_per_hour), 2) as avg_rate FROM tickets GROUP BY vehicle_type;',
                  },
                  {
                    label: 'Recent Tickets with Payments (JOIN)',
                    query: 'SELECT t.registration_number, t.slot_number, t.vehicle_type, t.entry_time, t.status, p.amount, p.payment_method FROM tickets t LEFT JOIN payments p ON t.id = p.ticket_id ORDER BY t.entry_time DESC LIMIT 10;',
                  },
                  {
                    label: 'Active Blacklist Records',
                    query: "SELECT registration_number, violation_type, reason, blacklisted_at, blacklisted_by FROM blacklist WHERE status = 'ACTIVE' ORDER BY blacklisted_at DESC;",
                  },
                  {
                    label: 'Available Bays',
                    query: "SELECT id, slot_number, floor, slot_type, price_per_hour FROM parking_slots WHERE status = 'AVAILABLE' LIMIT 15;",
                  },
                  {
                    label: 'Recent Audit Logs',
                    query: 'SELECT id, action, entity_type, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10;',
                  },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSqlQuery(preset.query);
                      handleExecuteSqlQuery(preset.query);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-purple-950/50 border border-white/10 hover:border-purple-500/40 text-[11px] font-mono text-gray-300 hover:text-purple-300 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SQL Code Editor Area */}
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  rows={4}
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="Enter raw SQL (e.g. SELECT * FROM parking_slots WHERE status = 'OCCUPIED';)"
                  className="w-full bg-[#05070d] border border-purple-500/30 focus:border-purple-400 rounded-xl p-3.5 font-mono text-xs text-purple-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-400/40 resize-y leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] font-mono text-gray-500">
                  Tip: Supports full SQLite SQL dialect including CTEs, Window functions, and PRAGMA statements
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSqlQuery('')}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-mono text-xs transition-colors cursor-pointer"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecuteSqlQuery()}
                    disabled={isRunningQuery || !sqlQuery.trim()}
                    className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] cursor-pointer disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 fill-current ${isRunningQuery ? 'animate-spin' : ''}`} />
                    <span>{isRunningQuery ? 'Executing...' : 'Run SQL'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Query Error Notice */}
            {sqlError && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono flex items-center space-x-2.5 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>SQL Error: {sqlError}</span>
              </div>
            )}

            {/* Query Results Table */}
            {sqlResult && (
              <div className="space-y-2 pt-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-mono text-gray-400 border-b border-white/10 pb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-purple-300 font-bold">
                      Rows returned: {sqlResult.rowCount}
                    </span>
                    <span className="text-gray-500">·</span>
                    <span className="text-emerald-400">
                      Execution time: {sqlResult.executionTimeMs} ms
                    </span>
                  </div>
                  <span className="text-gray-500 text-[10px]">
                    Columns: {sqlResult.columns.join(', ')}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#060911] max-h-96">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0e1424] text-purple-300 uppercase tracking-wider sticky top-0 border-b border-white/10">
                      <tr>
                        {sqlResult.columns.map((col, idx) => (
                          <th key={idx} className="py-2.5 px-3 whitespace-nowrap font-semibold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sqlResult.rows.length === 0 ? (
                        <tr>
                          <td colSpan={sqlResult.columns.length || 1} className="py-8 text-center text-gray-500">
                            Empty result set (0 rows returned)
                          </td>
                        </tr>
                      ) : (
                        sqlResult.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-purple-950/20 transition-colors">
                            {sqlResult.columns.map((col, cIdx) => {
                              const val = row[col];
                              return (
                                <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-gray-200">
                                  {val === null || val === undefined ? (
                                    <span className="text-gray-600 italic">NULL</span>
                                  ) : typeof val === 'number' ? (
                                    <span className="text-cyan-300">{val}</span>
                                  ) : typeof val === 'boolean' ? (
                                    <span className={val ? 'text-emerald-400' : 'text-red-400'}>
                                      {String(val)}
                                    </span>
                                  ) : (
                                    <span>{String(val)}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Blacklist Modal */}
      <BlacklistVehicleModal
        isOpen={isBlacklistModalOpen}
        onClose={() => setIsBlacklistModalOpen(false)}
        initialPlate={targetPlateForBlacklist}
        onSuccess={(vehicle) => {
          setActionSuccess(`Vehicle ${vehicle.registrationNumber} has been added to the Active Blacklist.`);
          setTimeout(() => setActionSuccess(null), 4000);
        }}
      />
    </div>
  );
};
