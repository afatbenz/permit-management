import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setAccessTokenGetter, setRefreshHandler, type RegisterPayload, type SessionUser } from '@/lib/api';

// Exported type so pages can read the session user without importing SessionUser twice.
export type { SessionUser };

// Auth state is kept in memory only (per project decision): reloading the
// page drops the session and the user signs in again. No token is persisted
// to localStorage.

let accessToken: string | null = null;
let refreshToken: string | null = null;

// Keep the API layer in sync with the live tokens (no circular import).
setAccessTokenGetter(() => accessToken);

type AuthCtx = {
  user: SessionUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  /** Refetches the profile and syncs the session user (e.g. after editing profile). */
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ---- silent refresh handler mounted into the API layer ----
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) return false;
    try {
      const res = await api.refresh(refreshToken);
      accessToken = res.accessToken;
      refreshToken = res.refreshToken;
      setUser(res.user);
      return true;
    } catch {
      // Refresh failed → full session is gone.
      accessToken = null;
      refreshToken = null;
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    setRefreshHandler(refreshSession);
  }, [refreshSession]);

  // No persisted session exists (memory-only), so boot completes immediately.
  useEffect(() => {
    setLoading(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    accessToken = res.accessToken;
    refreshToken = res.refreshToken;
    setUser(res.user);
  }, []);

  const signUp = useCallback(async (payload: RegisterPayload) => {
    // register() returns a PENDING account — no token is issued, so the
    // user is NOT signed in afterwards.
    await api.register(payload);
  }, []);

  const signOut = useCallback(async () => {
    if (refreshToken) await api.logout(refreshToken);
    accessToken = null;
    refreshToken = null;
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.getProfile();
    if (res.user) setUser(res.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
