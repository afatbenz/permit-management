import { useEffect } from 'react';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { RouterProvider, useRoute, useRouter } from '@/lib/router';
import { Spinner } from '@/components/ui';

import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { UpdatePasswordPage } from '@/pages/UpdatePasswordPage';
import { HomePage } from '@/pages/HomePage';
import { PermitManagementPage } from '@/pages/PermitManagementPage';
import { NewPermitPage } from '@/pages/NewPermitPage';
import { PermitDetailPage } from '@/pages/PermitDetailPage';

function Routes() {
  const { segments } = useRoute();
  const { navigate } = useRouter();
  const { session, loading } = useAuth();

  const isAuthRoute = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'reset-password' || segments[0] === 'update-password';

  useEffect(() => {
    if (loading) return;
    if (!session && !isAuthRoute) {
      navigate('/login');
    } else if (session && isAuthRoute) {
      navigate('/dashboard');
    }
  }, [loading, session, isAuthRoute, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Spinner className="h-7 w-7 text-brand-500" />
      </div>
    );
  }

  if (!session) {
    if (segments[0] === 'register') return <RegisterPage />;
    if (segments[0] === 'reset-password') return <ResetPasswordPage />;
    if (segments[0] === 'update-password') return <UpdatePasswordPage />;
    return <LoginPage />;
  }

  if (segments[0] === undefined || segments[0] === 'login') return <HomePage />;
  if (segments[0] === 'dashboard' && segments.length === 1) return <HomePage />;
  if (segments[0] === 'dashboard' && segments[1] === 'permits' && segments.length === 2) return <PermitManagementPage />;
  if (segments[0] === 'dashboard' && segments[1] === 'permits' && segments[2] === 'new') return <NewPermitPage />;
  if (segments[0] === 'dashboard' && segments[1] === 'permits' && segments[2]) return <PermitDetailPage id={segments[2]} />;

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
