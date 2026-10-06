import { 
  ParkingSlot, 
  Ticket, 
  Payment, 
  Vehicle, 
  User, 
  Sensor, 
  VehicleType, 
  PaymentMethod,
  BackendConfig
} from '../types/parking';

const STORAGE_KEY = 'vpms_pro_system_state_v1';
const BACKEND_CONFIG_KEY = 'vpms_pro_backend_config_v1';

export interface ParkingSystemState {
  users: User[];
  vehicles: Vehicle[];
  slots: ParkingSlot[];
  sensors: Sensor[];
  tickets: Ticket[];
  payments: Payment[];
  nextTicketNumber: number;
  nextPaymentNumber: number;
}

const generateInitialSlotsAndSensors = () => {
  const slots: ParkingSlot[] = [];
  const sensors: Sensor[] = [];

  const floors: (1 | 2)[] = [1, 2];

  floors.forEach((floor) => {
    // 3 Bike slots: B08, B09, B10
    const bikeSlots = ['B08', 'B09', 'B10'];
    bikeSlots.forEach((slotSuffix, index) => {
      const slotNumber = `F${floor}-${slotSuffix}`;
      const slotId = `slot-${slotNumber.toLowerCase()}`;
      const sensorId = `sensor-${slotNumber.toLowerCase()}`;

      const isDefaultOccupied = floor === 1 && slotSuffix === 'B08';
      // Staggered status change times for realistic telemetry
      const statusChangeTime = isDefaultOccupied 
        ? '2026-06-02 15:35:35'
        : `2026-06-02 1${4 - floor}:${(10 + index * 12).toString().padStart(2, '0')}:00`;

      slots.push({
        id: slotId,
        slotNumber,
        floor,
        slotType: 'BIKE',
        status: isDefaultOccupied ? 'OCCUPIED' : 'AVAILABLE',
        currentTicketId: isDefaultOccupied ? 'TKT-0002' : undefined,
        sensorId,
        lastStatusChange: statusChangeTime,
      });

      sensors.push({
        id: sensorId,
        slotId,
        sensorCode: `SNR-${slotNumber}`,
        status: 'ACTIVE',
        batteryPercent: 96 + (floor % 2),
        lastPing: new Date().toISOString(),
        lastStatusChange: statusChangeTime,
        signalStrengthDbm: -54 + (index * 2),
      });
    });

    // 7 Car slots: C01, C02, C03, C04, C05, C06, C07
    const carSlots = ['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07'];
    carSlots.forEach((slotSuffix, idx) => {
      const slotNumber = `F${floor}-${slotSuffix}`;
      const slotId = `slot-${slotNumber.toLowerCase()}`;
      const sensorId = `sensor-${slotNumber.toLowerCase()}`;
      const statusChangeTime = `2026-06-02 1${3 + floor}:${(15 + idx * 6).toString().padStart(2, '0')}:40`;

      slots.push({
        id: slotId,
        slotNumber,
        floor,
        slotType: 'CAR',
        status: 'AVAILABLE',
        currentTicketId: undefined,
        sensorId,
        lastStatusChange: statusChangeTime,
      });

      sensors.push({
        id: sensorId,
        slotId,
        sensorCode: `SNR-${slotNumber}`,
        status: 'ACTIVE',
        batteryPercent: 98 - (idx % 3),
        lastPing: new Date().toISOString(),
        lastStatusChange: statusChangeTime,
        signalStrengthDbm: -52 + (idx % 4),
      });
    });
  });

  return { slots, sensors };
};

export const getInitialState = (): ParkingSystemState => {
  const { slots, sensors } = generateInitialSlotsAndSensors();

  const initialUser: User = {
    id: 'user-001',
    name: 'Sagar Inamati',
    username: 'sinamati',
    email: 'user@vpmspro.io',
    role: 'USER',
    phone: '+91 98765 43210',
    createdAt: '2026-06-02 14:00:00',
  };

  const initialVehicle: Vehicle = {
    id: 'veh-001',
    userId: 'user-001',
    registrationNumber: 'KA22HA8784',
    vehicleType: 'BIKE',
    ownerName: 'Sagar Inamati',
    color: 'Matte Cyan',
  };

  const initialActiveTicket: Ticket = {
    id: 'TKT-0002',
    vehicleId: 'veh-001',
    registrationNumber: 'KA22HA8784',
    vehicleType: 'BIKE',
    ownerName: 'Sagar Inamati',
    slotId: 'slot-f1-b08',
    slotNumber: 'F1-B08',
    floor: 1,
    entryTime: '2026-06-02 15:35:35',
    status: 'ACTIVE',
    baseRatePerHour: 20,
  };

  const initialPayment: Payment = {
    id: 'PAY-0001',
    ticketId: 'TKT-0001',
    registrationNumber: 'KA22HA8784',
    amount: 20,
    paymentMethod: 'CASH',
    paymentTime: '2026-06-02 15:34:52',
    status: 'PAID',
    durationFormatted: '0h 25m',
  };

  return {
    users: [initialUser],
    vehicles: [initialVehicle],
    slots,
    sensors,
    tickets: [initialActiveTicket],
    payments: [initialPayment],
    nextTicketNumber: 3,
    nextPaymentNumber: 2,
  };
};

export const loadStoredState = (): ParkingSystemState => {
  if (typeof window === 'undefined') return getInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as ParkingSystemState;
    // ensure structure integrity
    if (!parsed.slots || parsed.slots.length === 0) {
      const fallback = getInitialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
      return fallback;
    }
    // Ensure every sensor has lastStatusChange
    parsed.sensors = parsed.sensors.map((s, i) => ({
      ...s,
      lastStatusChange: s.lastStatusChange || `2026-06-02 15:${(20 + i).toString().padStart(2, '0')}:00`,
    }));
    parsed.slots = parsed.slots.map((sl, i) => ({
      ...sl,
      lastStatusChange: sl.lastStatusChange || `2026-06-02 15:${(20 + i).toString().padStart(2, '0')}:00`,
    }));
    return parsed;
  } catch (err) {
    console.error('Failed to load state from localStorage', err);
    return getInitialState();
  }
};

export const persistState = (state: ParkingSystemState): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state to localStorage', err);
  }
};

export const loadBackendConfig = (): BackendConfig => {
  if (typeof window === 'undefined') {
    return {
      mode: 'connected',
      apiBaseUrl: '/api',
      autoSync: true,
    };
  }
  try {
    const raw = localStorage.getItem(BACKEND_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {
    mode: 'connected',
    apiBaseUrl: '/api',
    autoSync: true,
  };
};

export const saveBackendConfig = (config: BackendConfig): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BACKEND_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save backend config', e);
  }
};

export const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const formatDateTime = (date: Date = new Date()): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

export const calculateDurationAndFee = (
  entryTimeStr: string,
  vehicleType: VehicleType
): { durationFormatted: string; hours: number; minutes: number; fee: number } => {
  let entryDate = new Date(entryTimeStr);
  if (isNaN(entryDate.getTime())) {
    entryDate = new Date(entryTimeStr.replace(' ', 'T'));
  }
  
  const now = new Date();
  let diffMs = now.getTime() - entryDate.getTime();
  if (diffMs < 0 || isNaN(diffMs)) {
    diffMs = 1000 * 60 * 15; // default 15 minutes minimum demonstration
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let baseFee = 20;
  let hourlyExtra = 10;
  if (vehicleType === 'CAR') {
    baseFee = 40;
    hourlyExtra = 20;
  } else if (vehicleType === 'COMMERCIAL') {
    baseFee = 60;
    hourlyExtra = 30;
  }

  let totalFee = baseFee;
  if (hours > 2) {
    totalFee += (hours - 2) * hourlyExtra;
  }

  const durationFormatted = `${hours}h ${minutes}m`;

  return {
    durationFormatted,
    hours,
    minutes,
    fee: totalFee,
  };
};
