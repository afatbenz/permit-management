import { useCallback, useEffect, useState } from 'react';
import { FolderKanban, Plus, Copy, Check, Loader2, Archive } from 'lucide-react';
import { api, type Project } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Field } from '@/components/Field';
import { Spinner, EmptyState } from '@/components/ui';

export function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const codeValid = /^[A-Z0-9-]{3,20}$/.test(projectCode);
  const canSubmit = name.trim().length > 0 && codeValid && !creating;

  const orgId = user?.organizationId ?? '';

  const loadProjects = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.listProjects();
      setProjects(res.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar proyek.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSuccess('');
    setCreating(true);
    try {
      const res = await api.createProject({ name: name.trim(), projectCode });
      setSuccess(`Proyek "${res.project.name}" berhasil dibuat.`);
      setName('');
      setProjectCode('');
      setShowForm(false);
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat proyek.');
    } finally {
      setCreating(false);
    }
  };

  const copyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError('Gagal menyalin kode ke clipboard.');
    }
  };

  return (
    <DashboardLayout active="Projects">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">Projects</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Kelola proyek organisasi Anda</p>
          </div>
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Create Project
          </button>
        </div>

        {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400">{success}</div>}

        {showForm && (
          <form onSubmit={handleCreate} className="card space-y-4 p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Proyek Baru</h2>
            <Field
              id="projectName"
              label="Nama Proyek"
              value={name}
              onChange={setName}
              placeholder="cth: Gedung Parkir Pasar Baru"
              required
            />
            <Field
              id="projectCode"
              label="Kode Proyek"
              value={projectCode}
              onChange={(v) => setProjectCode(v.toUpperCase())}
              placeholder="cth: GPPB-001"
              required
            />
            {projectCode && !codeValid && (
              <p className="-mt-2 text-xs text-rose-500">
                Kode hanya huruf besar, angka, atau tanda hubung, 3–20 karakter.
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={!canSubmit} className="btn-primary">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Buat Proyek
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                Batal
              </button>
            </div>
          </form>
        )}

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-3 p-10 text-sm text-gray-500 dark:text-slate-400">
              <Spinner className="h-5 w-5" /> Memuat proyek...
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={<FolderKanban className="h-6 w-6" />}
              title="Belum ada proyek"
              description="Buat proyek pertama Anda untuk mulai mengatur tim dan kode undangan."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                    <th className="px-5 py-3 font-semibold">Nama</th>
                    <th className="px-5 py-3 font-semibold">Kode Proyek</th>
                    <th className="px-5 py-3 font-semibold">Kode Undangan</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Dibuat</th>
                    <th className="px-5 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {projects.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">{p.name}</td>
                      <td className="px-5 py-3.5 font-mono text-gray-700 dark:text-slate-300">{p.projectCode}</td>
                      <td className="px-5 py-3.5">
                        {p.invitationCode ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold tracking-wide text-brand-600 dark:text-brand-400">
                              {p.invitationCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyCode(p.id, p.invitationCode!)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                              title="Salin kode undangan"
                            >
                              {copied === p.id ? (
                                <Check className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                          p.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20'
                            : 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {p.status === 'active' ? 'Aktif' : 'Arsip'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {p.status === 'active' && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await api.deleteProject(p.id);
                                setSuccess(`Proyek "${p.name}" diarsipkan.`);
                                await loadProjects();
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Gagal mengarsipkan proyek.');
                              }
                            }}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                            title="Arsipkan proyek"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
