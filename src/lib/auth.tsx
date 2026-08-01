import { createContext, useContext, type ReactNode } from 'react';

type MockUser = {
  id: string;
  email: string;
  user_metadata: { full_name: string };
};

type AuthCtx = {
  session: { user: MockUser } | null;
  user: MockUser;
  loading: boolean;
  signOut: () => void;
};

const MOCK_USER: MockUser = {
  id: 'mock-user-001',
  email: 'admin@example.com',
  user_metadata: { full_name: 'Admin User' },
};

const authValue: AuthCtx = {
  session: { user: MOCK_USER },
  user: MOCK_USER,
  loading: false,
  signOut: () => {
    // no-op — auth is bypassed
  },
};

const AuthContext = createContext<AuthCtx>(authValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
