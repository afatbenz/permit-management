import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { useClientStore } from '@/stores/Client';

// 1. Skema Validasi Zod
const loginSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid' }),
  password: z.string().min(1, { message: 'Password wajib diisi' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error: apiError } = useClientStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
  });

  const onSubmit = async (data: LoginFormValues) => {
    const isSuccess = await login(data);
    
    if (isSuccess) {
      toast.success('Login berhasil!');
      navigate('/dashboard');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Selamat Datang</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">Masuk ke akun ePTW Anda</p>
      </div>

      {apiError && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        {/* Input Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Email</label>
          <div className="relative mt-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              {...register('email')}
              className={`block w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 transition-colors focus:outline-none focus:ring-1 dark:bg-slate-900 dark:text-white
                ${errors.email 
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-500' 
                  : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700'}`}
              placeholder="admin@example.com"
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
        </div>

        {/* Input Password */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Password</label>
            <Link to="#" className="text-xs font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400">
              Lupa password?
            </Link>
          </div>
          <div className="relative mt-1">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              {...register('password')}
              className={`block w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 transition-colors focus:outline-none focus:ring-1 dark:bg-slate-900 dark:text-white
                ${errors.password 
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-500' 
                  : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700'}`}
              placeholder="••••••••"
            />
          </div>
          {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memverifikasi...
            </>
          ) : (
            'Masuk'
          )}
        </button>
      </form>

      <div className="text-center text-sm text-gray-500 dark:text-slate-400">
        Belum memiliki akun?{' '}
        <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400">
          Daftar sekarang
        </Link>
      </div>
    </div>
  );
}