import { type ReactNode } from 'react';
import { Moon, Sun, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { Logo } from '@/components/ui';

export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 p-10 text-white lg:flex">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 0%, transparent 40%), radial-gradient(circle at 80% 80%, white 0%, transparent 40%)' }} />
        <div className="relative">
          <div className="text-white [&_p:last-child]:text-brand-200"><Logo /></div>
        </div>
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm ring-1 ring-white/20">
            <ShieldCheck className="h-4 w-4" /> Enterprise-grade security
          </div>
          <h2 className="max-w-md text-3xl font-extrabold leading-tight tracking-tight">
            Manage your project permits with confidence.
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-brand-100">
            Track applications, approvals, and contractor information — all in one centralized, audit-ready workspace.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <p className="text-2xl font-bold">12k+</p>
              <p className="text-xs text-brand-200">Permits issued</p>
            </div>
            <div>
              <p className="text-2xl font-bold">99.9%</p>
              <p className="text-xs text-brand-200">Uptime</p>
            </div>
            <div>
              <p className="text-2xl font-bold">450+</p>
              <p className="text-xs text-brand-200">Contractors</p>
            </div>
          </div>
        </div>
        <p className="relative text-xs text-brand-200/80">© 2026 PermitFlow. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-slate-900">
        <div className="flex items-center justify-between p-5">
          <div className="lg:hidden"><Logo /></div>
          <button onClick={toggle} className="ml-auto rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-10">
          <div className="w-full max-w-sm animate-fade-in">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">{title}</h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
