import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useClientStore } from '@/stores/Client';
import { loginSchema, type LoginFormInputs } from '@/schemas/auth.schema';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useClientStore((state) => state.login);
  const [apiError, setApiError] = useState<string | null>(null);

  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting } 
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched', 
  });

  const onSubmit = async (data: LoginFormInputs) => {
    try {
      setApiError(null);
      
      // 1. Call login from Zustand Store
      const success = await login({ email: data.email, password: data.password });
      
      if (success) {
        // 2. Arahkan ke Dashboard
        navigate('/dashboard');
      } else {
        setApiError('Email atau password salah. Silakan coba lagi.');
      }
    } catch (error: any) {
      console.error('[AUTH ERROR] Login Gagal:', error);
      setApiError('Email atau password salah. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 p-4 sm:p-8">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Sisi Kiri: Branding Split-Screen */}
        <div className="hidden lg:flex flex-col text-white w-1/2 pr-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-600 font-bold text-xl shadow-lg">
              e
            </div>
            <h1 className="text-4xl font-extrabold tracking-wider italic">e-PTW SYSTEM</h1>
          </div>
          <p className="text-xl font-medium opacity-90">Electronic Permit to Work</p>
          <p className="mt-4 text-sm opacity-75 max-w-md leading-relaxed">
            Sistem perizinan kerja terintegrasi untuk memastikan standar keselamatan dan keamanan kerja di area operasional CGK-065.
          </p>
        </div>

        {/* Sisi Kanan: Form Card */}
        <div className="w-full lg:w-[480px] bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Sign In</h2>
            <p className="text-sm text-gray-500 mt-2">Portal Akses ePTW CGK-065</p>
          </div>

          {apiError && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            
            {/* Field: Email */}
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  placeholder="Alamat Email"
                  className={`block w-full rounded-lg border py-3 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-colors ${
                    errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-red-500 focus:ring-red-500/20'
                  }`}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>}
            </div>

            {/* Field: Password */}
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  placeholder="Password"
                  className={`block w-full rounded-lg border py-3 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-colors ${
                    errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-red-500 focus:ring-red-500/20'
                  }`}
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>}
            </div>

            {/* Lupa Password */}
            <div className="flex items-center justify-end">
              <button type="button" className="text-sm font-semibold text-red-600 hover:text-red-500 transition-colors">
                Lupa Password?
              </button>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full justify-center rounded-lg bg-red-600 py-3.5 px-4 text-base font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? 'Memverifikasi...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm text-gray-600 border-t pt-6">
            Belum punya akun Sub-Con?{' '}
            <button 
              type="button" 
              onClick={() => navigate('/register')}
              className="font-semibold text-red-600 hover:text-red-500 transition-colors"
            >
              Daftar di sini
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
