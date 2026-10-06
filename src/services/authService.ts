import { AuthSession, UserRole } from '../types/parking';

const AUTH_STORAGE_KEY = 'vpms_pro_auth_session_v1';
const REGISTERED_USERS_KEY = 'vpms_pro_registered_users_v1';

export interface StoredUserAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  phone?: string;
  vehicleNumber?: string;
  role: UserRole;
  registeredAt: string;
  lastLoginAt?: string;
}

// Default Demo Credentials:
export const DEMO_ADMIN_CREDENTIALS = {
  username: 'inamatisagar6@gmail.com',
  password: 'Shashank@2006',
  role: 'ADMIN' as UserRole,
  email: 'inamatisagar6@gmail.com',
  name: 'Sagar Inamati (Admin)',
  phone: '+91 98888 00001',
};

export const DEMO_USER_CREDENTIALS = {
  username: 'user',
  password: 'user123',
  role: 'USER' as UserRole,
  email: 'driver@cyberpark.net',
  name: 'Standard Driver / User',
  phone: '+91 98765 43210',
  vehicleNumber: 'KA22HA8784',
};

// Initial seeded past users for history and demonstration
const DEFAULT_SEEDED_USERS: StoredUserAccount[] = [
  {
    id: 'user-seed-001',
    username: DEMO_ADMIN_CREDENTIALS.username,
    password: DEMO_ADMIN_CREDENTIALS.password,
    name: DEMO_ADMIN_CREDENTIALS.name,
    email: DEMO_ADMIN_CREDENTIALS.email,
    phone: DEMO_ADMIN_CREDENTIALS.phone,
    role: 'ADMIN',
    registeredAt: '2026-01-15 09:00:00',
    lastLoginAt: '2026-06-02 15:30:00',
  },
  {
    id: 'user-seed-admin-alias',
    username: 'admin',
    password: 'Shashank@2006',
    name: 'Sagar Inamati (Admin)',
    email: 'inamatisagar6@gmail.com',
    phone: '+91 98888 00001',
    role: 'ADMIN',
    registeredAt: '2026-01-15 09:00:00',
    lastLoginAt: '2026-06-02 15:30:00',
  },
  {
    id: 'user-seed-002',
    username: DEMO_USER_CREDENTIALS.username,
    password: DEMO_USER_CREDENTIALS.password,
    name: DEMO_USER_CREDENTIALS.name,
    email: DEMO_USER_CREDENTIALS.email,
    phone: DEMO_USER_CREDENTIALS.phone,
    vehicleNumber: 'KA22HA8784',
    role: 'USER',
    registeredAt: '2026-03-10 11:20:00',
    lastLoginAt: '2026-06-02 14:15:00',
  },
  {
    id: 'user-seed-003',
    username: 'sagar',
    password: 'user123',
    name: 'Sagar Inamati',
    email: 'sagar@cyberpark.net',
    phone: '+91 94480 12345',
    vehicleNumber: 'KA22HA8784',
    role: 'USER',
    registeredAt: '2026-05-01 10:00:00',
    lastLoginAt: '2026-06-02 15:35:00',
  },
  {
    id: 'user-seed-004',
    username: 'arjun',
    password: 'user123',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@domain.in',
    phone: '+91 98112 55667',
    vehicleNumber: 'KA-04-MB-2024',
    role: 'USER',
    registeredAt: '2026-05-18 16:45:00',
    lastLoginAt: '2026-06-01 19:10:00',
  },
];

export const getRegisteredUsers = (): StoredUserAccount[] => {
  if (typeof window === 'undefined') return DEFAULT_SEEDED_USERS;
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(DEFAULT_SEEDED_USERS));
      return DEFAULT_SEEDED_USERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure inamatisagar6@gmail.com is present with ADMIN role and updated credentials
      const hasAdmin = parsed.some(
        (u: StoredUserAccount) =>
          u.username.toLowerCase() === DEMO_ADMIN_CREDENTIALS.username.toLowerCase() ||
          u.email.toLowerCase() === DEMO_ADMIN_CREDENTIALS.email.toLowerCase()
      );
      if (!hasAdmin) {
        parsed.unshift(DEFAULT_SEEDED_USERS[0]);
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(parsed));
      } else {
        // Keep credentials up to date
        const updated = parsed.map((u: StoredUserAccount) => {
          if (
            u.username.toLowerCase() === DEMO_ADMIN_CREDENTIALS.username.toLowerCase() ||
            u.email.toLowerCase() === DEMO_ADMIN_CREDENTIALS.email.toLowerCase() ||
            u.username.toLowerCase() === 'admin'
          ) {
            return {
              ...u,
              username: u.username.toLowerCase() === 'admin' ? 'admin' : DEMO_ADMIN_CREDENTIALS.username,
              email: DEMO_ADMIN_CREDENTIALS.email,
              password: DEMO_ADMIN_CREDENTIALS.password,
              role: 'ADMIN' as UserRole,
              name: DEMO_ADMIN_CREDENTIALS.name,
            };
          }
          return u;
        });
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updated));
        return updated;
      }
      return parsed;
    }
    return DEFAULT_SEEDED_USERS;
  } catch {
    return DEFAULT_SEEDED_USERS;
  }
};

export const saveRegisteredUsers = (users: StoredUserAccount[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save registered users', err);
  }
};

export const registerNewUser = (params: {
  username: string;
  password: string;
  name: string;
  email: string;
  phone?: string;
  vehicleNumber?: string;
  role?: UserRole;
}): { success: boolean; session?: AuthSession; message?: string } => {
  const users = getRegisteredUsers();
  const cleanUsername = params.username.trim().toLowerCase();
  const cleanEmail = params.email.trim().toLowerCase();

  // Validate existing username or email
  const existingUser = users.find(
    (u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail
  );

  if (existingUser) {
    return {
      success: false,
      message: `An account with username "${params.username}" or email "${params.email}" already exists. Please sign in instead.`,
    };
  }

  const role: UserRole = params.role || 'USER';
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const nowFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const newUser: StoredUserAccount = {
    id: `usr-reg-${Date.now()}`,
    username: cleanUsername,
    password: params.password,
    name: params.name.trim(),
    email: cleanEmail,
    phone: params.phone?.trim() || undefined,
    vehicleNumber: params.vehicleNumber?.trim().toUpperCase() || undefined,
    role,
    registeredAt: nowFormatted,
    lastLoginAt: nowFormatted,
  };

  const updatedUsers = [...users, newUser];
  saveRegisteredUsers(updatedUsers);

  // Generate logged-in session immediately
  const session: AuthSession = {
    id: newUser.id,
    username: newUser.username,
    name: newUser.name,
    role: newUser.role,
    email: newUser.email,
    token: `jwt_${role.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    lastLogin: nowFormatted,
    vehicleNumber: newUser.vehicleNumber,
    phone: newUser.phone,
  };

  setStoredAuthSession(session);
  return { success: true, session, message: 'Account created successfully!' };
};

export const getStoredAuthSession = (): AuthSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

export const setStoredAuthSession = (session: AuthSession | null): void => {
  if (typeof window === 'undefined') return;
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }
};

export const authenticateUser = (
  username: string,
  password: string,
  roleRequested?: UserRole
): { success: boolean; session?: AuthSession; message?: string } => {
  const cleanUsername = username.trim().toLowerCase();
  const users = getRegisteredUsers();

  // Find user by username or email
  const match = users.find(
    (u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanUsername
  );

  if (match) {
    if (match.password === password) {
      const now = new Date().toISOString();
      // Update last login
      match.lastLoginAt = now;
      saveRegisteredUsers(users);

      const session: AuthSession = {
        id: match.id,
        username: match.username,
        name: match.name,
        role: match.role,
        email: match.email,
        token: `jwt_${match.role.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        lastLogin: now,
        vehicleNumber: match.vehicleNumber,
        phone: match.phone,
      };

      setStoredAuthSession(session);
      return { success: true, session };
    } else {
      return { success: false, message: 'Invalid password. Please check your credentials.' };
    }
  }

  // Fallback checks for hardcoded demo admin credentials if store was cleared
  if (
    (cleanUsername === DEMO_ADMIN_CREDENTIALS.username.toLowerCase() ||
      cleanUsername === DEMO_ADMIN_CREDENTIALS.email.toLowerCase() ||
      cleanUsername === 'admin') &&
    password === DEMO_ADMIN_CREDENTIALS.password
  ) {
    const session: AuthSession = {
      id: 'auth-adm-001',
      username: DEMO_ADMIN_CREDENTIALS.username,
      name: DEMO_ADMIN_CREDENTIALS.name,
      role: 'ADMIN',
      email: DEMO_ADMIN_CREDENTIALS.email,
      token: `jwt_adm_${Date.now()}`,
      lastLogin: new Date().toISOString(),
    };
    setStoredAuthSession(session);
    return { success: true, session };
  }

  // Allow custom testing logins if password matches pattern
  if (cleanUsername.length >= 3 && password.length >= 4) {
    const assignedRole = roleRequested || (cleanUsername.includes('admin') ? 'ADMIN' : 'USER');
    const session: AuthSession = {
      id: `auth-cust-${Date.now()}`,
      username: cleanUsername,
      name: cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1),
      role: assignedRole,
      email: `${cleanUsername}@vpmspro.io`,
      token: `jwt_dyn_${Date.now()}`,
      lastLogin: new Date().toISOString(),
    };
    setStoredAuthSession(session);
    return { success: true, session };
  }

  return {
    success: false,
    message: 'User account not found. Try demo credentials or register a new user in the "New User Register" tab.',
  };
};

export const logoutUser = (): void => {
  setStoredAuthSession(null);
};
