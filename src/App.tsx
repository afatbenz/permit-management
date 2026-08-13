import { useEffect, type ReactNode } from 'react';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { RouterProvider, useRoute, useRouter } from '@/lib/router';
import { Spinner } from '@/components/ui';

import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { HomePage } from '@/pages/HomePage';
import { PermitManagementPage } from '@/pages/PermitManagementPage';
import { NewPermitPage } from '@/pages/NewPermitPage';
import { PermitDetailPage } from '@/pages/PermitDetailPage';
import { UsersManagementPage } from '@/pages/UsersManagementPage';
import { OrganizationSettingsPage } from '@/pages/OrganizationSettingsPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ProjectCategoryPage } from '@/pages/ProjectCategoryPage';
import { ProfilePage } from '@/pages/ProfilePage';

function Routes() {
  const { segments } = useRoute();
  const { navigate } = useRouter();
  const { user, loading } = useAuth();

  const isPublicPage = segments[0] === 'login' || segments[0] === 'register';

  // Accounts before onboarding carry the 'unassigned' role.
  const isUnassigned = user?.role?.code === 'unassigned';

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

  // An 'unassigned' account must complete onboarding before using the app.
  // Done as an effect so a manual navigate() to /dashboard (e.g. an in-page
  // "Ke Dashboard" button) is caught on the next render too, not only on
  // initial load.
  useEffect(() => {
    if (isUnassigned) navigate('/onboarding');
  }, [isUnassigned, navigate]);

  // Onboarding page is only for accounts that haven't picked an org yet.
  if (segments[0] === 'onboarding') {
    if (isUnassigned) return <OnboardingPage />;
    navigate('/dashboard');
    return null;
  }

  // Unassigned accounts can't reach any dashboard page — render nothing while
  // the effect above redirects to /onboarding (avoids a content flash).
  if (isUnassigned) return null;

  // Admin-only dashboard pages — org_admin / super_admin. Some also admit
  // project_admin (Project Category page).
  const isAdmin = user?.role?.code === 'org_admin' || user?.role?.code === 'super_admin';
  const isProjectAdmin = user?.role?.code === 'project_admin';
  const adminRoute = (page: ReactNode, includeProjectAdmin = false) => {
    if (!isAdmin && !(includeProjectAdmin && isProjectAdmin)) {
      navigate('/dashboard');
      return null;
    }
    return page;
  };
  if (segments[0] === 'dashboard' && segments[1] === 'users') return adminRoute(<UsersManagementPage />);
  if (segments[0] === 'dashboard' && segments[1] === 'settings') return adminRoute(<OrganizationSettingsPage />);
  if (segments[0] === 'dashboard' && segments[1] === 'projects' && segments[2] === 'categories') {
    return adminRoute(<ProjectCategoryPage />, true);
  }
  if (segments[0] === 'dashboard' && segments[1] === 'projects') return adminRoute(<ProjectsPage />);
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
          <Routes />
        </AuthProvider>
      </RouterProvider>
    </ThemeProvider>
  );
}

export default App;
