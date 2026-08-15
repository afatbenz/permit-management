import { useEffect, type ReactNode } from 'react';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ActiveProjectProvider, useActiveProject } from '@/lib/activeProject';
import { RouterProvider, useRoute, useRouter } from '@/lib/router';
import { useHasProject } from '@/lib/useHasProject';
import { Spinner } from '@/components/ui';

import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { SelectProjectPage } from '@/pages/SelectProjectPage';
import { HomePage } from '@/pages/HomePage';
import { PermitManagementPage } from '@/pages/PermitManagementPage';
import { NewPermitPage } from '@/pages/NewPermitPage';
import { PermitDetailPage } from '@/pages/PermitDetailPage';
import { UsersManagementPage } from '@/pages/UsersManagementPage';
import { OrganizationSettingsPage } from '@/pages/OrganizationSettingsPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ProjectCategoryPage } from '@/pages/ProjectCategoryPage';
import { BankQuestionPage } from '@/pages/BankQuestionPage';
import { ProfilePage } from '@/pages/ProfilePage';

function Routes() {
  const { segments } = useRoute();
  const { navigate } = useRouter();
  const { user, loading } = useAuth();
  // All hooks are called unconditionally at the very top — Routes() has many
  // early returns (public pages, onboarding, picker redirects) and any hook
  // declared after one of them would make the hook count vary between renders,
  // which React rejects ("Rendered more hooks than during the previous render").
  const { activeProject, isMember } = useActiveProject();
  const { hasProject } = useHasProject(user?.id);

  const isPublicPage = segments[0] === 'login' || segments[0] === 'register';

  // Accounts before onboarding carry the 'unassigned' role.
  const isUnassigned = user?.role?.code === 'unassigned';

  // An 'unassigned' account must complete onboarding before using the app.
  // Done as an effect so a manual navigate() to /dashboard (e.g. an in-page
  // "Ke Dashboard" button) is caught on the next render too, not only on
  // initial load.
  useEffect(() => {
    if (isUnassigned) navigate('/onboarding');
  }, [isUnassigned, navigate]);

  // Wait for boot (memory-only, so effectively instant) before deciding.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Spinner className="h-8 w-8 text-brand-600 dark:text-brand-400" />
      </div>
    );
  }

  // Authenticated users never see the auth pages.
  if (user && isPublicPage) {
    navigate('/dashboard');
    return null;
  }

  // Everything except /login and /register requires a session.
  if (!user && !isPublicPage) {
    navigate('/login');
    return null;
  }

  if (isPublicPage) {
    if (segments[0] === 'login') return <LoginPage />;
    return <RegisterPage />;
  }

  // Onboarding page is only for accounts that haven't picked an org yet.
  if (segments[0] === 'onboarding') {
    if (isUnassigned) return <OnboardingPage />;
    navigate('/dashboard');
    return null;
  }

  // Unassigned accounts can't reach any dashboard page — render nothing while
  // the effect above redirects to /onboarding (avoids a content flash).
  if (isUnassigned) return null;

  // Non-admins work inside a chosen project: they pick one right after login,
  // and the picker is always reachable (header "ganti project") to switch.
  if (segments[0] === 'select-project') {
    if (!isMember) {
      navigate('/dashboard');
      return null;
    }
    return <SelectProjectPage />;
  }
  if (isMember && !activeProject) {
    navigate('/select-project');
    return null;
  }

  // Admin-only dashboard pages — org_admin / super_admin. Some also admit
  // project_admin (Bank Question / Users pages). For members the effective
  // role is the per-project role of the project they picked (e.g. a user whose
  // global role is supervisor_subcon but holds project_admin in their project
  // gets the project_admin menus); org-level pages still require a true admin.
  const effectiveRole = isMember ? (activeProject?.roleCode ?? user?.role?.code) : user?.role?.code;
  const isAdmin = effectiveRole === 'org_admin' || effectiveRole === 'super_admin';
  const isProjectAdmin = effectiveRole === 'project_admin';

  const adminRoute = (page: ReactNode, includeProjectAdmin = false) => {
    if (!isAdmin && !(includeProjectAdmin && isProjectAdmin)) {
      navigate('/dashboard');
      return null;
    }
    return page;
  };
  // Users / Organization / Project pages are project-scoped — a user with no
  // ACTIVE project assignment gets bounced to the dashboard (mirrors the
  // sidebar hiding those menus). For members the binding to a project is
  // established the moment they pick one (`activeProject`), so that is the
  // single source of truth here — `hasProject` would stay stale/false for a
  // member even though their assignment is active.
  const hasAccessibleProject = isMember ? !!activeProject : hasProject;
  const projectScopedRoute = (page: ReactNode) => {
    if (!hasAccessibleProject) {
      navigate('/dashboard');
      return null;
    }
    return page;
  };
  if (segments[0] === 'dashboard' && segments[1] === 'users') {
    return projectScopedRoute(adminRoute(<UsersManagementPage />, true));
  }
  if (segments[0] === 'dashboard' && segments[1] === 'settings') {
    return projectScopedRoute(adminRoute(<OrganizationSettingsPage />));
  }
  if (segments[0] === 'dashboard' && segments[1] === 'projects' && segments[2] === 'bank-questions') {
    return projectScopedRoute(adminRoute(<BankQuestionPage />, true));
  }
  if (segments[0] === 'dashboard' && segments[1] === 'projects' && segments[2] === 'categories') {
    return projectScopedRoute(adminRoute(<ProjectCategoryPage />, true));
  }
  if (segments[0] === 'dashboard' && segments[1] === 'projects') {
    // org_admin only — project_admin must not reach the org-wide project list.
    return projectScopedRoute(adminRoute(<ProjectsPage />));
  }
  if (segments[0] === 'dashboard' && segments[1] === 'profile') return <ProfilePage />;
  if (segments[0] === 'dashboard' && segments[1] === 'permits' && segments[2] === 'new') return <NewPermitPage />;
  if (segments[0] === 'dashboard' && segments[1] === 'permits' && segments[2] === 'waiting') {
    return <PermitManagementPage filter="waiting" />;
  }
  if (segments[0] === 'dashboard' && segments[1] === 'permits' && segments[2]) return <PermitDetailPage id={segments[2]} />;
  if (segments[0] === 'dashboard' && segments[1] === 'permits') return <PermitManagementPage />;
  if (segments[0] === 'dashboard') return <HomePage />;

  return <HomePage />;
}

function App() {
  return (
    <ThemeProvider>
      <RouterProvider>
        <AuthProvider>
          <ActiveProjectProvider>
            <Routes />
          </ActiveProjectProvider>
        </AuthProvider>
      </RouterProvider>
    </ThemeProvider>
  );
}

export default App;
