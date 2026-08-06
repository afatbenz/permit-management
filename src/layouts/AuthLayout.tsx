import { type ReactNode } from 'react';
import { Logo } from '@/components/ui';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 dark:bg-slate-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center">
          <Logo />
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            ePTW Portal
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Sistem Manajemen Izin Kerja Elektronik
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-8 shadow-sm dark:border-slate-800 dark:bg-slate-800/50 sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}