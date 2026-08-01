import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type RouterCtx = {
  path: string;
  navigate: (to: string) => void;
};

const RouterContext = createContext<RouterCtx | undefined>(undefined);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname + window.location.search);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname + window.location.search);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setPath(to);
    window.scrollTo(0, 0);
  };

  return <RouterContext.Provider value={{ path, navigate }}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}

/** parse the current path into segments */
export function useRoute() {
  const { path } = useRouter();
  const [pathname, query] = path.split('?');
  const segments = pathname.split('/').filter(Boolean);
  const params = new URLSearchParams(query ?? '');
  return { segments, params, pathname };
}
