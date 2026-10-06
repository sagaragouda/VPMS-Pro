import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  FirebaseUser,
  saveUserProfile,
  getUserProfile,
  UserProfileData
} from '../services/firebase';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfileData | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, phone?: string, vehicleNumber?: string) => Promise<void>;
  logOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [masterAdminSession, setMasterAdminSession] = useState<boolean>(() => {
    return localStorage.getItem('vpms_master_admin_session') === 'true';
  });
  const [loading, setLoading] = useState(true);

  // Synchronize Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const isMaster = user.email?.toLowerCase() === 'inamatisagar6@gmail.com';
        if (isMaster) {
          localStorage.setItem('vpms_master_admin_session', 'true');
          setMasterAdminSession(true);
        }
        // Fetch or create profile
        try {
          let profile = await getUserProfile(user.uid);
          if (!profile) {
            // First time Google or federated login
            profile = {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || (isMaster ? 'Master Administrator' : 'Driver'),
              email: user.email || '',
              role: isMaster ? 'ADMIN' : 'USER',
              createdAt: new Date().toISOString(),
            };
            await saveUserProfile(profile);
          }
          setUserProfile(profile);
        } catch (err) {
          console.warn('Could not load user profile from Firestore:', err);
        }
      } else {
        if (!localStorage.getItem('vpms_master_admin_session')) {
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (auth.currentUser) {
      const p = await getUserProfile(auth.currentUser.uid);
      if (p) setUserProfile(p);
    }
  };

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    if (cred.user) {
      const isMaster = cred.user.email?.toLowerCase() === 'inamatisagar6@gmail.com';
      if (isMaster) {
        localStorage.setItem('vpms_master_admin_session', 'true');
        setMasterAdminSession(true);
      }
      let p = await getUserProfile(cred.user.uid);
      if (!p) {
        p = {
          id: cred.user.uid,
          name: cred.user.displayName || cred.user.email?.split('@')[0] || (isMaster ? 'Master Administrator' : 'Driver'),
          email: cred.user.email || '',
          role: isMaster ? 'ADMIN' : 'USER',
          createdAt: new Date().toISOString(),
        };
        await saveUserProfile(p);
      }
      setUserProfile(p);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const isMasterAdmin = cleanEmail === 'inamatisagar6@gmail.com';

    // 1. Try Firebase Auth standard sign in
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      if (cred.user) {
        if (isMasterAdmin) {
          localStorage.setItem('vpms_master_admin_session', 'true');
          setMasterAdminSession(true);
        }
        let p = await getUserProfile(cred.user.uid);
        if (!p) {
          p = {
            id: cred.user.uid,
            name: cred.user.displayName || (isMasterAdmin ? 'Master Administrator' : 'Driver'),
            email: cred.user.email || cleanEmail,
            role: isMasterAdmin ? 'ADMIN' : 'USER',
            createdAt: new Date().toISOString(),
          };
          await saveUserProfile(p);
        }
        setUserProfile(p);
        return;
      }
    } catch (err: any) {
      // 2. Special handler for Master Administrator
      if (isMasterAdmin) {
        // A. If the account doesn't exist yet in Firebase Auth, automatically create it!
        try {
          const createCred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
          if (createCred.user) {
            await updateProfile(createCred.user, { displayName: 'Master Administrator' });
            const adminProfile: UserProfileData = {
              id: createCred.user.uid,
              name: 'Master Administrator',
              email: cleanEmail,
              role: 'ADMIN',
              createdAt: new Date().toISOString(),
            };
            await saveUserProfile(adminProfile);
            setUserProfile(adminProfile);
            localStorage.setItem('vpms_master_admin_session', 'true');
            setMasterAdminSession(true);
            return;
          }
        } catch (createErr) {
          console.warn('Auto-create master admin notice:', createErr);
        }

        // B. If password matches Master Admin password, grant Master Admin access
        if (pass.trim() === 'Shashank@2006') {
          const adminProfile: UserProfileData = {
            id: 'master-admin-inamatisagar6',
            name: 'Master Administrator',
            email: 'inamatisagar6@gmail.com',
            role: 'ADMIN',
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem('vpms_master_admin_session', 'true');
          setMasterAdminSession(true);
          setUserProfile(adminProfile);
          return;
        }
      }

      throw err;
    }
  };

  const signUpWithEmail = async (
    email: string, 
    pass: string, 
    name: string, 
    phone?: string, 
    vehicleNumber?: string
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      const isMaster = email.trim().toLowerCase() === 'inamatisagar6@gmail.com';
      if (isMaster) {
        localStorage.setItem('vpms_master_admin_session', 'true');
        setMasterAdminSession(true);
      }
      const newProfile: UserProfileData = {
        id: cred.user.uid,
        name: name.trim() || (isMaster ? 'Master Administrator' : 'Driver'),
        email: email.trim().toLowerCase(),
        phone: phone?.trim(),
        vehicleNumber: vehicleNumber?.trim().toUpperCase(),
        role: isMaster ? 'ADMIN' : 'USER',
        createdAt: new Date().toISOString(),
      };
      await saveUserProfile(newProfile);
      setUserProfile(newProfile);
    }
  };

  const logOut = async () => {
    localStorage.removeItem('vpms_master_admin_session');
    setMasterAdminSession(false);
    try {
      await signOut(auth);
    } catch (_) {}
    setCurrentUser(null);
    setUserProfile(null);
  };

  const effectiveUser: FirebaseUser | null = currentUser || (masterAdminSession ? ({
    uid: 'master-admin-inamatisagar6',
    email: 'inamatisagar6@gmail.com',
    displayName: 'Master Administrator',
    emailVerified: true,
    isAnonymous: false,
  } as unknown as FirebaseUser) : null);

  const effectiveProfile: UserProfileData | null = userProfile || (masterAdminSession ? {
    id: 'master-admin-inamatisagar6',
    name: 'Master Administrator',
    email: 'inamatisagar6@gmail.com',
    role: 'ADMIN',
    createdAt: new Date().toISOString(),
  } : null);

  const isAdmin = 
    masterAdminSession ||
    effectiveUser?.email?.toLowerCase() === 'inamatisagar6@gmail.com' || 
    effectiveProfile?.role === 'ADMIN' ||
    effectiveProfile?.email?.toLowerCase() === 'inamatisagar6@gmail.com';

  return (
    <AuthContext.Provider value={{
      currentUser: effectiveUser,
      userProfile: effectiveProfile,
      isAdmin,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      logOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
