import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider } from '@/lib/auth';
import ClientRoutes from '@/components/ClientRoutes';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* BrowserRouter wajib membungkus ClientRoutes agar hooks seperti useNavigate dan useLocation dapat bekerja */}
        <BrowserRouter>
          <ClientRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;