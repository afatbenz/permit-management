import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig
} from 'axios';
import { useClientStore } from '@/stores/Client';

// Sesuaikan URL Backend ePTW Anda
const API_BASE_URL = import.meta.env.VITE_API_HOST || 'http://localhost:3000';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

class AxiosService {
  private client: AxiosInstance;
  private isRefreshing = false;
  // Menyimpan antrean request yang gagal karena 401 saat token sedang di-refresh
  private failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      withCredentials: true, // WAJIB untuk mengirim HttpOnly Cookie (Refresh Token)
      headers: {
        'Content-Type': 'application/json',
      }
    });

    this.setupInterceptors();
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve(token as string);
      }
    });
    this.failedQueue = [];
  }

  private setupInterceptors(): void {
    // 1. REQUEST INTERCEPTOR: Hanya menyisipkan Access Token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const { accessToken } = useClientStore.getState();
        
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 2. RESPONSE INTERCEPTOR: Menangani Global Error & Token Refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        // Cegah infinite loop dengan flag _retry
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          
          if (this.isRefreshing) {
            // Jika sedang refresh, masukkan request ke antrean (Queue)
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.client(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            // Asumsi: Backend ePTW menggunakan HttpOnly Cookie untuk Refresh Token, 
            // sehingga kita tidak perlu mengirim body, cukup pastikan `withCredentials` aktif.
            const response = await axios.post(
              `${API_BASE_URL}/api/eptw/auth/refresh`,
              {},
              { withCredentials: true }
            );

            const newAccessToken = response.data.data.access_token;
            
            // Simpan token baru ke memory store
            useClientStore.getState().setAccessToken(newAccessToken);

            // Jalankan ulang semua request di antrean dengan token baru
            this.processQueue(null, newAccessToken);

            // Jalankan ulang request yang pertama kali gagal
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.client(originalRequest);
            
          } catch (refreshError) {
            // Jika refresh token gagal/kedaluwarsa, paksa user logout
            this.processQueue(refreshError, null);
            useClientStore.getState().clearAuth();
            
            // Redirect ke halaman login (tanpa reload penuh jika memungkinkan, tapi window.location valid untuk memutus memory)
            window.location.href = '/';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Abstraksi method request agar komponen tidak memanggil Axios secara mentah
  public async request<T = any>(config: CustomAxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data; // Langsung return data, hilangkan wrapper AxiosResponse yang berlebihan
  }

  // Jika butuh instance mentah
  public getInstance(): AxiosInstance {
    return this.client;
  }
}

export const axiosService = new AxiosService();