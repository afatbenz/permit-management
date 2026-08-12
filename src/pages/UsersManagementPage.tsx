import { useCallback, useEffect, useState } from 'react';
import { Users, ShieldCheck, FolderKanban } from 'lucide-react';
import {
  api,
  type AdminUser,
  type AssignableRole,
  type OrgProjectWithMembers,
  type RoleCode,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SelectField } from '@/components/Field';
import { Spinner, EmptyState } from '@/components/ui';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Organization Admin',
  supervisor_subcon: 'Supervisor - Sub-Contractor',
  supervisor_maincon: 'Supervisor - Main Contractor',
  hse_maincon: 'HSE - Main Contractor',
  cm_maincon: 'CM - Main Contractor',
  project_admin: 'Project Admin',
  unassigned: 'Unassigned',
};

function verificationBadge(status: string) {
  if (status === 'verified') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20';
  if (status === 'pending') return 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20';
  return 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20';
}

const VERIFICATION_LABELS: Record<string, string> = {
  verified: 'Verified',
  pending: 'Pending',
  rejected: 'Rejected',
};

/** Role chip (non-editable users). */
function RoleChip({ roleCode, roleName }: { roleCode: string | null; roleName: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-slate-800 dark:text-slate-300">
      {ROLE_LABELS[roleCode ?? ''] ?? roleName ?? '—'}
    </span>
  );
}

export function UsersManagementPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingError, setSavingError] = useState('');

  const role = user?.role?.code ?? null;
  const isOrgAdmin = role === 'org_admin' || role === 'super_admin';

  // --- Org-admin view state ---
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AssignableRole[]>([]);
  const [projects, setProjects] = useState<OrgProjectWithMembers[]>([]);
  // Pending project_admin assignment: userId → chosen projectId.
  const [pendingAdminProject, setPendingAdminProject] = useState<Record<string, string>>({});

  // --- Project-admin view state ---
  const [myProjects, setMyProjects] = useState<OrgProjectWithMembers[]>([]);

  const [savingId, setSavingId] = useState<string | null>(null);

  const orgId = user?.organizationId ?? '';
  const userId = user?.id ?? '';

  const loadOrgAdminData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError('');
    try {
      const [u, r, p] = await Promise.all([
        api.listUsers(orgId),
        api.listAssignableRoles(),
        api.listOrgProjects(orgId),
      ]);
      setUsers(u.users);
      setRoles(r.roles);
      setProjects(p.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data user.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const loadProjectAdminData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError('');
    try {
      const [res, r] = await Promise.all([api.listOrgProjects(orgId), api.listAssignableRoles()]);
      setMyProjects(res.projects.filter((p) => p.projectAdminId === userId));
      setRoles(r.roles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data proyek.');
    } finally {
      setLoading(false);
    }
  }, [orgId, userId]);

  useEffect(() => {
    if (isOrgAdmin) loadOrgAdminData();
    else if (role === 'project_admin') loadProjectAdminData();
    else setLoading(false);
  }, [isOrgAdmin, role, loadOrgAdminData, loadProjectAdminData]);

  const run = async (fn: () => Promise<unknown>) => {
    setSavingError('');
    setSavingId(null);
    try {
      await fn();
    } catch (err) {
      setSavingError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan.');
    }
  };

  /** Org-admin: change a user's role. project_admin also needs a project. */
  const handleRoleChange = (targetUserId: string, roleId: string) => {
    const roleObj = roles.find((r) => r.id === roleId);
    if (roleObj?.code === 'project_admin') {
      // Defer saving until a project is picked.
      setPendingAdminProject((p) => ({ ...p, [targetUserId]: projects[0]?.id ?? '' }));
      return;
    }
    setSavingId(targetUserId);
    run(async () => {
      await api.updateUserRole(orgId, targetUserId, roleId);
      await loadOrgAdminData();
    });
  };

  /** Org-admin: pick the project for a project_admin assignment, then save. */
  const handleAdminProjectPick = (targetUserId: string, projectId: string) => {
    setPendingAdminProject((p) => ({ ...p, [targetUserId]: projectId }));
    if (!projectId) return;
    const roleObj = roles.find((r) => r.code === 'project_admin');
    if (!roleObj) return;
    setSavingId(targetUserId);
    run(async () => {
      await api.updateUserRole(orgId, targetUserId, roleObj.id, projectId);
      await loadOrgAdminData();
    });
  };

  /** Project-admin: change a same-project member's role. */
  const handleProjectMemberRoleChange = (projectId: string, targetUserId: string, roleId: string) => {
    setSavingId(targetUserId);
    run(async () => {
      await api.updateProjectUserRole(projectId, targetUserId, roleId);
      await loadProjectAdminData();
    });
  };

  if (role === 'project_admin') {
    // ---- Project-admin view: manage users inside the project(s) they admin ----
    return (
      <DashboardLayout active="Users">
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">Kelola Anggota Proyek</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Anda dapat mengatur role user lain dalam proyek yang Anda admin.
            </p>
          </div>

          {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>}
          {savingError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">{savingError}</div>}

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-10 text-sm text-gray-500 dark:text-slate-400">
              <Spinner className="h-5 w-5" /> Memuat...
            </div>
          ) : myProjects.length === 0 ? (
            <EmptyState
              icon={<FolderKanban className="h-6 w-6" />}
              title="Belum ada proyek yang Anda admin"
              description="Anda akan menjadi Project Admin pada proyek pertama yang Anda tambahkan."
            />
          ) : (
            myProjects.map((proj) => (
              <div key={proj.id} className="card overflow-hidden">
                <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">{proj.name}</h2>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    Kode proyek: <span className="font-mono">{proj.projectCode}</span>
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                        <th className="px-5 py-3 font-semibold">Nama</th>
                        <th className="px-5 py-3 font-semibold">Email</th>
                        <th className="px-5 py-3 font-semibold">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {proj.members.map((m) => {
                        const isSelf = m.userId === userId;
                        return (
                          <tr key={m.userId} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                            <td className="px-5 py-3.5">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {m.name ?? '—'} {isSelf && <span className="text-xs text-gray-400">(Anda)</span>}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-gray-700 dark:text-slate-300">{m.email ?? '—'}</td>
                            <td className="px-5 py-3.5">
                              {isSelf || proj.projectAdminId === m.userId ? (
                                <RoleChip roleCode={m.roleCode} roleName={m.roleName} />
                              ) : (
                                <select
                                  value={m.roleId ?? ''}
                                  disabled={savingId === m.userId}
                                  onChange={(e) => handleProjectMemberRoleChange(proj.id, m.userId, e.target.value)}
                                  className="input-field !py-1.5 text-xs"
                                >
                                  <option value={m.roleId ?? ''}>
                                    {ROLE_LABELS[m.roleCode ?? ''] ?? m.roleName ?? '—'}
                                  </option>
                                  {roles
                                    .filter((r) => r.id !== m.roleId)
                                    .map((r) => (
                                      <option key={r.id} value={r.id}>
                                        {r.name}
                                      </option>
                                    ))}
                                </select>
                              )}
                              {savingId === m.userId && <Spinner className="ml-2 inline h-3.5 w-3.5" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ---- Org-admin / Super-admin view: full org user table ----
  return (
    <DashboardLayout active="Users">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">User Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Kelola user dan role dalam organisasi Anda. Untuk role <span className="font-semibold text-brand-600">Project Admin</span>, pilih proyek yang bersangkutan.
          </p>
        </div>

        {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>}
        {savingError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">{savingError}</div>}

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-3 p-10 text-sm text-gray-500 dark:text-slate-400">
              <Spinner className="h-5 w-5" /> Memuat daftar user...
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="Belum ada user"
              description="Belum ada user terdaftar di organisasi ini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                    <th className="px-5 py-3 font-semibold">Nama</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Verifikasi</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Proyek (untuk Project Admin)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {users.map((u) => {
                    const isSelf = u.id === userId;
                    const isLocked = isSelf || u.roleCode === 'super_admin' || u.roleCode === 'unassigned';
                    const pendingProject = pendingAdminProject[u.id];
                    const choosingAdminProject = pendingProject !== undefined;
                    return (
                      <tr key={u.id} className="group transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">{u.name}</span>
                            {isSelf && <span className="text-xs text-gray-400 dark:text-slate-500">(Anda)</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-700 dark:text-slate-300">{u.email}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${verificationBadge(u.verificationStatus)}`}>
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {VERIFICATION_LABELS[u.verificationStatus] ?? u.verificationStatus}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {isLocked ? (
                            <RoleChip roleCode={u.roleCode} roleName={u.roleName} />
                          ) : (
                            <select
                              value={u.roleId}
                              disabled={savingId === u.id}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="input-field !py-1.5 text-xs"
                            >
                              <option value={u.roleId}>{ROLE_LABELS[u.roleCode ?? ''] ?? u.roleName ?? '—'}</option>
                              {roles
                                .filter((r) => r.id !== u.roleId)
                                .map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name}
                                  </option>
                                ))}
                            </select>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {choosingAdminProject ? (
                            <div className="flex items-center gap-2">
                              <SelectField
                                label=""
                                value={pendingProject}
                                onChange={(v) => handleAdminProjectPick(u.id, v)}
                                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                                placeholder="Pilih proyek"
                              />
                              <button
                                type="button"
                                onClick={() => setPendingAdminProject((p) => {
                                  const next = { ...p };
                                  delete next[u.id];
                                  return next;
                                })}
                                className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-slate-500">
                              {u.roleCode === 'project_admin' ? 'Lihat kolom role' : '—'}
                            </span>
                          )}
                          {savingId === u.id && <Spinner className="ml-2 inline h-3.5 w-3.5" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 dark:text-slate-500">
          Catatan: role <span className="font-mono">Super Admin</span> dan <span className="font-mono">Unassigned</span> tidak bisa diubah dari sini.
        </p>
      </div>
    </DashboardLayout>
  );
}
