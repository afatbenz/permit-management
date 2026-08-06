import { type FC, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Loader from '@/components/Loader';
import { useClientStore } from '@/stores/Client';
import { ENUM_ROLE_AUTH } from '@/types/route';

type ClientProps = {
  children: ReactNode;
  isProtected?: boolean;
  isUnProtected?: boolean;
  roles?: ENUM_ROLE_AUTH[];
};

const Client: FC<ClientProps> = ({ children, isProtected, isUnProtected, roles }) => {
  const location = useLocation();
  // Hapus 'isLoading' dan 'accessToken' dari dependensi destructuring
  const { isAuthenticated, hydrated, user } = useClientStore();

  // 1. Blocker Rehidrasi (Hanya cegah render sampai LocalStorage selesai dibaca)
  if (!hydrated) {
    return <Loader background="light" />;
  }

  // 2. Kunci Keamanan: Evaluasi sesi HANYA dari persisted state (isAuthenticated).
  // Biarkan Axios Interceptor yang mengurus accessToken null saat proses request API berjalan.
  const isAuth = isAuthenticated;
  const roleUser = user?.role?.code as ENUM_ROLE_AUTH;

  // 3. Guard: Halaman Terproteksi
  if (isProtected && !isAuth) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 4. Guard: Halaman Guest Only (Login/Register)
  if (isUnProtected && isAuth) {
    return <Navigate to="/dashboard" replace />;
  }

  // 5. Guard: Role-Based Access Control (RBAC)
  if (isProtected && roles && roles.length > 0) {
    // Jika user tidak punya role valid ATAU role tidak ada di dalam whitelist
    if (!roleUser || !roles.includes(roleUser)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default Client;