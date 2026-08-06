import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useClientStore } from '@/stores/Client';

// 1. Definisi Skema Validasi Zod (Ketat & Type-Safe)
const registerSchema = z.object({
  name: z.string().min(3, { message: 'Nama lengkap minimal 3 karakter' }),
  email: z.string().email({ message: 'Format email tidak valid' }),
  phone: z
    .string()
    .min(10, { message: 'Nomor telepon minimal 10 digit' })
    .regex(/^[0-9]+$/, { message: 'Hanya angka yang diperbolehkan' }),
  password: z.string().min(8, { message: 'Password minimal 8 karakter' }),
});

// Ekstrak tipe TypeScript langsung dari skema Zod
type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterPage = () => {
  const navigate = useNavigate();
  
  // Gunakan alias 'registerAccount' agar tidak bentrok dengan 'register' dari RHF
  const { register: registerAccount, isLoading, error: apiError } = useClientStore();

  // 2. Inisialisasi React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onSubmit', // Validasi dieksekusi saat tombol submit ditekan
  });

  // 3. Handler Submit
  const onSubmit = async (data: RegisterFormValues) => {
    const isSuccess = await registerAccount(data);
    
    if (isSuccess) {
      toast.success('Registrasi berhasil! Silakan login.');
      // Idealnya tampilkan toast success di sini
      navigate('/');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Daftar Akun Baru</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">Lengkapi data diri Anda di bawah ini</p>
      </div>

      {/* Menampilkan error dari Backend (API) */}
      {apiError && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          {apiError}
        </div>
      )}

      {/* Form terhubung dengan handleSubmit dari RHF */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        {/* Input Nama */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Nama Lengkap</label>
          <div className="relative mt-1">
            <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              {...register('name')}
              className={`block w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 transition-colors focus:outline-none focus:ring-1 dark:bg-slate-900 dark:text-white
                ${errors.name 
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-500' 
                  : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700'}`}
              placeholder="John Doe"
            />
          </div>
          {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
        </div>

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

        {/* Input Telepon */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Nomor Telepon</label>
          <div className="relative mt-1">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              {...register('phone')}
              className={`block w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 transition-colors focus:outline-none focus:ring-1 dark:bg-slate-900 dark:text-white
                ${errors.phone 
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-500' 
                  : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700'}`}
              placeholder="081234567890"
            />
          </div>
          {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone.message}</p>}
        </div>

        {/* Input Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Password</label>
          <div className="relative mt-1">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              {...register('password')}
              className={`block w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 transition-colors focus:outline-none focus:ring-1 dark:bg-slate-900 dark:text-white
                ${errors.password 
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-500' 
                  : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700'}`}
              placeholder="Minimal 8 karakter"
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
              Memproses...
            </>
          ) : (
            'Daftar Sekarang'
          )}
        </button>
      </form>

      <div className="text-center text-sm text-gray-500 dark:text-slate-400">
        Sudah memiliki akun?{' '}
        <Link to="/" className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400">
          Masuk di sini
        </Link>
      </div>
    </div>
  );
}

export default RegisterPage;