import { useEffect, useState } from 'react';
import { api, type RoleCode } from '@/lib/api';

/**
 * Map of projectId → the role the signed-in user holds *within that project*
 * (from the ACTIVE assignment's role_id via `GET /projects/mine`). A user can
 * hold different roles per project, so the permit approval pipeline — which is
 * keyed on role codes — must resolve each permit's approver against this map,
 * not against the global `user.role.code`.
 *
 * Mirrors useHasProject: result cached per user id for the session (in-flight
 * promise + final value), so the dashboard and permit pages share one fetch.
 */
const inflight = new Map<string, Promise<Map<string, RoleCode | null>>>();
const results = new Map<string, Map<string, RoleCode | null>>();

export function useProjectRoles(userId?: string): Map<string, RoleCode | null> {
  const key = userId ?? '';
  const [roles, setRoles] = useState<Map<string, RoleCode | null>>(() => results.get(key) ?? new Map());

  useEffect(() => {
    if (!key || results.has(key)) return;
    let active = true;

    const p =
      inflight.get(key) ??
      api
        .listMyProjects()
        .then((res) => new Map(res.projects.map((proj) => [proj.id, proj.roleCode ?? null])))
        .catch(() => new Map<string, RoleCode | null>())
        .finally(() => inflight.delete(key));
    inflight.set(key, p);

    p.then((m) => {
      results.set(key, m);
      if (active) setRoles(m);
    });

    return () => {
      active = false;
    };
  }, [key]);

  return roles;
}
