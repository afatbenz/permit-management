import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/lib/theme';
import ClientRoutes from '@/components/ClientRoutes';

function App() {
  return (
    <ThemeProvider>
      <Toaster 
        position="top-right" 
        reverseOrder={false} 
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: '#333',
            color: '#fff',
          },
        }}
      />
      
      <BrowserRouter>
        <ClientRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;