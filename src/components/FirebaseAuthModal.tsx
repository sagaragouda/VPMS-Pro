import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Car, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sendResetPasswordEmail } from '../services/firebase';

interface FirebaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bookingSlotNotice?: string;
  initialTab?: 'signin' | 'signup';
}

export const FirebaseAuthModal: React.FC<FirebaseAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  bookingSlotNotice,
  initialTab = 'signin',
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address in the field above to receive a password reset link.');
      return;
    }
    setError(null);
    setIsSendingReset(true);
    try {
      await sendResetPasswordEmail(email.trim());
      setSuccess(`Password reset instructions have been sent to ${email.trim()}. Please check your email inbox.`);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('user-not-found')) {
        setSuccess(`If an account exists for ${email.trim()}, a password reset link has been dispatched.`);
      } else {
        setError(getFriendlyError(err));
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  const getFriendlyError = (err: any): string => {
    const msg = err?.message || String(err);
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
      return 'Invalid email or password. Please verify and try again.';
    }
    if (msg.includes('auth/email-already-in-use')) {
      return 'An account already exists with this email address. Please sign in instead.';
    }
    if (msg.includes('auth/weak-password')) {
      return 'Password should be at least 6 characters long.';
    }
    if (msg.includes('auth/popup-closed-by-user')) {
      return 'Google sign-in popup was cancelled.';
    }
    if (msg.includes('auth/operation-not-allowed')) {
      return 'Email/Password sign-in is not yet enabled in Firebase Console. Please use Google Sign In or enable Email/Password provider.';
    }
    return msg;
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
      setSuccess('Signed in with Google successfully!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } catch (err: any) {
      setError(getFriendlyError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (tab === 'signin') {
        await signInWithEmail(email.trim(), password);
        setSuccess('Welcome back! Signed in successfully.');
      } else {
        if (!name.trim()) {
          setError('Please provide your name.');
          setIsLoading(false);
          return;
        }
        await signUpWithEmail(
          email.trim(), 
          password, 
          name.trim(), 
          phone.trim(), 
          vehicleNumber.trim().toUpperCase()
        );
        setSuccess('Account created and saved to Firebase!');
      }

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } catch (err: any) {
      setError(getFriendlyError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0d131f] border border-cyan-500/40 p-6 shadow-[0_0_40px_rgba(0,240,255,0.2)]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-mono tracking-wide">
              {tab === 'signin' ? 'Sign In to VPMS Pro' : 'Create Driver Account'}
            </h3>
            <p className="text-xs text-gray-400 font-sans">
              Connected to Firebase ({import.meta.env.VITE_FIREBASE_PROJECT_ID || 'vpms-pro-2923e'})
            </p>
          </div>
        </div>

        {/* Slot booking context notice */}
        {bookingSlotNotice && (
          <div className="mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start space-x-2.5 text-xs text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Slot Reservation:</strong> Sign in or register to book <strong>{bookingSlotNotice}</strong> and save your digital pass to your cloud account.
            </span>
          </div>
        )}

        {/* Google 1-Click Sign In Button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={handleGoogleSignIn}
          className="w-full mb-4 py-2.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-semibold text-xs tracking-wider flex items-center justify-center space-x-2.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
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
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <span className="relative bg-[#0d131f] px-2 text-[11px] font-mono text-gray-500 uppercase">
            Or with email
          </span>
        </div>

        {/* Tab switch: Sign In vs Sign Up */}
        <div className="flex border-b border-white/10 mb-4">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError(null);
            }}
            className={`flex-1 pb-2 text-xs font-mono font-bold uppercase flex items-center justify-center space-x-1.5 border-b-2 transition-all cursor-pointer ${
              tab === 'signin'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setError(null);
            }}
            className={`flex-1 pb-2 text-xs font-mono font-bold uppercase flex items-center justify-center space-x-1.5 border-b-2 transition-all cursor-pointer ${
              tab === 'signup'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up (Register)</span>
          </button>
        </div>

        {/* Alert Feedback */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex flex-col space-y-1.5">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
            {tab === 'signin' && (
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setError(null);
                }}
                className="text-[11px] font-mono text-cyan-300 hover:text-white underline text-left cursor-pointer pl-6"
              >
                New user? Click here to Create an Account with this email →
              </button>
            )}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          {tab === 'signup' && (
            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase text-gray-400">
                Full Name <span className="text-cyan-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-[#070b12] border border-white/15 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
                />
                <User className="w-3.5 h-3.5 text-gray-500 absolute right-3 top-2.5" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[11px] font-mono uppercase text-gray-400">
              Email Address <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@example.com"
                className="w-full bg-[#070b12] border border-white/15 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
              />
              <Mail className="w-3.5 h-3.5 text-gray-500 absolute right-3 top-2.5" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-mono uppercase text-gray-400">
                Password <span className="text-cyan-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full bg-[#070b12] border border-white/15 focus:border-cyan-400 rounded-xl pl-3.5 pr-10 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-300 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {tab === 'signin' && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isSendingReset}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer flex items-center space-x-1"
                >
                  <KeyRound className="w-3 h-3 text-cyan-400" />
                  <span>{isSendingReset ? 'Sending reset link...' : 'Forgot Password?'}</span>
                </button>
              </div>
            )}
          </div>

          {tab === 'signup' && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase text-gray-400">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full bg-[#070b12] border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
                  />
                  <Phone className="w-3 h-3 text-gray-500 absolute right-2.5 top-2.5" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase text-gray-400">
                  Plate Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="KA-04-..."
                    className="w-full bg-[#070b12] border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
                  />
                  <Car className="w-3 h-3 text-gray-500 absolute right-2.5 top-2.5" />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 glow-cyan-btn py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : tab === 'signin' ? (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In to Account</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Driver Account</span>
              </>
            )}
          </button>

          {/* Quick Fill Admin Helper */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
            <span className="text-gray-400">Master Admin:</span>
            <button
              type="button"
              onClick={() => {
                setEmail('inamatisagar6@gmail.com');
                setPassword('Shashank@2006');
                setName('Master Administrator');
                setError(null);
              }}
              className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer flex items-center space-x-1"
            >
              <span>Auto-Fill Admin Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
