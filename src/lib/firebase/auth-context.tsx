import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirebaseServices, googleProvider } from './config';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { auth, isConfigured } = getFirebaseServices();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    // Check for redirect result if popup was blocked earlier (browser only)
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      try {
        getRedirectResult(auth)
          .then((result) => {
            if (result?.user) {
              setUser(result.user);
            }
          })
          .catch(() => {
            // Ignore benign redirect check failures
          });
      } catch {
        // Ignore environment errors
      }
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (err) => {
        console.error('Auth state error:', err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [auth]);

  const signInWithGoogle = async () => {
    if (!auth) {
      const err = new Error('Firebase Auth is not initialized. Please ensure credentials are set.');
      setError(err.message);
      throw err;
    }
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      const authErr = err as { code?: string; message?: string };
      let friendlyMessage = authErr?.message || 'Failed to sign in with Google';

      if (authErr?.code === 'auth/popup-blocked') {
        friendlyMessage = 'Sign-in popup was blocked by your browser. Attempting redirect login...';
        setError(friendlyMessage);
        // Fallback to redirect sign-in if popup is blocked
        await signInWithRedirect(auth, googleProvider);
        return;
      } else if (authErr?.code === 'auth/popup-closed-by-user') {
        friendlyMessage = 'Sign-in was cancelled (popup window was closed).';
      } else if (
        authErr?.code === 'auth/operation-not-allowed' ||
        authErr?.code === 'auth/configuration-not-found'
      ) {
        friendlyMessage =
          'Google Sign-In is not enabled yet in your Firebase project. Please click "Save" in Firebase Console > Authentication > Sign-in method.';
      } else if (authErr?.code === 'auth/unauthorized-domain') {
        friendlyMessage = `This domain (${typeof window !== 'undefined' ? window.location.hostname : 'current'}) is not authorized in Firebase Console > Authentication > Settings > Authorized domains.`;
      }

      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const signInAnonymously = async () => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    setError(null);
    try {
      await firebaseSignInAnonymously(auth);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    }
  };

  const signOut = async () => {
    if (!auth) return;
    setError(null);
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured,
        signInWithGoogle,
        signInAnonymously,
        signOut,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
