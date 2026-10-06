export type VehicleType = 'CAR' | 'BIKE' | 'COMMERCIAL';
export type SlotStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
export type PaymentMethod = 'CASH' | 'ONLINE';
export type BookingStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

// Role & Auth types
export type UserRole = 'ADMIN' | 'OPERATOR' | 'USER';

export interface AuthSession {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  token: string;
  lastLogin: string;
  vehicleNumber?: string;
  phone?: string;
}

// 1. USER entity
export interface User {
  id: string;
  name: string;
  username?: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  createdAt: string;
}

// 2. VEHICLE entity (USER (1) <-> VEHICLE (N) via OWNS)
export interface Vehicle {
  id: string;
  userId?: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  ownerName?: string;
  color?: string;
}

// 3. SENSOR entity (PARKING SLOT (1) <-> SENSOR (1) via MONITORS)
export interface Sensor {
  id: string;
  slotId: string;
  sensorCode: string;
  status: 'ACTIVE' | 'OFFLINE' | 'CALIBRATING';
  batteryPercent: number;
  lastPing: string;
  lastStatusChange: string; // Timestamp when occupancy or sensor status last transitioned
  signalStrengthDbm: number;
}

// 4. PARKING SLOT entity
export interface ParkingSlot {
  id: string;
  slotNumber: string; // e.g. "F1-B08"
  floor: 1 | 2;
  slotType: VehicleType;
  status: SlotStatus;
  currentTicketId?: string;
  sensorId: string;
  lastStatusChange?: string;
}

// 5. BOOKING / TICKET entity (VEHICLE (1) <-> BOOKING (N) via MAKES, assigned to PARKING SLOT (N:1))
export interface Ticket {
  id: string; // e.g. "TKT-0002"
  vehicleId: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  ownerName?: string;
  slotId: string;
  slotNumber: string;
  floor: number;
  entryTime: string;
  exitTime?: string;
  status: BookingStatus;
  baseRatePerHour: number;
}

// 6. PAYMENT entity (BOOKING (1) <-> PAYMENT (1))
export interface Payment {
  id: string; // e.g. "PAY-0001"
  ticketId: string;
  registrationNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentTime: string;
  status: 'PAID' | 'REFUNDED';
  durationFormatted: string;
}

export interface FirebaseBooking {
  id: string;
  ticketNumber: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  slotId: string;
  slotNumber: string;
  floor: number;
  entryTime: string;
  exitTime?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  fee?: number;
  createdAt: string;
}

export type ViolationType = 
  | 'OVERSTAY' 
  | 'UNAUTHORIZED_PARKING' 
  | 'SPEEDING_RECKLESS' 
  | 'UNPAID_EXIT' 
  | 'IMPROPER_OBSTRUCTION' 
  | 'OTHER';

export interface BlacklistedVehicle {
  id: string;
  registrationNumber: string;
  violationType: ViolationType;
  reason: string;
  blacklistedAt: string;
  blacklistedBy: string;
  status: 'ACTIVE' | 'REVOKED';
  notes?: string;
}

