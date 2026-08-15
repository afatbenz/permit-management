import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setRefreshHandler, type RegisterPayload, type SessionUser } from '@/lib/api';
import { useClientStore, type User } from '@/stores/Client';

// Exported type so pages can read the session user without importing SessionUser twice.
export type { SessionUser };

// Session lives in the zustand client store (persisted to localStorage,
// refreshed by the axios interceptor). The API layer reads the access token
// directly from the store, so no token is duplicated here.

let refreshToken: string | null = null;

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
  const [loading, setLoading] = useState(true);

  const storeUser = useClientStore((s) => s.user);

  // ---- silent refresh handler mounted into the API layer ----
  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refreshToken = useClientStore.getState().refreshToken;
    if (!refreshToken) return false;
    try {
      const res = await api.refresh(refreshToken);
      useClientStore.setState({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user as unknown as User,
        isAuthenticated: true,
      });
      return true;
    } catch {
      useClientStore.getState().clearAuth();
      return false;
    }
  }, []);

  useEffect(() => {
    setRefreshHandler(refreshSession);
  }, [refreshSession]);

  // Rehydrate from the persisted zustand store, then mark ready.
  useEffect(() => {
    const unsub = useClientStore.persist?.onFinishHydration?.(() => setLoading(false)) ?? (() => setLoading(false));
    if (!useClientStore.persist?.hasHydrated?.()) {
      setLoading(false);
    }
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    useClientStore.setState({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      user: res.user as User,
      isAuthenticated: true,
    });
  }, []);

  const signUp = useCallback(async (payload: RegisterPayload) => {
    // register() returns a PENDING account — no token is issued, so the
    // user is NOT signed in afterwards.
    await api.register(payload);
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = useClientStore.getState().refreshToken;
    if (refreshToken) await api.logout(refreshToken);
    useClientStore.getState().clearAuth();
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.getProfile();
    if (res.user) useClientStore.setState({ user: res.user as unknown as User });
  }, []);

  return (
    <AuthContext.Provider value={{ user: storeUser, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
