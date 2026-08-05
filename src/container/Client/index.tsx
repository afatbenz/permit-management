import { type FC, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Loader from '@/components/Loader';
import { useClientStore } from '@/stores/Client'; // Asumsi Anda menggunakan zustand sesuai referensi
import { ENUM_ROLE_AUTH } from '@/types/route';

type ClientProps = {
  children: ReactNode;
  isProtected?: boolean;
  isUnProtected?: boolean;
  roles?: ENUM_ROLE_AUTH[];
};

const Client: FC<ClientProps> = ({ children, isProtected, isUnProtected, roles }) => {
  const location = useLocation();
  const { isAuthenticated, accessToken, hydrated, isLoading, user } = useClientStore();
  
  // Tunggu store selesai hydrasi
  if (!hydrated || isLoading) {
    return <Loader background="light" />;
  }

  const isAuth = isAuthenticated && Boolean(accessToken);
  const roleUser = user?.role as ENUM_ROLE_AUTH;

  // 1. Guard untuk halaman yang butuh login
  if (isProtected && !isAuth) {
    // Redirect ke root/login, simpan lokasi sebelumnya agar bisa dikembalikan setelah login
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 2. Guard untuk halaman "guest only" (seperti halaman Login) saat user SUDAH login
  if (isUnProtected && isAuth) {
    return <Navigate to="/dashboard" replace />;
  }

  // 3. RBAC (Role-Based Access Control)
  if (isProtected && roles && roles.length > 0) {
    if (!roleUser || !roles.includes(roleUser)) {
      // Jika role tidak sesuai, lempar ke dashboard atau halaman 403
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default Client;