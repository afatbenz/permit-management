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

  // Onboarding page is only for accounts that haven't picked an org yet.
  if (segments[0] === 'onboarding') {
    if (isUnassigned) return <OnboardingPage />;
    navigate('/dashboard');
    return null;
  }

  // An 'unassigned' account must complete onboarding before using the app.
  if (isUnassigned) {
    navigate('/onboarding');
    return null;
  }

  // Users management — admin (org_admin / super_admin) only.
  const isAdmin = user?.role?.code === 'org_admin' || user?.role?.code === 'super_admin';
  if (segments[0] === 'dashboard' && segments[1] === 'users') {
    if (!isAdmin) {
      navigate('/dashboard');
      return null;
    }
    return <UsersManagementPage />;
  }
  if (segments[0] === 'dashboard' && segments[1] === 'permits' && segments[2] === 'new') return <NewPermitPage />;
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
