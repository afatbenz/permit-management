import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createJSONStorage, persist } from 'zustand/middleware';
import { axiosService } from '@/services/axiosService';
// Asumsi ENUM_ROLE_AUTH sudah dibuat dari instruksi sebelumnya
import { ENUM_ROLE_AUTH } from '@/types/route'; 

// Hapus TSourceTz jika tidak relevan dengan ePTW, atau sesuaikan.
interface User {
  id: string;
  name: string;
  username: string;
  role: ENUM_ROLE_AUTH;
  avatar?: string;
}

interface LoginPayload {
  username: string;
  password?: string; // Di production, password wajib ada
}

// Pisahkan state dan actions untuk typing yang lebih bersih
interface IClientState {
  isAuthenticated: boolean;
  accessToken: string | null;
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;
  user: User | null;
}

interface IClientActions {
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => void;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
  setHydrated: () => void;
}

type ClientStore = IClientState & IClientActions;

const initialState: IClientState = {
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  accessToken: null, // Akses token ADA di state (memori), tapi TIDAK di persist ke localStorage
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
          state.isAuthenticated = false;
          state.user = null;
          state.error = null;
        }),

      login: async (payload: LoginPayload) => {
        set({ isLoading: true, error: null });

        try {
          // Sesuaikan URL dengan endpoint ePTW
          const { data } = await axiosService.request<{ data: { access_token: string } }>({
            url: '/api/eptw/auth/login',
            method: 'POST',
            data: payload,
          });

          const { access_token } = data.data;

          set((state) => {
            state.accessToken = access_token;
            state.isAuthenticated = true;
          });

          // Fetch profil user
          const profileResponse = await axiosService.request<{ data: any }>(
            {
              url: '/api/eptw/user/profile',
              method: 'GET',
              headers: { Authorization: `Bearer ${access_token}` },
            },
            { useFetch: true }
          );

          const userData = profileResponse.data.data;

          set((state) => {
            state.user = {
              id: userData.id,
              username: userData.username,
              name: userData.full_name,
              role: userData.role_name as ENUM_ROLE_AUTH,
            };
          });

          return true;
        } catch (err: any) {
          const errorMessage = err.response?.data?.message || 'Login gagal. Periksa kredensial Anda.';

          // Panggil clearAuth menggunakan get() internal zustand
          get().clearAuth();
          
          set((state) => {
            state.error = errorMessage;
          });

          // Idealnya toast/dialog di-trigger dari UI layer atau interceptor, bukan dari store langsung
          // showErrorDialog('Login Failed', errorMessage);

          return false;
        } finally {
          set((state) => {
            state.isLoading = false;
          });
        }
      },

      logout: () => {
        // Hapus cookie terkait jika ada, panggil endpoint logout jika perlu
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
      // SECURITY FIX: Jangan pernah memasukkan accessToken ke partialize (localStorage)
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        // accessToken tidak disimpan di localStorage. Aplikasi harus me-refresh token di background saat rehydrate
      }),
    }
  )
);