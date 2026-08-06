import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig
} from 'axios';
import { useClientStore } from '@/stores/Client';

const API_BASE_URL = import.meta.env.VITE_API_HOST || 'http://202.10.36.37:80';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

class AxiosService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
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
    // 1. REQUEST INTERCEPTOR
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

    // 2. RESPONSE INTERCEPTOR
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          
          if (this.isRefreshing) {
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
            // AMBIL REFRESH TOKEN DARI ZUSTAND STORE
            const { refreshToken, setAccessToken } = useClientStore.getState();

            // Guard: Jika tidak ada refresh token di memori/storage, paksa logout
            if (!refreshToken) {
               throw new Error('Refresh token tidak tersedia');
            }

            // KIRIM REFRESH TOKEN VIA BODY JSON
            const response = await axios.post(
              `${API_BASE_URL}/api/v1/auth/refresh`,
              { refreshToken }, // Payload JSON yang ditangkap backend
              { headers: { 'Content-Type': 'application/json' } }
            );

            // Sesuaikan properti 'accessToken' dengan response JSON dari backend Anda
            const newAccessToken = response.data.data.accessToken; 
            
            setAccessToken(newAccessToken);
            this.processQueue(null, newAccessToken);

            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.client(originalRequest);
            
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            useClientStore.getState().clearAuth();
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

  public async request<T = any>(config: CustomAxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }

  public getInstance(): AxiosInstance {
    return this.client;
  }
}

export const axiosService = new AxiosService();