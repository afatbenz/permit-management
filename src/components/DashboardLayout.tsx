import { type ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
  Search,
  Users,
  User,
  Settings2,
  FolderKanban,
  FolderTree,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useActiveProject } from '@/lib/activeProject';
import { useRouter } from '@/lib/router';
import { useHasProject } from '@/lib/useHasProject';
import type { RoleCode } from '@/lib/api';
import { Logo } from '@/components/ui';
import { NotificationBell } from '@/components/NotificationBell';

type NavChild = {
  label: string;
  icon: ReactNode;
  path: string;
  match: (segs: string[]) => boolean;
  adminOnly?: boolean;
  excludeRoles?: RoleCode[];
  /** Requires at least one ACTIVE project assignment (hidden otherwise). */
  needsProject?: boolean;
};
type NavGroup = {
  label: string;
  icon: ReactNode;
  /** 'admin' = org_admin || super_admin; 'adminOrProjectAdmin' also admits project_admin. */
  gate?: 'admin' | 'adminOrProjectAdmin';
  /** Hide the whole group until the user has an ACTIVE project. */
  needsProject?: boolean;
  children: NavChild[];
};
type NavEntry = { kind: 'item' } & NavChild | { kind: 'group' } & NavGroup;

const NAV: NavEntry[] = [
  {
    kind: 'item',
    label: 'Home',
    icon: <LayoutDashboard className="h-5 w-5" />,
    path: '/dashboard',
    match: (s) => s[0] === 'dashboard' && s.length === 1,
  },
  {
    kind: 'group',
    label: 'Permit Management',
    icon: <FileText className="h-5 w-5" />,
    needsProject: true,
    children: [
      {
        label: 'All Request',
        icon: <FileText className="h-4 w-4" />,
        path: '/dashboard/permits',
        match: (s) => s[0] === 'dashboard' && s[1] === 'permits' && s.length === 2,
        needsProject: true,
      },
      {
        label: 'Waiting Approval',
        icon: <ShieldCheck className="h-4 w-4" />,
        path: '/dashboard/permits/waiting',
        match: (s) => s[0] === 'dashboard' && s[1] === 'permits' && s[2] === 'waiting',
        excludeRoles: ['supervisor_subcon'],
        needsProject: true,
      },
    ],
  },
  {
    kind: 'group',
    label: 'Project',
    icon: <FolderKanban className="h-5 w-5" />,
    gate: 'adminOrProjectAdmin',
    children: [
      {
        label: 'All Project',
        icon: <FolderKanban className="h-4 w-4" />,
        path: '/dashboard/projects',
        match: (s) => s[0] === 'dashboard' && s[1] === 'projects' && s.length === 2,
        adminOnly: true,
      },
      {
        label: 'Project Category',
        icon: <FolderTree className="h-4 w-4" />,
        path: '/dashboard/projects/categories',
        match: (s) => s[0] === 'dashboard' && s[1] === 'projects' && s[2] === 'categories',
      },
    ],
  },
  {
    kind: 'group',
    label: 'Settings',
    icon: <Settings2 className="h-5 w-5" />,
    children: [
      {
        label: 'Users',
        icon: <Users className="h-4 w-4" />,
        path: '/dashboard/users',
        match: (s) => s[0] === 'dashboard' && s[1] === 'users',
        adminOnly: true,
        needsProject: true,
      },
      {
        label: 'Organization',
        icon: <Settings2 className="h-4 w-4" />,
        path: '/dashboard/settings',
        match: (s) => s[0] === 'dashboard' && s[1] === 'settings',
        adminOnly: true,
        needsProject: true,
      },
      {
        label: 'Profile',
        icon: <User className="h-4 w-4" />,
        path: '/dashboard/profile',
        match: (s) => s[0] === 'dashboard' && s[1] === 'profile',
      },
    ],
  },
];

export function DashboardLayout({ children, active }: { children: ReactNode; active: string }) {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const { navigate } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const displayName = user?.name ?? user?.email ?? 'Pengguna';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  const roleName = user?.role?.name ?? '';
  const roleCode = user?.role?.code;
  const isAdmin = roleCode === 'org_admin' || roleCode === 'super_admin';
  const isProjectAdmin = roleCode === 'project_admin';

  // Permit Management only makes sense once the user is bound to an ACTIVE
  // project. Admins are auto-assigned to the project they create, so this is
  // a real signal for every role (project-less accounts see Home + Settings).
  const { hasProject } = useHasProject(user?.id);
  // Members are project-scoped by session: nav gates on the chosen project.
  const { activeProject, isMember } = useActiveProject();
  const hasAccessibleProject = isMember ? !!activeProject : hasProject;

  // Filter visible entries by role + project binding.
  const visible = NAV.filter((entry) => {
    if (entry.kind === 'item') {
      if (entry.adminOnly && !isAdmin) return false;
      if (entry.excludeRoles?.includes(roleCode ?? 'unassigned')) return false;
      if (entry.needsProject && !hasAccessibleProject) return false;
      return true;
    }
    if (entry.gate === 'admin' && !isAdmin) return false;
    if (entry.gate === 'adminOrProjectAdmin' && !isAdmin && !isProjectAdmin) return false;
    if (entry.needsProject && !hasAccessibleProject) return false;
    const visibleChildren = entry.children.filter((c) => {
      if (c.adminOnly && !isAdmin) return false;
      if (c.excludeRoles?.includes(roleCode ?? 'unassigned')) return false;
      if (c.needsProject && !hasAccessibleProject) return false;
      return true;
    });
    return visibleChildren.length > 0;
  });

  const childActive = (child: NavChild) => child.label === active;
  const groupActive = (group: NavGroup) => group.children.some((c) => childActive(c));

  // Clicking a group header records the choice (open/collapsed) so later
  // navigation within it doesn't re-open everything from the default state.
  const handleToggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !(prev[label] ?? true) }));
  };

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const itemClasses = (isActive: boolean) =>
    `group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
      isActive
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
    }`;

  const iconClasses = (isActive: boolean) =>
    `transition-colors ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 group-hover:text-gray-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`;

  const renderChild = (child: NavChild) => {
    const isActive = childActive(child);
    return (
      <button key={child.path} onClick={() => handleNav(child.path)} className={itemClasses(isActive)}>
        <span className={iconClasses(isActive)}>{child.icon}</span>
        {child.label}
      </button>
    );
  };

  const renderGroup = (group: NavGroup) => {
    // Groups stay open once shown; only an explicit click closes them. This
    // way navigating to another group never collapses the one you were in.
    const expanded = openGroups[group.label] ?? true;
    return (
      <div key={group.label}>
        <button
          onClick={() => handleToggleGroup(group.label)}
          className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
            groupActive(group)
              ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          }`}
        >
          <span className={iconClasses(groupActive(group))}>{group.icon}</span>
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''} ${
              groupActive(group) ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-slate-500'
            }`}
          />
        </button>
        {expanded && <div className="mt-1 space-y-1 pl-4">{group.children.map(renderChild)}</div>}
      </div>
    );
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <button onClick={() => handleNav('/dashboard')} className="transition-opacity hover:opacity-80">
          <Logo />
        </button>
      </div>
      <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3">
        <p className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Menu</p>
        {visible.map((entry) => (entry.kind === 'item' ? renderChild(entry) : renderGroup(entry)))}
      </nav>
      <div className="border-t border-gray-200 p-3 dark:border-slate-800">
        <button
          onClick={async () => {
            await signOut();
            navigate('/login');
          }}
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
            {isMember && activeProject && (
              <button
                onClick={() => navigate('/select-project')}
                className="hidden items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 sm:inline-flex"
                title="Ganti project aktif"
              >
                <FolderKanban className="h-3.5 w-3.5" />
                <span className="max-w-[180px] truncate">{activeProject.name}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={toggle} className="rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <NotificationBell />
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
