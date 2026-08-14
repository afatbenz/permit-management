import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderTree, Loader2, Plus, Trash2, ChevronDown } from 'lucide-react';
import { api, type PermitCategory, type Project } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useActiveProject } from '@/lib/activeProject';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SelectField, Field } from '@/components/Field';
import { CategoryBadge, EmptyState, Spinner } from '@/components/ui';
import { CATEGORY_COLORS } from '@/lib/categoryColors';

export function ProjectCategoryPage() {
  const { user } = useAuth();
  // Members work inside their chosen project — the picker is locked to it.
  const { activeProject, isMember } = useActiveProject();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [categories, setCategories] = useState<PermitCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [swatchOpen, setSwatchOpen] = useState<string | null>(null);

  // Add-form state
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(CATEGORY_COLORS[0]);

  const canMutate = !!projectId;

  const loadProjects = useCallback(async () => {
    setError('');
    try {
      const res = await api.listMyProjects();
      if (res.projects.length > 0) {
        setProjects(res.projects);
        return;
      }
      const all = await api.listProjects();
      setProjects(all.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar proyek.');
    }
  }, []);

  const loadCategories = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.listProjectCategories(id);
      setCategories(res.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat kategori.');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Members are locked to their chosen project — no admin list fallback.
    if (isMember) {
      if (activeProject) setProjectId(activeProject.id);
      return;
    }
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMember, activeProject?.id]);

  useEffect(() => {
    if (!projectId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    loadCategories(projectId);
  }, [projectId, loadCategories]);

  const selectedProject = useMemo(() => projects.find((p) => p.id === projectId) ?? (activeProject ?? null), [projects, projectId, activeProject]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !newName.trim() || !newColor) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api.createProjectCategory(projectId, { name: newName.trim(), color: newColor });
      setNewName('');
      setNewColor(CATEGORY_COLORS[0]);
      setSuccess('Kategori ditambahkan.');
      await loadCategories(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah kategori.');
    } finally {
      setBusy(false);
    }
  };

  const handleRecolor = async (cat: PermitCategory, color: string) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api.updateProjectCategoryColor(projectId, cat.id, color);
      setSwatchOpen(null);
      setSuccess(`Warna "${cat.name}" diperbarui.`);
      await loadCategories(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah warna.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (cat: PermitCategory) => {
    if (!confirm(`Hapus kategori "${cat.name}" dari proyek ini?`)) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api.removeProjectCategory(projectId, cat.id);
      setSuccess(`Kategori "${cat.name}" dihapus.`);
      await loadCategories(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus kategori.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout active="Project Category">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">Project Category</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Kelola kategori permit dan warna dokumen per proyek
          </p>
        </div>

        {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400">{success}</div>}

        {/* Project picker */}
        <div className="card max-w-md p-5">
          <SelectField
            id="project"
            label="Pilih Proyek"
            value={projectId}
            onChange={setProjectId}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Pilih proyek"
            required
          />
          {selectedProject && (
            <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
              Kode: <span className="font-mono">{selectedProject.projectCode}</span>
            </p>
          )}
        </div>

        {!projectId ? (
          <EmptyState
            icon={<FolderTree className="h-6 w-6" />}
            title="Pilih proyek"
            description="Pilih proyek untuk melihat dan mengelola kategori permit-nya."
          />
        ) : loading ? (
          <div className="card flex items-center justify-center gap-3 p-10 text-sm text-gray-500 dark:text-slate-400">
            <Spinner className="h-5 w-5" /> Memuat kategori...
          </div>
        ) : (
          <>
            {/* Category grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <div key={cat.id} className="card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <CategoryBadge name={cat.name} color={cat.color} />
                    {cat.scope === 'project' ? (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        Proyek
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-3 font-mono text-xs text-gray-400 dark:text-slate-500">{cat.color}</p>

                  {canMutate && (
                    <div className="mt-4 space-y-2">
                      {/* Color picker */}
                      <div>
                        <button
                          onClick={() => setSwatchOpen((v) => (v === cat.id ? null : cat.id))}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-all hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          Ubah Warna
                          <ChevronDown className={`h-3 w-3 transition-transform ${swatchOpen === cat.id ? 'rotate-180' : ''}`} />
                        </button>
                        {swatchOpen === cat.id && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {CATEGORY_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                disabled={busy}
                                onClick={() => handleRecolor(cat, c)}
                                className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${c === cat.color ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-slate-500' : ''}`}
                                style={{ backgroundColor: c }}
                                title={c}
                                aria-label={`Warna ${c}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemove(cat)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-all hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus dari proyek
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add form */}
            {canMutate && (
              <form onSubmit={handleAdd} className="card space-y-4 p-6">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Tambah Kategori</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="newCatName"
                    label="Nama Kategori"
                    value={newName}
                    onChange={setNewName}
                    placeholder="cth: Genset / Scaffolding"
                    required
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Warna</label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {CATEGORY_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewColor(c)}
                          className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${c === newColor ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-slate-500' : ''}`}
                          style={{ backgroundColor: c }}
                          title={c}
                          aria-label={`Warna ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={busy || !newName.trim()} className="btn-primary">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Tambah Kategori
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
