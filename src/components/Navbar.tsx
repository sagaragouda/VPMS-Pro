import React, { useState, useRef, useEffect } from 'react';
import { 
  Car, 
  LayoutGrid, 
  ArrowDownLeft, 
  ArrowUpRight, 
  BarChart3, 
  RotateCcw,
  History,
  Cloud,
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab = 'dashboard' | 'entry' | 'exit' | 'reports' | 'history' | 'admin';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onResetData: () => void;
  occupiedCount: number;
  availableCount: number;
  onOpenAuthModal: () => void;
  onOpenBookingsModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onResetData,
  occupiedCount,
  availableCount,
  onOpenAuthModal,
  onOpenBookingsModal,
}) => {
  const { currentUser, userProfile, isAdmin, logOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);
  return (
    <header className="sticky top-0 z-40 bg-[#0b0f17]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <div 
          onClick={() => onSelectTab('dashboard')} 
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all">
            <Car className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-extrabold tracking-tight text-white leading-none inline-flex items-center group-hover:text-cyan-400 transition-colors">
                VPMS <span className="text-cyan-400 font-mono ml-1">Pro</span>
              </span>
              <span className="inline-flex items-center text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-bold leading-none tracking-wider self-center">
                Command Hub
              </span>
            </div>
            <span className="text-[11px] text-gray-400 font-medium hidden sm:block leading-tight mt-1">Vehicle Parking Management System</span>
          </div>
        </div>

        {/* Center / Right: Navigation Tabs and Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <nav className="flex items-center space-x-1 sm:space-x-1.5">
            {/* Dashboard tab */}
            <button
              type="button"
              onClick={() => onSelectTab('dashboard')}
              className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-cyan-400" />
              <span>Dashboard</span>
              {activeTab === 'dashboard' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-400 shadow-[0_0_8px_#00f0ff] rounded-full"></span>
              )}
            </button>

            {/* Vehicle Entry tab */}
            <button
              type="button"
              onClick={() => onSelectTab('entry')}
              className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'entry'
                  ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              <span>Vehicle Entry</span>
              {activeTab === 'entry' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-400 shadow-[0_0_8px_#00f0ff] rounded-full"></span>
              )}
            </button>

            {/* Vehicle Exit tab */}
            <button
              type="button"
              onClick={() => onSelectTab('exit')}
              className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'exit'
                  ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
              <span>Vehicle Exit</span>
              {occupiedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              )}
              {activeTab === 'exit' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-400 shadow-[0_0_8px_#00f0ff] rounded-full"></span>
              )}
            </button>

            {/* Reports tab */}
            <button
              type="button"
              onClick={() => onSelectTab('reports')}
              className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Reports</span>
              {activeTab === 'reports' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-400 shadow-[0_0_8px_#00f0ff] rounded-full"></span>
              )}
            </button>

            {/* Parking History Tab */}
            <button
              type="button"
              onClick={() => onSelectTab('history')}
              className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-gray-400 hover:text-cyan-300 hover:bg-white/5'
              }`}
            >
              <History className="w-4 h-4 text-cyan-400" />
              <span>Parking History</span>
              {activeTab === 'history' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-400 shadow-[0_0_8px_#00f0ff] rounded-full"></span>
              )}
            </button>

            {/* Admin Portal Tab */}
            <button
              type="button"
              onClick={() => onSelectTab('admin')}
              className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'text-red-300 bg-red-950/60 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                  : 'text-gray-400 hover:text-red-300 hover:bg-white/5'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Admin Portal</span>
              {isAdmin && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-red-900/80 border border-red-500/50 text-red-200 font-bold uppercase ml-0.5 hidden lg:inline">
                  Admin
                </span>
              )}
              {activeTab === 'admin' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-red-400 shadow-[0_0_8px_#ef4444] rounded-full"></span>
              )}
            </button>
          </nav>

          {/* Right Action Tools: Cloud Bookings, Firebase Auth, Backend Connector & Reset */}
          <div className="flex items-center space-x-2 pl-2 border-l border-white/10">
            {/* My Cloud Bookings button (when authenticated) */}
            {currentUser && (
              <button
                type="button"
                onClick={onOpenBookingsModal}
                title="View your cloud bookings stored in Firestore"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-medium flex items-center space-x-1.5 transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)] cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">My Bookings</span>
              </button>
            )}

            {/* Firebase Auth Status Button or Sign In Button */}
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-1.5 bg-[#0e1422] hover:bg-[#131c30] border border-cyan-500/40 rounded-xl px-2.5 py-1 transition-all cursor-pointer select-none text-xs font-mono"
                >
                  <div className="w-5 h-5 rounded-full bg-cyan-900 border border-cyan-400 text-cyan-200 flex items-center justify-center font-bold text-[10px]">
                    {(userProfile?.name || currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className="text-gray-200 font-semibold hidden md:inline truncate max-w-[120px]">
                    {userProfile?.name?.split(' ')[0] || currentUser.displayName?.split(' ')[0] || 'Driver'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0b1019] border border-cyan-500/40 shadow-[0_0_25px_rgba(0,0,0,0.8)] p-2.5 z-50 animate-in fade-in duration-150 font-mono text-xs">
                    <div className="px-3 py-2 border-b border-white/10 mb-1.5">
                      <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
                        Firebase Connected
                      </span>
                      <span className="text-white font-bold truncate block">
                        {userProfile?.name || currentUser.displayName || 'Driver'}
                      </span>
                      <span className="text-[11px] text-gray-400 truncate block">
                        {currentUser.email}
                      </span>
                      {userProfile?.vehicleNumber && (
                        <span className="text-[10px] text-cyan-400 block mt-0.5">
                          Plate: {userProfile.vehicleNumber}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenBookingsModal();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 flex items-center space-x-2 text-gray-300 transition-colors cursor-pointer"
                    >
                      <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                      <span>View My Cloud Bookings</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onSelectTab('entry');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 flex items-center space-x-2 text-gray-300 transition-colors cursor-pointer"
                    >
                      <Car className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Book Parking Slot</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onSelectTab('admin');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-950/60 hover:text-red-300 flex items-center space-x-2 text-red-300 transition-colors cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      <span>Master Admin Portal</span>
                    </button>

                    <div className="border-t border-white/10 mt-1.5 pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          logOut();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 flex items-center space-x-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out of Firebase</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="glow-cyan-btn px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.3)]"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-300" />
                <span>Sign In / Sign Up</span>
              </button>
            )}

            {/* Reset Demo button */}
            <button
              type="button"
              onClick={onResetData}
              title="Reset System to Initial Baseline Demo"
              className="p-2 text-gray-500 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
