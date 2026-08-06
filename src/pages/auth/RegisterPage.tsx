import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Phone, Building2, Lock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { registerSchema, type RegisterFormInputs } from '@/schemas/auth.schema';
import { registerUser, fetchCompanies } from '@/stores/Client';

export function RegisterPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  
  // State to store the list of companies
  const [companies, setCompanies] = useState<{value: string, label: string}[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

  // Initialize form with external schema
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting } 
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched', 
  });

  // Fetch company data when the page first loads
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const data = await fetchCompanies();
        setCompanies(data);
      } catch (error) {
        console.error("Gagal memuat perusahaan", error);
      } finally {
        setIsLoadingCompanies(false);
      }
    };
    loadCompanies();
  }, []);

  const onSubmit = async (data: RegisterFormInputs) => {
    try {
      setApiError(null);
      
      // Call the function from the service
      await registerUser(data);
      
      alert('Registrasi berhasil! Silakan login.');
      navigate('/auth/login');
      
    } catch (error: any) {
      console.error('[PAGE ERROR]', error);
      setApiError(error.message || 'Terjadi kesalahan pada server. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 p-4 sm:p-8">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Sisi Kiri: Branding */}
        <div className="hidden lg:flex flex-col text-white w-1/2 pr-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-600 font-bold text-xl shadow-lg">
              e
            </div>
            <h1 className="text-4xl font-extrabold tracking-wider italic">e-PTW SYSTEM</h1>
          </div>
          <p className="text-xl font-medium opacity-90">Electronic Permit to Work</p>
          <p className="mt-4 text-sm opacity-75 max-w-md leading-relaxed">
            Sistem perizinan kerja terintegrasi untuk memastikan standar keselamatan dan keamanan kerja.
          </p>
        </div>

        {/* Sisi Kanan: Form */}
        <div className="w-full lg:w-[480px] bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Daftar Akun</h2>
            <p className="text-sm text-gray-500 mt-2">Portal Sub-Contractor CGK-065</p>
          </div>

          {apiError && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Input Nama */}
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Nama Lengkap"
                  className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:text-sm"
                  {...register('fullName')}
                />
              </div>
              {errors.fullName && <p className="mt-1 text-xs text-red-500 font-medium">{errors.fullName.message}</p>}
            </div>

            {/* Input Email */}
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  placeholder="Alamat Email"
                  className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:text-sm"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>}
            </div>

            {/* Input Telepon */}
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  placeholder="Nomor Telepon"
                  className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:text-sm"
                  {...register('phone')}
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-red-500 font-medium">{errors.phone.message}</p>}
            </div>

            {/* Dropdown Perusahaan dari API Mockup */}
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  className="block w-full appearance-none rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:text-sm"
                  {...register('companyId')}
                  defaultValue=""
                  disabled={isLoadingCompanies}
                >
                  <option value="" disabled className="text-gray-400">
                    {isLoadingCompanies ? 'Memuat Perusahaan...' : 'Pilih Perusahaan / Sub-Con'}
                  </option>
                  {companies.map((company) => (
                    <option key={company.value} value={company.value}>
                      {company.label}
                    </option>
                  ))}
                </select>
              </div>
              {errors.companyId && <p className="mt-1 text-xs text-red-500 font-medium">{errors.companyId.message}</p>}
            </div>

            {/* Input Password */}
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  placeholder="Password"
                  className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:text-sm"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>}
            </div>

            {/* Tombol Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full justify-center rounded-lg bg-red-600 py-3.5 px-4 text-base font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? 'Memproses Data...' : 'Daftar Sekarang'}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm text-gray-600 border-t pt-6">
            Sudah punya akun?{' '}
            <button 
              type="button" 
              onClick={() => navigate('/auth/login')}
              className="font-semibold text-red-600 hover:text-red-500 transition-colors"
            >
              Sign in di sini
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
