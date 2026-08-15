import { type ComponentType, type LazyExoticComponent } from 'react';

// Sesuaikan role dengan domain ePTW
export enum ENUM_ROLE_AUTH {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SAFETY_OFFICER = 'SAFETY_OFFICER',
  ISSUER = 'ISSUER',
  EXECUTOR = 'EXECUTOR',
  UNASSIGNED = 'unassigned'
}

export type TAppRoute = {
  path: string;
  name: string;
  isProtected?: boolean;
  isUnProtected?: boolean; // True jika halaman hanya untuk user yang BELUM login (misal: halaman Login)
  component: LazyExoticComponent<ComponentType<any>> | ComponentType<any>;
  layout?: LazyExoticComponent<ComponentType<{ children: React.ReactNode }>> | ComponentType<{ children: React.ReactNode }>;
  roles?: ENUM_ROLE_AUTH[];
  subRoutes?: TAppRoute[];
};