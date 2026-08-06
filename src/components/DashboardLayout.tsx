import { type ReactNode, useState } from 'react';
import { LayoutDashboard, FileText, LogOut, Menu, Moon, Sun, X, Bell, Search, Users, User } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { Logo } from '@/components/ui';

type NavItem = { label: string; icon: ReactNode; path: string; match: (segs: string[]) => boolean; adminOnly?: boolean };

const NAV: NavItem[] = [
  { label: 'Home', icon: <LayoutDashboard className="h-5 w-5" />, path: '/dashboard', match: (s) => s[0] === 'dashboard' && s.length === 1 },
  { label: 'Permit Management', icon: <FileText className="h-5 w-5" />, path: '/dashboard/permits', match: (s) => s[0] === 'dashboard' && s[1] === 'permits' },
  { label: 'Users', icon: <Users className="h-5 w-5" />, path: '/dashboard/users', match: (s) => s[0] === 'dashboard' && s[1] === 'users', adminOnly: true },
  { label: 'Profile', icon: <User className="h-5 w-5" />, path: '/dashboard/profile', match: (s) => s[0] === 'dashboard' && s[1] === 'profile' },
];

export function DashboardLayout({ children, active }: { children: ReactNode; active: string }) {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const { navigate } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = user?.name ?? user?.email ?? 'Pengguna';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  const roleName = user?.role?.name ?? '';
  const isOrgAdmin = user?.role?.code === 'org_admin' || user?.role?.code === 'super_admin';
  const visibleNav = NAV.filter((item) => !item.adminOnly || isOrgAdmin);

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <button onClick={() => handleNav('/dashboard')} className="transition-opacity hover:opacity-80">
          <Logo />
        </button>
      </div>
      <nav className="mt-2 flex-1 space-y-1 px-3">
        <p className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Menu</p>
        {visibleNav.map((item) => {
          const isActive = item.label === active;
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                ${isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'}`}
            >
              <span className={`transition-colors ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 group-hover:text-gray-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 p-3 dark:border-slate-800">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
        >
          <LogOut className="h-5 w-5 text-gray-400 dark:text-slate-500" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-800/30 lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 animate-fade-in border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
              <X className="h-5 w-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative hidden flex-1 max-w-md sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search permits, projects..."
              className="input-field !py-2"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
            <button onClick={toggle} className="rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button className="relative rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            </button>
            <div className="ml-1 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {initials || 'U'}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-xs font-semibold text-gray-900 dark:text-slate-100">{user?.email}</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">{roleName || 'User'}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
