import { type ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Menu,
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
  FileCheck,
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
  /** Admins + members whose per-project role is project_admin (effective role). */
  adminOrProjectAdmin?: boolean;
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
type NavEntry = ({ kind: 'item' } & NavChild) | ({ kind: 'group' } & NavGroup);

// Section label shown as an uppercase micro-header above each nav group.
const NAV: Array<{ section: string; entry: NavEntry }> = [
  {
    section: 'MAIN',
    entry: {
      kind: 'item',
      label: 'Home',
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: '/dashboard',
      match: (s) => s[0] === 'dashboard' && s.length === 1,
    },
  },
  {
    section: 'PERMIT MANAGEMENT',
    entry: {
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
  },
  {
    section: 'PROJECT',
    entry: {
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
          label: 'Bank Question',
          icon: <FileCheck className="h-4 w-4" />,
          path: '/dashboard/projects/bank-questions',
          match: (s) => s[0] === 'dashboard' && s[1] === 'projects' && s[2] === 'bank-questions',
        },
        {
          label: 'Project Category',
          icon: <FolderTree className="h-4 w-4" />,
          path: '/dashboard/projects/categories',
          match: (s) => s[0] === 'dashboard' && s[1] === 'projects' && s[2] === 'categories',
        },
      ],
    },
  },
  {
    section: 'SETTINGS',
    entry: {
      kind: 'group',
      label: 'Settings',
      icon: <Settings2 className="h-5 w-5" />,
      children: [
        {
          label: 'Users',
          icon: <Users className="h-4 w-4" />,
          path: '/dashboard/users',
          match: (s) => s[0] === 'dashboard' && s[1] === 'users',
          adminOrProjectAdmin: true,
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
  // The effective role for the CURRENT context: members act as the role they
  // hold inside the project they picked (e.g. project_admin), admins as their
  // global role. The global role only gates the admin organization pages.
  const { hasProject } = useHasProject(user?.id);
  // Members are project-scoped by session: nav gates on the chosen project.
  const { activeProject, isMember } = useActiveProject();
  const hasAccessibleProject = isMember ? !!activeProject : hasProject;

  const roleCode = isMember
    ? (activeProject?.roleCode ?? user?.role?.code)
    : (user?.role?.code ?? null);
  const roleName = isMember
    ? (activeProject?.roleName ?? user?.role?.name ?? '')
    : (user?.role?.name ?? '');
  const isAdmin = roleCode === 'org_admin' || roleCode === 'super_admin';
  const isProjectAdmin = roleCode === 'project_admin';

  // Filter visible entries by role + project binding. Shared between the
  // visibility decision (does the group survive?) and the actual rendering —
  // filtering only for the gate and then rendering `group.children` raw was a
  // bug: admin-only children (e.g. All Project) leaked through to members.
  const filterChildren = (children: NavChild[]) =>
    children.filter((c) => {
      if (c.adminOnly && !isAdmin) return false;
      if (c.adminOrProjectAdmin && !isAdmin && !isProjectAdmin) return false;
      if (c.excludeRoles?.includes(roleCode ?? 'unassigned')) return false;
      if (c.needsProject && !hasAccessibleProject) return false;
      return true;
    });

  const visible = NAV.filter(({ entry }) => {
    if (entry.kind === 'item') {
      if (entry.adminOnly && !isAdmin) return false;
      if (entry.adminOrProjectAdmin && !isAdmin && !isProjectAdmin) return false;
      if (entry.excludeRoles?.includes(roleCode ?? 'unassigned')) return false;
      if (entry.needsProject && !hasAccessibleProject) return false;
      return true;
    }
    if (entry.gate === 'admin' && !isAdmin) return false;
    if (entry.gate === 'adminOrProjectAdmin' && !isAdmin && !isProjectAdmin) return false;
    if (entry.needsProject && !hasAccessibleProject) return false;
    return filterChildren(entry.children).length > 0;
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

  // Light sidebar: white panel, blue accent for the active item. The active
  // state gets a rounded left bar (indicator) + blue text on a blue-50 chip.
  const itemClasses = (isActive: boolean) =>
    `group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
      isActive
        ? 'bg-blue-50 text-blue-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  const activeBar = (isActive: boolean) =>
    isActive ? (
      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-blue-600" />
    ) : null;

  const iconClasses = (isActive: boolean) =>
    `transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`;

  const renderChild = (child: NavChild) => {
    const isActive = childActive(child);
    return (
      <button key={child.path} onClick={() => handleNav(child.path)} className={itemClasses(isActive)}>
        {activeBar(isActive)}
        <span className={iconClasses(isActive)}>{child.icon}</span>
        {child.label}
      </button>
    );
  };

  // Sub-items of a collapsible group: indented, with a small dot indicator.
  const renderSubChild = (child: NavChild) => {
    const isActive = childActive(child);
    return (
      <button key={child.path} onClick={() => handleNav(child.path)} className={itemClasses(isActive)}>
        {activeBar(isActive)}
        <span
          className={`h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors ${
            isActive ? 'bg-blue-600' : 'bg-gray-300 group-hover:bg-gray-400'
          }`}
        />
        <span className={isActive ? 'font-semibold text-blue-700' : 'text-gray-600'}>{child.label}</span>
      </button>
    );
  };

  const renderGroup = (group: NavGroup) => {
    // Groups stay open once shown; only an explicit click closes them. This
    // way navigating to another group never collapses the one you were in.
    const expanded = openGroups[group.label] ?? true;
    const isActive = groupActive(group);
    return (
      <div key={group.label}>
        <button
          onClick={() => handleToggleGroup(group.label)}
          className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
            isActive
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          {activeBar(isActive)}
          <span className={iconClasses(isActive)}>{group.icon}</span>
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''} ${
              isActive ? 'text-blue-600' : 'text-gray-400'
            }`}
          />
        </button>
        {expanded && <div className="mt-0.5 space-y-0.5 pl-3">{filterChildren(group.children).map(renderSubChild)}</div>}
      </div>
    );
  };

  const SidebarContent = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center px-5">
        <button onClick={() => handleNav('/dashboard')} className="transition-opacity hover:opacity-80">
          <Logo />
        </button>
      </div>
      <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {visible.map(({ section, entry }) => (
          <div key={`${section}-${entry.label}`}>
            <p className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {section}
            </p>
            {entry.kind === 'item' ? renderChild(entry) : renderGroup(entry)}
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <button
          onClick={async () => {
            await signOut();
            navigate('/login');
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-5 w-5 text-gray-400" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-gray-200 bg-white lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 animate-fade-in border-r border-gray-200 bg-white">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 text-gray-400 hover:text-gray-600">
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
          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search permits, projects..."
              className="input-field !py-2"
              style={{ paddingLeft: '2.5rem', paddingRight: '4rem' }}
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
              Ctrl K
            </kbd>
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
              <Sun className="h-5 w-5" />
            </button>
            <NotificationBell />
            <button
              onClick={() => navigate('/dashboard/profile')}
              className="ml-1 flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {initials || 'U'}
              </div>
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-xs font-semibold text-gray-900 dark:text-slate-100">{user?.email}</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">{roleName || 'User'}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
            </button>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
