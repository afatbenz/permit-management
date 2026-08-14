import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type Project, type RoleCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/**
 * The project a non-admin ("member") has selected for this session. After
 * login, members are sent to a project picker; the chosen project scopes every
 * dashboard page (permits, stats, waiting approval, new-permit form).
 *
 * Admins (org_admin / super_admin) do NOT hold an active project — their
 * pages are org-global. When the logged-in user is an admin (or logged out)
 * `activeProject` is null and `isMember` is false.
 *
 * Mirrors the auth/session model: memory-only, not persisted to localStorage.
 * Reloading the page drops the session and the user signs in again.
 */

export type ActiveProject = {
  id: string;
  name: string;
  projectCode: string;
  roleCode?: RoleCode | null;
  roleName?: string | null;
};

type ActiveProjectCtx = {
  /** The member's chosen project, or null for admins / members before picking. */
  activeProject: ActiveProject | null;
  /** True for every non-admin (incl. project_admin / unassigned). */
  isMember: boolean;
  /** The member's ACTIVE assignments (from `GET /projects/mine`). Empty for admins. */
  projects: Project[];
  loading: boolean;
  selectProject: (id: string) => void;
  refresh: () => Promise<void>;
};

const ActiveProjectContext = createContext<ActiveProjectCtx | undefined>(undefined);

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const isMember = !!user && user.role?.code !== 'org_admin' && user.role?.code !== 'super_admin';

  const fetchProjects = useCallback(async (): Promise<Project[]> => {
    try {
      const res = await api.listMyProjects();
      return res.projects;
    } catch {
      return [];
    }
  }, []);

  // Rebuild on sign-in/sign-out / role change. Preserve the current selection
  // only while it still appears in the member's active-assignment list.
  useEffect(() => {
    let cancelled = false;
    if (!user || !isMember) {
      setActiveProject(null);
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchProjects().then((list) => {
      if (cancelled) return;
      setProjects(list);
      setActiveProject((prev) => (prev && list.some((p) => p.id === prev.id) ? prev : null));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role?.code]);

  const selectProject = useCallback(
    (id: string) => {
      const proj = projects.find((p) => p.id === id);
      if (!proj) return;
      setActiveProject({
        id: proj.id,
        name: proj.name,
        projectCode: proj.projectCode,
        roleCode: proj.roleCode,
        roleName: proj.roleName,
      });
    },
    [projects],
  );

  const refresh = useCallback(async () => {
    const list = await fetchProjects();
    setProjects(list);
    setActiveProject((prev) => (prev && list.some((p) => p.id === prev.id) ? prev : null));
  }, [fetchProjects]);

  return (
    <ActiveProjectContext.Provider
      value={{ activeProject, isMember, projects, loading, selectProject, refresh }}
    >
      {children}
    </ActiveProjectContext.Provider>
  );
}

export function useActiveProject() {
  const ctx = useContext(ActiveProjectContext);
  if (!ctx) throw new Error('useActiveProject must be used within ActiveProjectProvider');
  return ctx;
}
