import { type ComponentType, type LazyExoticComponent } from 'react';

// Role codes mirror the backend `RoleCode` enum (epermit-backend). The guard
// compares against `user.role.code` from the API, so the enum values MUST be
// the exact backend codes.
export enum ENUM_ROLE_AUTH {
  SUPER_ADMIN = 'super_admin',
  ORG_ADMIN = 'org_admin',
  SUPERVISOR_SUBCON = 'supervisor_subcon',
  SUPERVISOR_MAINCON = 'supervisor_maincon',
  HSE_MAINCON = 'hse_maincon',
  CM_MAINCON = 'cm_maincon',
  PROJECT_ADMIN = 'project_admin',
  UNASSIGNED = 'unassigned',
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