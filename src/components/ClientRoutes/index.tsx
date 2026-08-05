import { Suspense, type JSX } from 'react';
import { Routes, Route } from 'react-router-dom';
import Client from '@/container/Client';
import routes from '@/routes';
import { type TAppRoute } from '@/types/route';
import Loader from '@/components/Loader';

const renderRoute = (route: TAppRoute): JSX.Element => {
  const {
    layout: Layout,
    component: Component,
    isProtected,
    isUnProtected,
    roles,
  } = route;

  let element = <Component />;

  // Bungkus dengan Layout jika ada
  if (Layout) {
    element = <Layout>{element}</Layout>;
  }

  // Bungkus dengan Auth/Role Guard jika rute memiliki proteksi
  if (isProtected || isUnProtected) {
    element = (
      <Client
        roles={roles}
        isProtected={isProtected}
        isUnProtected={isUnProtected}
      >
        {element}
      </Client>
    );
  }

  return element;
};

const ClientRoutes = () => {
  // Flattening rute secara deklaratif (menggunakan flatMap lebih aman)
  const flattenedRoutes = routes.flatMap((route) => {
    const parentRoute = { path: route.path, element: renderRoute(route) };
    
    if (route.subRoutes && route.subRoutes.length > 0) {
      const children = route.subRoutes.map((subRoute) => ({
        path: `${route.path}${subRoute.path}`,
        // Jika subroute tidak mendefinisikan layout, kita bisa mem-pass layout parent secara opsional
        // Namun di struktur ini, dianjurkan define layout eksplisit atau biarkan parent layout merender <Outlet/>
        element: renderRoute({ ...subRoute, layout: subRoute.layout ?? route.layout })
      }));
      return [parentRoute, ...children];
    }
    
    return [parentRoute];
  });

  return (
    <Suspense fallback={<Loader background="light" />}>
      <Routes>
        {flattenedRoutes.map((r, i) => (
          <Route key={i} path={r.path} element={r.element} />
        ))}
      </Routes>
    </Suspense>
  );
};

export default ClientRoutes;