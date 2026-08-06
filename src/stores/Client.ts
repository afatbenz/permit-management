import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createJSONStorage, persist } from 'zustand/middleware';
import { axiosService } from '@/services/axiosService';
import { ENUM_ROLE_AUTH } from '@/types/route'; 

// 1. Perbaikan Interface (Sesuai dengan payload API sebenarnya)
interface Role {
  id: string;
  code: string | ENUM_ROLE_AUTH; // Mendukung enum internal kita
  name: string;
}

interface User {
  id: string;
  organizationId: string;
  subconCompanyId: string | null; // Harus bisa null
  roleId: string;
  name: string;
  email: string;
  phone: string;
  verificationStatus: string;
  status: string;
  updatedAt: string;
  createdAt: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  lastLoginAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  role: Role; // Wajib ada
}

interface LoginPayload {
  username: string;
  password?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
}

interface IClientState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;
  user: User | null;
}

interface IClientActions {
  login: (payload: LoginPayload) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>; // TAMBAHKAN INI
  logout: () => void;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
  setHydrated: () => void;
}

type ClientStore = IClientState & IClientActions;

// 2. Hardcode Data User (Bypass)
const dummyUser: User = {
  "id": "fbc3019a-3025-4fff-9bf9-d7144b4e773a",
  "organizationId": "e1f8abf8-831e-4f9c-bf29-0f3957917cc8",
  "subconCompanyId": null,
  "roleId": "d907a9cb-5643-4e65-9f4e-ca98681ee551",
  "name": "Rino",
  "email": "rinotoharto@gmail.com",
  "phone": "085155305018",
  "verificationStatus": "verified",
  "verifiedBy": null,
  "verifiedAt": null,
  "lastLoginAt": null,
  "status": "active",
  "createdBy": null,
  "updatedBy": null,
  "createdAt": "2026-08-06T12:29:21.303Z",
  "updatedAt": "2026-08-06T12:29:21.303Z",
  "role": {
      "id": "d907a9cb-5643-4e65-9f4e-ca98681ee551",
      "code": ENUM_ROLE_AUTH.SUPER_ADMIN, 
      "name": "Unassigned"
  }
};

// 3. Set Initial State agar selalu login
const initialState: IClientState = {
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false, // BYPASS AKTIF
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYmMzMDE5YS0zMDI1LTRmZmYtOWJmOS1kNzE0NGI0ZTc3M2EiLCJvcmdhbml6YXRpb25JZCI6ImUxZjhhYmY4LTgzMWUtNGY5Yy1iZjI5LTBmMzk1NzkxN2NjOCIsInJvbGVJZCI6ImQ5MDdhOWNiLTU2NDMtNGU2NS05ZjRlLWNhOTg2ODFlZTU1MSIsInJvbGVDb2RlIjoidW5hc3NpZ25lZCIsImlhdCI6MTc4NjAyMDM5MSwiZXhwIjoxNzg2MTA2NzkxfQ.OWEvvFPaH6qAPn-x9A4fRsiIdfzdcJ3eo3iaXYQF2v4", // MENGGUNAKAN TOKEN ASLI DARI JSON
  refreshToken: null,
  hydrated: false,
};

export const useClientStore = create<ClientStore>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      setAccessToken: (token: string | null) =>
        set((state) => {
          state.accessToken = token;
        }),

      clearAuth: () =>
        set((state) => {
          state.accessToken = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
          state.user = null;
          state.error = null;
        }),

      register: async (payload: RegisterPayload) => {
        set({ isLoading: true, error: null });

        try {
          await axiosService.request({
            url: '/api/v1/auth/register',
            method: 'POST',
            data: payload,
          });

          // Registrasi sukses. Kita tidak mengubah state `user` atau `accessToken` 
          // karena user diwajibkan untuk login ulang melalui halaman Login.
          return true;
        } catch (err: any) {
          // Tangkap pesan error dari exception NestJS (biasanya ada di err.response.data.message)
          const errorMessage = err.response?.data?.message || 'Registrasi gagal. Pastikan email belum terdaftar dan data valid.';
          
          set((state) => {
            state.error = (typeof errorMessage === 'string') 
              ? errorMessage 
              : errorMessage.join(', '); // Handle array error dari class-validator NestJS
          });

          return false;
        } finally {
          set((state) => {
            state.isLoading = false;
          });
        }
      },

      login: async (payload: LoginPayload) => {
        set({ isLoading: true, error: null });

        try {
          // Destrukturisasi 'data' langsung berisi objek payload dari NestJS
          const { data } = await axiosService.request<{ data: any }>({
            url: '/api/v1/auth/login',
            method: 'POST',
            data: payload,
          });

          set((state) => {
            // Langsung petakan nilai dari objek 'data'
            state.accessToken = data.accessToken;
            state.refreshToken = data.refreshToken;
            state.user = data.user;
            state.isAuthenticated = true;
          });

          return true;
        } catch (err: any) {
          // Jika backend melempar error (401/403), tangkap pesannya. Jika tidak, gunakan fallback.
          const errorMessage = err.response?.data?.message || 'Login gagal. Periksa kredensial Anda.';
          
          set((state) => {
            state.error = (typeof errorMessage === 'string') 
              ? errorMessage 
              : errorMessage.join(', ');
          });

          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const { refreshToken } = get();

        // 1. Beri tahu backend untuk menghancurkan sesi (revoke token)
        if (refreshToken) {
          try {
            await axiosService.request({
              url: '/api/v1/auth/logout',
              method: 'POST',
              data: { refreshToken },
            });
          } catch (error) {
            console.error('Gagal menghapus sesi di backend:', error);
            // Tetap lanjutkan pembersihan lokal meskipun backend gagal/timeout
          }
        }

        // 2. Bersihkan state dan storage lokal
        get().clearAuth();
      },

      setHydrated: () => {
        set({ hydrated: true });
      },
    })),
    {
      name: 'eptw-client-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state, error) => {
        if (!error && state) {
          state.setHydrated();
        }
      },
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        refreshToken: state.refreshToken,
      }),
    }
  )
);