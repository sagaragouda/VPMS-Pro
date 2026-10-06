import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  getDocFromServer, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { FirebaseBooking, BlacklistedVehicle } from '../types/parking';

export const ADMIN_EMAIL = 'inamatisagar6@gmail.com';
export const ADMIN_DEFAULT_PASS = 'Shashank@2006';

// 1. Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// 2. Initialize Firestore with specific database ID (Required by AI Studio)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// 3. Initialize Firebase Auth & Providers
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// 4. Test Firestore Connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection notice: client is offline or initializing.', error.message);
    }
  }
}
testConnection();

// 5. Hardened Error Reporting (Required by Firebase Skill)
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile Types
export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  vehicleNumber?: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

// 6. Firestore Database Operations for Users
export async function saveUserProfile(profile: UserProfileData): Promise<void> {
  // Only attempt Firestore write if there is an active Firebase Auth user
  if (!auth.currentUser) return;
  const path = `users/${profile.id}`;
  try {
    await setDoc(doc(db, 'users', profile.id), profile, { merge: true });
  } catch (err) {
    console.warn('saveUserProfile notice:', err);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
  if (!auth.currentUser) return null;
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfileData;
    }
    return null;
  } catch (err) {
    console.warn('getUserProfile notice:', err);
    return null;
  }
}

// 7. Firestore Database Operations for Slot Bookings
export async function saveBookingToFirestore(booking: FirebaseBooking): Promise<void> {
  if (!auth.currentUser) return;
  const path = `bookings/${booking.id}`;
  try {
    await setDoc(doc(db, 'bookings', booking.id), booking);
  } catch (err) {
    console.warn('saveBookingToFirestore notice:', err);
  }
}

export async function completeBookingInFirestore(bookingId: string, exitTime: string, fee: number): Promise<void> {
  if (!auth.currentUser) return;
  const path = `bookings/${bookingId}`;
  try {
    await setDoc(doc(db, 'bookings', bookingId), {
      status: 'COMPLETED',
      exitTime,
      fee,
    }, { merge: true });
  } catch (err) {
    console.warn('Could not update Firestore booking completion:', err);
  }
}

export function subscribeToUserBookings(
  userId: string, 
  onData: (bookings: FirebaseBooking[]) => void,
  onError?: (err: Error) => void
) {
  if (!auth.currentUser) {
    onData([]);
    return () => {};
  }
  const path = 'bookings';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const list: FirebaseBooking[] = [];
      snapshot.forEach((d) => list.push(d.data() as FirebaseBooking));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    }, (err) => {
      console.warn('subscribeToUserBookings notice:', err.message);
      if (onError && err instanceof Error) {
        onError(err);
      }
    });
  } catch (err) {
    onData([]);
    return () => {};
  }
}

export function subscribeToAllBookings(
  onData: (bookings: FirebaseBooking[]) => void,
  onError?: (err: Error) => void
) {
  // Only query protected bookings collection when authenticated in Firebase Auth
  if (!auth.currentUser) {
    onData([]);
    return () => {};
  }
  const path = 'bookings';
  try {
    const q = query(collection(db, path));
    return onSnapshot(q, (snapshot) => {
      const list: FirebaseBooking[] = [];
      snapshot.forEach((d) => list.push(d.data() as FirebaseBooking));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    }, (err) => {
      console.warn('subscribeToAllBookings notice:', err.message);
      if (onError && err instanceof Error) {
        onError(err);
      }
    });
  } catch (err) {
    onData([]);
    return () => {};
  }
}

export function sanitizePlateId(plate: string): string {
  return plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

// 8. Blacklist Management Operations
export async function saveBlacklistedVehicle(vehicle: BlacklistedVehicle): Promise<void> {
  const sanitizedId = sanitizePlateId(vehicle.registrationNumber);
  const updatedVehicle: BlacklistedVehicle = {
    ...vehicle,
    id: sanitizedId,
    registrationNumber: vehicle.registrationNumber.toUpperCase(),
  };

  // Cache locally
  try {
    const local: BlacklistedVehicle[] = JSON.parse(localStorage.getItem('vpms_local_blacklist') || '[]');
    const filtered = local.filter((v) => v.id !== sanitizedId);
    filtered.unshift(updatedVehicle);
    localStorage.setItem('vpms_local_blacklist', JSON.stringify(filtered));
  } catch (_) {}

  // If authenticated in Firebase Auth, sync to Firestore
  if (auth.currentUser) {
    const path = `blacklist/${sanitizedId}`;
    try {
      await setDoc(doc(db, 'blacklist', sanitizedId), updatedVehicle);
    } catch (err) {
      console.warn('Could not sync blacklist to Firestore:', err);
    }
  }
}

export async function revokeBlacklistedVehicle(plate: string): Promise<void> {
  const sanitizedId = sanitizePlateId(plate);

  // Update local cache
  try {
    const local: BlacklistedVehicle[] = JSON.parse(localStorage.getItem('vpms_local_blacklist') || '[]');
    const updated = local.map((v) => v.id === sanitizedId ? { ...v, status: 'REVOKED' as const } : v);
    localStorage.setItem('vpms_local_blacklist', JSON.stringify(updated));
  } catch (_) {}

  if (auth.currentUser) {
    const path = `blacklist/${sanitizedId}`;
    try {
      await setDoc(doc(db, 'blacklist', sanitizedId), {
        status: 'REVOKED',
      }, { merge: true });
    } catch (err) {
      console.warn('Could not revoke in Firestore:', err);
    }
  }
}

export async function deleteBlacklistedVehicle(plate: string): Promise<void> {
  const sanitizedId = sanitizePlateId(plate);

  // Remove from local cache
  try {
    const local: BlacklistedVehicle[] = JSON.parse(localStorage.getItem('vpms_local_blacklist') || '[]');
    const filtered = local.filter((v) => v.id !== sanitizedId);
    localStorage.setItem('vpms_local_blacklist', JSON.stringify(filtered));
  } catch (_) {}

  if (auth.currentUser) {
    const path = `blacklist/${sanitizedId}`;
    try {
      await deleteDoc(doc(db, 'blacklist', sanitizedId));
    } catch (err) {
      console.warn('Could not delete in Firestore:', err);
    }
  }
}

export function subscribeToBlacklist(
  onData: (list: BlacklistedVehicle[]) => void,
  onError?: (err: Error) => void
) {
  const getMergedList = (firestoreList: BlacklistedVehicle[] = []) => {
    try {
      const local: BlacklistedVehicle[] = JSON.parse(localStorage.getItem('vpms_local_blacklist') || '[]');
      const map = new Map<string, BlacklistedVehicle>();
      firestoreList.forEach((v) => map.set(v.id, v));
      local.forEach((v) => {
        if (!map.has(v.id)) map.set(v.id, v);
      });
      const res = Array.from(map.values());
      res.sort((a, b) => new Date(b.blacklistedAt).getTime() - new Date(a.blacklistedAt).getTime());
      return res;
    } catch (_) {
      return firestoreList;
    }
  };

  const path = 'blacklist';
  try {
    const q = query(collection(db, path));
    return onSnapshot(q, (snapshot) => {
      const list: BlacklistedVehicle[] = [];
      snapshot.forEach((d) => list.push(d.data() as BlacklistedVehicle));
      onData(getMergedList(list));
    }, (err) => {
      console.warn('subscribeToBlacklist notice (using cached blacklist):', err.message);
      onData(getMergedList([]));
    });
  } catch (err) {
    onData(getMergedList([]));
    return () => {};
  }
}

export async function checkIsVehicleBlacklisted(plate: string): Promise<BlacklistedVehicle | null> {
  if (!plate || !plate.trim()) return null;
  const sanitizedId = sanitizePlateId(plate);

  // 1. Check local cache first
  try {
    const local: BlacklistedVehicle[] = JSON.parse(localStorage.getItem('vpms_local_blacklist') || '[]');
    const match = local.find(
      (v) => (v.id === sanitizedId || v.registrationNumber.toUpperCase() === plate.trim().toUpperCase()) && v.status === 'ACTIVE'
    );
    if (match) return match;
  } catch (_) {}

  // 2. Query Firestore
  const path = `blacklist/${sanitizedId}`;
  try {
    const snap = await getDoc(doc(db, 'blacklist', sanitizedId));
    if (snap.exists()) {
      const data = snap.data() as BlacklistedVehicle;
      if (data.status === 'ACTIVE') {
        return data;
      }
    }
    return null;
  } catch (err) {
    console.warn('Blacklist check notice:', err);
    return null;
  }
}

// 9. Admin Booking Management Operations
export async function cancelBookingInFirestore(bookingId: string): Promise<void> {
  const path = `bookings/${bookingId}`;
  try {
    await setDoc(doc(db, 'bookings', bookingId), {
      status: 'CANCELLED',
      exitTime: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteBookingInFirestore(bookingId: string): Promise<void> {
  const path = `bookings/${bookingId}`;
  try {
    await deleteDoc(doc(db, 'bookings', bookingId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Auth Helpers
export async function sendResetPasswordEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail
};
export type { FirebaseUser };

