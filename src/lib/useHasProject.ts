import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Whether the user is bound to at least one ACTIVE project (real check via
 * `GET /projects/mine`). "Has a role" is not enough — an account can carry a
 * role (e.g. supervisor_subcon) while its project assignment is still
 * inactive/pending approval.
 *
 * Result is cached per user id for the session (in-flight promise + final
 * value), so the sidebar and dashboard share one fetch and navigation
 * between pages never refires it.
 */
const inflight = new Map<string, Promise<boolean>>();
const results = new Map<string, boolean>();

export function useHasProject(userId?: string): { hasProject: boolean; loading: boolean } {
  const key = userId ?? '';
  const [state, setState] = useState<{ hasProject: boolean; loading: boolean }>(() => ({
    hasProject: results.get(key) ?? false,
    loading: key ? !results.has(key) : false,
  }));

  useEffect(() => {
    if (!key || results.has(key)) return;
    let active = true;

    const p =
      inflight.get(key) ??
      api
        .listMyProjects()
        .then((res) => res.projects.length > 0)
        .catch(() => false)
        .finally(() => inflight.delete(key));
    inflight.set(key, p);

    p.then((hasProject) => {
      results.set(key, hasProject);
      if (active) setState({ hasProject, loading: false });
    });

    return () => {
      active = false;
    };
  }, [key]);

  return state;
}
