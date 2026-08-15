import { lazy } from 'react';
import { ENUM_ROLE_AUTH, type TAppRoute } from '@/types/route';

// Hanya import satu layout yang dibutuhkan
const DashboardLayout = lazy(() => import('@/layouts/DashboardLayout'));
const AuthLayout = lazy(() => import('@/layouts/AuthLayout'));

// Pages
const Login = lazy(() => import('@/pages/LoginPage'));
// const Dashboard = lazy(() => import('@/pages/Dashboard'));
// const Dashboard = lazy(() => import('@/pages/HomePage'));
const Dashboard = lazy(() => import('@/pages/HomePage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const PermitManagementPage = lazy(() => import('@/pages/PermitManagementPage'));
const NewPermitPage = lazy(() => import('@/pages/NewPermitPage'));
// const PermitDetailPage = lazy(() => import('@/pages/PermitDetailPage'));
// const NotFound = lazy(() => import('@/pages/NotFound'));

const routes: TAppRoute[] = [
  {
    path: '/',
    name: 'Login',
    isProtected: false,
    isUnProtected: true,
    component: Login,
    layout: AuthLayout // Gunakan AuthLayout
  },
  {
    path: '/register',
    name: 'Register',
    isProtected: false,
    isUnProtected: true, // Guest only, mencegah user login masuk ke sini
    component: RegisterPage,
    layout: AuthLayout
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    isProtected: true,
    component: Dashboard,
    layout: DashboardLayout, // Gunakan DashboardLayout di sini
    roles: [ENUM_ROLE_AUTH.SUPER_ADMIN, ENUM_ROLE_AUTH.SAFETY_OFFICER, ENUM_ROLE_AUTH.ISSUER, ENUM_ROLE_AUTH.EXECUTOR, ENUM_ROLE_AUTH.UNASSIGNED]
  },
  {
    path: '/permit',
    name: 'Permit Management',
    isProtected: true,
    component: PermitManagementPage,
    layout: DashboardLayout,
    roles: [ENUM_ROLE_AUTH.SUPER_ADMIN, ENUM_ROLE_AUTH.SAFETY_OFFICER, ENUM_ROLE_AUTH.ISSUER, ENUM_ROLE_AUTH.UNASSIGNED]
  },
  {
    path: '/permit/new',
    name: 'Create New Permit',
    isProtected: true,
    component: NewPermitPage,
    layout: DashboardLayout,
    roles: [ENUM_ROLE_AUTH.SUPER_ADMIN, ENUM_ROLE_AUTH.EXECUTOR, ENUM_ROLE_AUTH.ISSUER, ENUM_ROLE_AUTH.UNASSIGNED]
  },
  // {
  //   path: '/permit/:id',
  //   name: 'Permit Detail',
  //   isProtected: true,
  //   component: PermitDetailPage,
  //   layout: DashboardLayout,
  //   roles: [ENUM_ROLE_AUTH.SUPER_ADMIN, ENUM_ROLE_AUTH.SAFETY_OFFICER, ENUM_ROLE_AUTH.ISSUER, ENUM_ROLE_AUTH.EXECUTOR]
  // },
  // {
  //   path: '*',
  //   name: 'Notfound',
  //   isProtected: false,
  //   component: NotFound,
  //   // Terserah Anda 404 ingin pakai sidebar atau tidak. Biasanya pakai.
  //   layout: DashboardLayout 
  // }
];

export default routes;