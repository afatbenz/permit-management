import { useCallback, useEffect, useState } from 'react';
import { Users, ShieldCheck, FolderKanban, Plus, Trash2, Pencil, X } from 'lucide-react';
import {
  api,
  type AdminUser,
  type AssignableRole,
  type OrgProjectWithMembers,
  type RoleCode,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/DashboardLayout';
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

/** Per-user project & role assignment dialog (org-admin view).
 *  A table of the user's projects: Nama Project + Role select (current role
 *  pre-selected) + remove. A "Tambah Project" row at the bottom picks a new
 *  project and its role. Saved in one shot via onSave. */
function ProjectRoleDialog({
  user,
  projects,
  roles,
  onClose,
  onSave,
}: {
  user: AdminUser;
  projects: OrgProjectWithMembers[];
  roles: AssignableRole[];
  onClose: () => void;
  onSave: (assignments: Array<{ projectId: string; roleId: string }>) => void;
}) {
  // Each row: { projectId, roleId }. Default role is the first assignable one.
  const defaultRoleId = roles[0]?.id ?? '';
  const rowFrom = (a: AdminUser['assignments'][number]) => ({
    projectId: a.projectId,
    roleId: a.roleId || defaultRoleId,
  });
  const [rows, setRows] = useState(() =>
    user.assignments.map(rowFrom).filter((r) => r.projectId && r.roleId),
  );
  const [showAdd, setShowAdd] = useState(false);
  const [nextProject, setNextProject] = useState('');
  const [nextRole, setNextRole] = useState(defaultRoleId);

  const usedProjectIds = new Set(rows.map((r) => r.projectId));
  const availableProjects = projects.filter((p) => !usedProjectIds.has(p.id));

  const addRow = () => {
    if (!nextProject || !nextRole) return;
    setRows((prev) => [...prev, { projectId: nextProject, roleId: nextRole }]);
    setNextProject('');
    setNextRole(defaultRoleId);
    setShowAdd(false);
  };

  const updateRow = (index: number, patch: Partial<{ projectId: string; roleId: string }>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const save = () => {
    const clean = rows
      .map((r) => ({ projectId: r.projectId, roleId: r.roleId }))
      .filter((r) => r.projectId && r.roleId);
    onSave(clean);
  };

  const roleLabel = (roleId: string) =>
    ROLE_LABELS[roles.find((r) => r.id === roleId)?.code ?? ''] ?? '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Kelola Proyek & Role</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
              {user.name} · {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Tutup dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Assignment table */}
        <div className="px-6 py-5">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500">Belum ada proyek.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                    <th className="px-4 py-2.5 font-semibold">Nama Project</th>
                    <th className="px-4 py-2.5 font-semibold">Role</th>
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {rows.map((row, i) => {
                    // Auto-fill the row's role with the user's current
                    // per-project role for that project (if any).
                    const currentForProject = user.assignments.find((a) => a.projectId === row.projectId);
                    const effectiveRoleId = row.roleId || currentForProject?.roleId || defaultRoleId;
                    return (
                      <tr key={row.projectId || `row-${i}`} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2">
                          <span className="font-medium text-gray-800 dark:text-slate-200">
                            {projects.find((p) => p.id === row.projectId)?.name ??
                              user.assignments.find((a) => a.projectId === row.projectId)?.projectName ??
                              '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={effectiveRoleId}
                            onChange={(e) => updateRow(i, { roleId: e.target.value })}
                            className="input-field !py-1.5 text-xs"
                          >
                            <option value={effectiveRoleId}>{roleLabel(effectiveRoleId)}</option>
                            {roles
                              .filter((r) => r.id !== effectiveRoleId)
                              .map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                            aria-label="Hapus assignment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add-project row */}
          <div className="mt-3">
            {showAdd ? (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-slate-400">Nama Project</label>
                  <select
                    value={nextProject}
                    onChange={(e) => setNextProject(e.target.value)}
                    className="input-field !py-1.5 text-xs"
                  >
                    <option value="">Pilih proyek</option>
                    {availableProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-slate-400">Role</label>
                  <select
                    value={nextRole}
                    onChange={(e) => setNextRole(e.target.value)}
                    className="input-field !py-1.5 text-xs"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={addRow}
                  disabled={!nextProject || !nextRole}
                  className="rounded-lg bg-brand-600 p-1.5 text-white hover:bg-brand-700 disabled:opacity-40"
                  aria-label="Tambahkan"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                  aria-label="Batal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                disabled={availableProjects.length === 0}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40 dark:text-brand-400"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Project
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={save}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-brand-700 disabled:opacity-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Simpan
          </button>
        </div>
      </div>
    </div>
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
  // User whose Project & Role dialog is open.
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

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

  /** Org-admin: save a user's global role + full project-assignment set. */
  const handleSaveAssignments = async (
    targetUserId: string,
    globalRoleId: string,
    assignments: Array<{ projectId: string; roleId: string }>,
  ) => {
    setSavingId(targetUserId);
    run(async () => {
      await api.updateUserRole(orgId, targetUserId, { roleId: globalRoleId, assignments });
      await loadOrgAdminData();
    });
  };

  /** Org-admin: change only the global role (admin/non-admin gate). */
  const handleGlobalRoleChange = (targetUserId: string, roleId: string) => {
    setSavingId(targetUserId);
    run(async () => {
      await api.updateUserRole(orgId, targetUserId, { roleId });
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
            Kelola role global (admin / non-admin) dan proyek user. Satu user bisa berada di beberapa proyek, masing-masing dengan role berbeda.
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
                    <th className="px-5 py-3 font-semibold">Role Global</th>
                    <th className="px-5 py-3 font-semibold">Proyek & Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {users.map((u) => {
                    const isSelf = u.id === userId;
                    const isLocked = isSelf || u.roleCode === 'super_admin' || u.roleCode === 'unassigned';
                    const activeAssignments = u.assignments.filter((a) => a.status === 'active');
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
                              onChange={(e) => handleGlobalRoleChange(u.id, e.target.value)}
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
                          {savingId === u.id && <Spinner className="ml-2 inline h-3.5 w-3.5" />}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 dark:text-slate-500">
                              {activeAssignments.length === 0
                                ? '—'
                                : `${activeAssignments.length} proyek`}
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingUser(u)}
                              disabled={isSelf}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Pencil className="h-3 w-3" /> Assign
                            </button>
                          </div>
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

      {/* Project & role assignment dialog */}
      {editingUser && (
        <ProjectRoleDialog
          user={editingUser}
          projects={projects}
          roles={roles}
          onClose={() => setEditingUser(null)}
          onSave={(assignments) => {
            handleSaveAssignments(editingUser.id, editingUser.roleId, assignments);
            setEditingUser(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
