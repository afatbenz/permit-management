import { useCallback, useEffect, useState } from 'react';
import { Users, ShieldCheck, RefreshCw } from 'lucide-react';
import { api, type AdminUser, type RoleCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Spinner, EmptyState } from '@/components/ui';

// Roles an Org Admin is allowed to assign (mirrors backend guard).
const ASSIGNABLE_ROLES: Array<{ code: RoleCode; label: string }> = [
  { code: 'org_admin', label: 'Organization Admin' },
  { code: 'supervisor_subcon', label: 'Supervisor - Sub-Contractor' },
  { code: 'supervisor_maincon', label: 'Supervisor - Main Contractor' },
  { code: 'hse_maincon', label: 'HSE - Main Contractor' },
  { code: 'cm_maincon', label: 'CM - Main Contractor' },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ASSIGNABLE_ROLES.map((r) => [r.code, r.label]),
);
ROLE_LABELS['super_admin'] = 'Super Admin';
ROLE_LABELS['unassigned'] = 'Unassigned';

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

export function UsersManagementPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingError, setSavingError] = useState('');

  const orgId = user?.organizationId ?? '';

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.listUsers(orgId);
      setUsers(res.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar user.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRoleChange = async (userId: string, roleId: string) => {
    setSavingId(userId);
    setSavingError('');
    try {
      await api.updateUserRole(orgId, userId, roleId);
      await load();
    } catch (err) {
      setSavingError(err instanceof Error ? err.message : 'Gagal mengubah role.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <DashboardLayout active="Users">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">User Management</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Kelola user dan role dalam organisasi Anda</p>
          </div>
          <button onClick={() => navigate('/dashboard/permits')} className="btn-ghost">
            <RefreshCw className="h-4 w-4" /> Kembali
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </div>
        )}
        {savingError && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">
            {savingError}
          </div>
        )}

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
                    <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {users.map((u) => {
                    const isSelf = u.id === user?.id;
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
                          {isSelf || u.roleCode === 'super_admin' || u.roleCode === 'unassigned' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-slate-800 dark:text-slate-300">
                              {ROLE_LABELS[u.roleCode ?? ''] ?? u.roleName ?? '—'}
                            </span>
                          ) : (
                            <select
                              value={u.roleId}
                              disabled={savingId === u.id}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="input-field !py-1.5 text-xs"
                            >
                              <option value={u.roleId}>{ROLE_LABELS[u.roleCode ?? ''] ?? u.roleName ?? '—'}</option>
                              {ASSIGNABLE_ROLES.filter((r) => r.code !== u.roleCode).map((r) => (
                                <option key={r.code} value={u.roleId} disabled>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {savingId === u.id && <Spinner className="h-4 w-4" />}
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
    </DashboardLayout>
  );
}
