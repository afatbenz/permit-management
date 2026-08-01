import { ThemeProvider } from '@/lib/theme';
import { AuthProvider } from '@/lib/auth';
import { RouterProvider, useRoute } from '@/lib/router';

import { HomePage } from '@/pages/HomePage';
import { PermitManagementPage } from '@/pages/PermitManagementPage';
import { NewPermitPage } from '@/pages/NewPermitPage';
import { PermitDetailPage } from '@/pages/PermitDetailPage';

function Routes() {
  const { segments } = useRoute();

  // Auth is bypassed — always show dashboard
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
