/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserChrome } from './components/BrowserChrome';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { VehicleEntryView } from './components/VehicleEntryView';
import { VehicleExitView } from './components/VehicleExitView';
import { ReportsView } from './components/ReportsView';
import { AdminVehicleHistoryView } from './components/AdminVehicleHistoryView';
import { AdminPortalView } from './components/AdminPortalView';
import { TicketPrintModal } from './components/TicketPrintModal';
import { BackendConfigModal } from './components/BackendConfigModal';
import { FirebaseAuthModal } from './components/FirebaseAuthModal';
import { UserBookingsModal } from './components/UserBookingsModal';
import { completeBookingInFirestore } from './services/firebase';
import { 
  loadStoredState, 
  persistState, 
  getInitialState, 
  formatDateTime,
  loadBackendConfig,
  saveBackendConfig 
} from './services/parkingStore';
import { ParkingSystemState } from './services/parkingStore';
import { Ticket, Payment, VehicleType, PaymentMethod, User, Vehicle, BackendConfig } from './types/parking';
import { BackendClient } from './services/backendClient';
import { sqlApi } from './services/sqlApi';

export default function App() {
  const [state, setState] = useState<ParkingSystemState>(() => loadStoredState());
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [entryPreSelectedSlot, setEntryPreSelectedSlot] = useState<string | undefined>(undefined);
  const [exitPreSelectedTicketId, setExitPreSelectedTicketId] = useState<string | undefined>(undefined);
  const [printableTicket, setPrintableTicket] = useState<Ticket | null>(null);

  // Firebase Modals State
  const [isFirebaseAuthModalOpen, setIsFirebaseAuthModalOpen] = useState(false);
  const [isUserBookingsModalOpen, setIsUserBookingsModalOpen] = useState(false);

  // Backend Integration State
  const [backendConfig, setBackendConfig] = useState<BackendConfig>(() => loadBackendConfig());
  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);

  // Sync to localStorage and Relational SQL Database on state changes
  useEffect(() => {
    persistState(state);
    // Keep local SQL relational backend synchronized
    sqlApi.syncState(state).catch(() => {});

    // If backend auto-sync is enabled, forward payload to remote backend
    if (backendConfig.autoSync && backendConfig.mode === 'connected') {
      const client = new BackendClient(backendConfig);
      client.syncFullStateToBackend(state).catch((err) => console.warn('Auto-sync failed:', err));
    }
  }, [state, backendConfig]);

  // Derived metrics
  const availableSlots = state.slots.filter((s) => s.status === 'AVAILABLE');
  const occupiedSlots = state.slots.filter((s) => s.status === 'OCCUPIED');
  const totalRevenue = state.payments.reduce((acc, p) => acc + p.amount, 0);

  // Path mapping for browser chrome simulation
  const getTabPath = (tab: NavTab) => {
    switch (tab) {
      case 'dashboard':
        return '/';
      case 'entry':
        return '/entry';
      case 'exit':
        return '/exit';
      case 'reports':
        return '/reports';
      case 'history':
        return '/admin/history';
      case 'admin':
        return '/admin/portal';
    }
  };

  const handleNavigateByPath = (path: string) => {
    if (path === '/' || path === '') setActiveTab('dashboard');
    else if (path.includes('entry')) setActiveTab('entry');
    else if (path.includes('exit')) setActiveTab('exit');
    else if (path.includes('reports')) setActiveTab('reports');
    else if (path.includes('portal') || path === '/admin') setActiveTab('admin');
    else if (path.includes('history')) setActiveTab('history');
  };

  // Cancel booking locally to release slot and mark cancelled
  const handleCancelLocalBooking = (ticketId: string) => {
    setState((prev) => {
      const targetTicket = prev.tickets.find((t) => t.id === ticketId);
      if (!targetTicket) return prev;

      const exitTime = formatDateTime();
      const updatedTickets = prev.tickets.map((t) =>
        t.id === ticketId ? { ...t, status: 'CANCELLED' as const, exitTime } : t
      );

      const updatedSlots = prev.slots.map((s) =>
        s.id === targetTicket.slotId || s.slotNumber === targetTicket.slotNumber
          ? {
              ...s,
              status: 'AVAILABLE' as const,
              currentTicketId: undefined,
              lastStatusChange: exitTime,
            }
          : s
      );

      return {
        ...prev,
        tickets: updatedTickets,
        slots: updatedSlots,
      };
    });
  };

  // Reset demo data handler
  const handleResetData = () => {
    if (window.confirm('Reset VPMS Pro to the initial demonstration baseline?')) {
      const initial = getInitialState();
      setState(initial);
      persistState(initial);
      setActiveTab('dashboard');
    }
  };

  // Handler: Generate Entry Ticket
  const handleGenerateTicket = ({
    registrationNumber,
    vehicleType,
    ownerName,
    preferredSlotNumber,
  }: {
    registrationNumber: string;
    vehicleType: VehicleType;
    ownerName?: string;
    preferredSlotNumber?: string;
  }): Ticket | null => {
    // 1. Identify target slot
    let targetSlot = state.slots.find(
      (s) => s.slotNumber === preferredSlotNumber && s.status === 'AVAILABLE'
    );

    if (!targetSlot) {
      // Find lowest available matching type slot
      targetSlot = state.slots.find(
        (s) => s.status === 'AVAILABLE' && (vehicleType === 'BIKE' ? s.slotType === 'BIKE' : s.slotType === 'CAR')
      );
    }

    if (!targetSlot) {
      // Any available slot fallback
      targetSlot = state.slots.find((s) => s.status === 'AVAILABLE');
    }

    if (!targetSlot) {
      return null;
    }

    const currentTimestamp = formatDateTime();

    // 2. Format ticket ID
    const ticketIdNumber = state.nextTicketNumber;
    const ticketId = `TKT-${ticketIdNumber.toString().padStart(4, '0')}`;

    // 3. User & Vehicle entities (ER: USER (1) <-> VEHICLE (N) via OWNS)
    let user = state.users.find((u) => ownerName && u.name.toLowerCase() === ownerName.toLowerCase());
    if (!user && ownerName) {
      user = {
        id: `user-${Date.now()}`,
        name: ownerName,
        createdAt: currentTimestamp,
      };
    }

    let vehicle = state.vehicles.find(
      (v) => v.registrationNumber.toUpperCase() === registrationNumber.toUpperCase()
    );
    if (!vehicle) {
      vehicle = {
        id: `veh-${Date.now()}`,
        userId: user?.id,
        registrationNumber: registrationNumber.toUpperCase(),
        vehicleType,
        ownerName: ownerName || undefined,
      };
    }

    // 4. Ticket entity (ER: VEHICLE (1) <-> BOOKING (N) via MAKES, assigned to PARKING SLOT (N:1))
    const newTicket: Ticket = {
      id: ticketId,
      vehicleId: vehicle.id,
      registrationNumber: registrationNumber.toUpperCase(),
      vehicleType,
      ownerName: ownerName || undefined,
      slotId: targetSlot.id,
      slotNumber: targetSlot.slotNumber,
      floor: targetSlot.floor,
      entryTime: currentTimestamp,
      status: 'ACTIVE',
      baseRatePerHour: vehicleType === 'BIKE' ? 20 : vehicleType === 'CAR' ? 40 : 60,
    };

    // 5. Update slot to OCCUPIED and assign ticket & update lastStatusChange
    const updatedSlots = state.slots.map((s) =>
      s.id === targetSlot!.id
        ? { 
            ...s, 
            status: 'OCCUPIED' as const, 
            currentTicketId: ticketId,
            lastStatusChange: currentTimestamp 
          }
        : s
    );

    // 6. Update sensor telemetry
    const updatedSensors = state.sensors.map((sn) =>
      sn.slotId === targetSlot!.id
        ? { 
            ...sn, 
            lastPing: new Date().toISOString(),
            lastStatusChange: currentTimestamp
          }
        : sn
    );

    // Update state
    setState((prev) => ({
      ...prev,
      users: user && !prev.users.some((u) => u.id === user!.id) ? [...prev.users, user] : prev.users,
      vehicles: !prev.vehicles.some((v) => v.id === vehicle!.id) ? [...prev.vehicles, vehicle] : prev.vehicles,
      slots: updatedSlots,
      sensors: updatedSensors,
      tickets: [newTicket, ...prev.tickets],
      nextTicketNumber: prev.nextTicketNumber + 1,
    }));

    return newTicket;
  };

  // Handler: Process Exit & Payment
  const handleProcessExit = ({
    ticketId,
    paymentMethod,
    amount,
    durationFormatted,
    exitTime,
  }: {
    ticketId: string;
    paymentMethod: PaymentMethod;
    amount: number;
    durationFormatted: string;
    exitTime: string;
  }): Payment | null => {
    const targetTicket = state.tickets.find((t) => t.id === ticketId);
    if (!targetTicket) return null;

    const paymentIdNumber = state.nextPaymentNumber;
    const paymentId = `PAY-${paymentIdNumber.toString().padStart(4, '0')}`;

    // 1. Payment entity (ER: BOOKING (1) <-> PAYMENT (1))
    const newPayment: Payment = {
      id: paymentId,
      ticketId: targetTicket.id,
      registrationNumber: targetTicket.registrationNumber,
      amount,
      paymentMethod,
      paymentTime: exitTime,
      status: 'PAID',
      durationFormatted,
    };

    // 2. Mark ticket completed
    const updatedTickets = state.tickets.map((t) =>
      t.id === targetTicket.id
        ? { ...t, status: 'COMPLETED' as const, exitTime }
        : t
    );

    // Sync completion to Firebase Firestore
    completeBookingInFirestore(targetTicket.id, exitTime, amount);

    // 3. Release slot to AVAILABLE & stamp lastStatusChange
    const updatedSlots = state.slots.map((s) =>
      s.id === targetTicket.slotId || s.slotNumber === targetTicket.slotNumber
        ? { 
            ...s, 
            status: 'AVAILABLE' as const, 
            currentTicketId: undefined,
            lastStatusChange: exitTime 
          }
        : s
    );

    // 4. Update sensor telemetry
    const updatedSensors = state.sensors.map((sn) =>
      sn.slotId === targetTicket.slotId
        ? { 
            ...sn, 
            lastPing: new Date().toISOString(),
            lastStatusChange: exitTime 
          }
        : sn
    );

    setState((prev) => ({
      ...prev,
      slots: updatedSlots,
      sensors: updatedSensors,
      tickets: updatedTickets,
      payments: [newPayment, ...prev.payments],
      nextPaymentNumber: prev.nextPaymentNumber + 1,
    }));

    return newPayment;
  };

  const handleNavigateToEntry = (preferredSlot?: string) => {
    setEntryPreSelectedSlot(preferredSlot);
    setActiveTab('entry');
  };

  const handleNavigateToExit = (ticketId?: string) => {
    setExitPreSelectedTicketId(ticketId);
    setActiveTab('exit');
  };

  const handleSaveBackendConfig = (config: BackendConfig) => {
    setBackendConfig(config);
    saveBackendConfig(config);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* 1. Browser Chrome Simulation */}
      <BrowserChrome
        currentPath={getTabPath(activeTab)}
        onNavigate={handleNavigateByPath}
        onRefresh={() => setState(loadStoredState())}
      />

      {/* 2. Top Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setEntryPreSelectedSlot(undefined);
          setExitPreSelectedTicketId(undefined);
        }}
        onResetData={handleResetData}
        occupiedCount={occupiedSlots.length}
        availableCount={availableSlots.length}
        onOpenBackendModal={() => setIsBackendModalOpen(true)}
        onOpenAuthModal={() => setIsFirebaseAuthModalOpen(true)}
        onOpenBookingsModal={() => setIsUserBookingsModalOpen(true)}
      />

      {/* 3. Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            slots={state.slots}
            sensors={state.sensors}
            tickets={state.tickets}
            totalRevenue={totalRevenue}
            onNavigateToEntry={handleNavigateToEntry}
            onNavigateToExit={handleNavigateToExit}
            onViewTicketPrint={(ticket) => setPrintableTicket(ticket)}
            onOpenAuthModal={() => setIsFirebaseAuthModalOpen(true)}
            onOpenBookingsModal={() => setIsUserBookingsModalOpen(true)}
          />
        )}

        {activeTab === 'entry' && (
          <VehicleEntryView
            availableSlots={availableSlots}
            initialSlotNumber={entryPreSelectedSlot}
            onGenerateTicket={handleGenerateTicket}
            onViewTicketPrint={(ticket) => setPrintableTicket(ticket)}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'exit' && (
          <VehicleExitView
            activeTickets={state.tickets.filter((t) => t.status === 'ACTIVE')}
            initialTicketId={exitPreSelectedTicketId}
            onProcessExit={handleProcessExit}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            onNavigateToReports={() => setActiveTab('reports')}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            tickets={state.tickets}
            payments={state.payments}
            users={state.users}
            vehicles={state.vehicles}
            sensors={state.sensors}
            slots={state.slots}
            onNavigateToExit={handleNavigateToExit}
            onViewTicketPrint={(ticket) => setPrintableTicket(ticket)}
          />
        )}

        {/* 4. Vehicle Parking History View */}
        {activeTab === 'history' && (
          <AdminVehicleHistoryView
            tickets={state.tickets}
            payments={state.payments}
            slots={state.slots}
            onViewTicketPrint={(ticket) => setPrintableTicket(ticket)}
            onNavigateToExit={handleNavigateToExit}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {/* 5. Master Admin Portal */}
        {activeTab === 'admin' && (
          <AdminPortalView
            slots={state.slots}
            tickets={state.tickets}
            payments={state.payments}
            onViewTicketPrint={(ticket) => setPrintableTicket(ticket)}
            onNavigateToExit={handleNavigateToExit}
            onCancelLocalBooking={handleCancelLocalBooking}
          />
        )}
      </main>

      {/* Ticket Pass Print Modal */}
      <TicketPrintModal
        ticket={printableTicket}
        onClose={() => setPrintableTicket(null)}
      />

      {/* Firebase Authentication Modal */}
      <FirebaseAuthModal
        isOpen={isFirebaseAuthModalOpen}
        onClose={() => setIsFirebaseAuthModalOpen(false)}
      />

      {/* Firebase Cloud Bookings Modal */}
      <UserBookingsModal
        isOpen={isUserBookingsModalOpen}
        onClose={() => setIsUserBookingsModalOpen(false)}
        onViewTicketPrint={(ticket) => setPrintableTicket(ticket)}
        onNavigateToEntry={() => {
          setIsUserBookingsModalOpen(false);
          setActiveTab('entry');
        }}
      />

      {/* Backend API Node Connector Modal */}
      <BackendConfigModal
        isOpen={isBackendModalOpen}
        onClose={() => setIsBackendModalOpen(false)}
        config={backendConfig}
        onSaveConfig={handleSaveBackendConfig}
        currentState={state}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 bg-[#090d16] text-xs text-gray-500 text-center font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>
              VPMS Pro Cloud Hub · Node #{backendConfig.mode === 'connected' ? 'REMOTE-SYNC' : 'STANDALONE'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="text-cyan-400 hover:underline cursor-pointer"
            >
              Vehicle History
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="text-red-400 hover:text-red-300 hover:underline cursor-pointer flex items-center space-x-1"
            >
              <span>Admin Portal</span>
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsBackendModalOpen(true)}
              className="hover:text-cyan-400 underline cursor-pointer"
            >
              Backend API Gateway ({backendConfig.mode})
            </button>
            <span>·</span>
            <span>Automated AI Bay Routing & Tariff Ledger · 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
