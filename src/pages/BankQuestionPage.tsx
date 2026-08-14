import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileCheck, Loader2, Plus, Trash2, Pencil, X } from 'lucide-react';
import { api, type BankQuestion, type PermitCategory, type Project } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useActiveProject } from '@/lib/activeProject';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SelectField, Field } from '@/components/Field';
import { CategoryBadge, EmptyState, Spinner } from '@/components/ui';

/** Add/edit form for one bank question (bilingual + category). */
function QuestionModal({
  categories,
  initial,
  onClose,
  onSave,
}: {
  categories: PermitCategory[];
  initial: BankQuestion | null;
  onClose: () => void;
  onSave: (payload: { categoryId: string; questionEn: string; questionId: string }) => Promise<void>;
}) {
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [questionEn, setQuestionEn] = useState(initial?.questionEn ?? '');
  const [questionId, setQuestionId] = useState(initial?.questionId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = categoryId && questionEn.trim() && questionId.trim() && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      await onSave({
        categoryId,
        questionEn: questionEn.trim(),
        questionId: questionId.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pertanyaan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
              {initial ? 'Edit Pertanyaan' : 'Tambah Pertanyaan'}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
              Pertanyaan diisi dalam dua bahasa (Indonesia & English)
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

        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </div>
          )}
          <SelectField
            id="bqCategory"
            label="Kategori Permit"
            value={categoryId}
            onChange={setCategoryId}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Pilih kategori"
            required
          />
          <Field
            id="bqQuestionEn"
            label="Pertanyaan (English)"
            value={questionEn}
            onChange={setQuestionEn}
            placeholder="cth: Is the WAH Risk Assessment, SWP, fall prevention plan available..."
            required
          />
          <Field
            id="bqQuestionId"
            label="Pertanyaan (Indonesia)"
            value={questionId}
            onChange={setQuestionId}
            placeholder="cth: Apakah Penilaian Risiko WAH, SWP, rencana pencegahan jatuh tersedia..."
            required
          />
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={!canSubmit} className="btn-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {initial ? 'Simpan Perubahan' : 'Tambah Pertanyaan'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BankQuestionPage() {
  const { user } = useAuth();
  // Members work inside their chosen project — the picker is locked to it.
  const { activeProject, isMember } = useActiveProject();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [categories, setCategories] = useState<PermitCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankQuestion | null>(null);
  // '' = semua kategori
  const [filterCategory, setFilterCategory] = useState('');

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

  const loadQuestions = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.listBankQuestions(id);
      setQuestions(res.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat bank question.');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async (id: string) => {
    try {
      const res = await api.listProjectCategories(id);
      setCategories(res.categories);
    } catch {
      setCategories([]);
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
      setQuestions([]);
      setLoading(false);
      return;
    }
    setFilterCategory('');
    loadQuestions(projectId);
    loadCategories(projectId);
  }, [projectId, loadQuestions, loadCategories]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? (activeProject ?? null),
    [projects, projectId, activeProject],
  );

  const filteredQuestions = useMemo(
    () => (filterCategory ? questions.filter((q) => q.categoryId === filterCategory) : questions),
    [questions, filterCategory],
  );

  const handleSave = async (payload: { categoryId: string; questionEn: string; questionId: string }) => {
    if (!projectId) return;
    setError('');
    setSuccess('');
    if (editing) {
      await api.updateBankQuestion(projectId, editing.id, payload);
      setSuccess('Pertanyaan diperbarui.');
    } else {
      await api.createBankQuestion(projectId, payload);
      setSuccess('Pertanyaan ditambahkan.');
    }
    await loadQuestions(projectId);
  };

  const handleRemove = async (q: BankQuestion) => {
    if (!projectId || !confirm(`Hapus pertanyaan ini dari proyek?\n\n"${q.questionEn}"`)) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api.removeBankQuestion(projectId, q.id);
      setSuccess('Pertanyaan dihapus.');
      await loadQuestions(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus pertanyaan.');
    } finally {
      setBusy(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (q: BankQuestion) => {
    setEditing(q);
    setModalOpen(true);
  };

  return (
    <DashboardLayout active="Bank Question">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">Bank Question</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Pertanyaan checklist pengajuan permit, dikelompokkan per kategori permit
            </p>
          </div>
          {canMutate && (
            <button onClick={openAdd} className="btn-primary">
              <Plus className="h-4 w-4" />
              Tambah Pertanyaan
            </button>
          )}
        </div>

        {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400">{success}</div>}

        {/* Project context — members are bound to their chosen project (picked
            once in the header, no re-selection needed); admins pick one here. */}
        {isMember ? (
          <div className="card max-w-md p-5">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Project: <span className="font-semibold text-gray-900 dark:text-white">{selectedProject?.name ?? '—'}</span>
              {selectedProject?.projectCode && (
                <span className="ml-2 font-mono text-xs text-gray-400 dark:text-slate-500">{selectedProject.projectCode}</span>
              )}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              Project aktif dari pemilihan di header — tidak perlu pilih lagi.
            </p>
          </div>
        ) : (
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
        )}

        {/* Category filter */}
        {projectId && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-56 max-w-sm">
              <SelectField
                id="bqFilter"
                label="Filter Kategori"
                value={filterCategory}
                onChange={setFilterCategory}
                options={[{ value: '', label: 'Semua Kategori' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
              />
            </div>
            {filterCategory && (
              <button
                type="button"
                onClick={() => setFilterCategory('')}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                <X className="h-3.5 w-3.5" /> Hapus filter
              </button>
            )}
          </div>
        )}

        {!projectId ? (
          <EmptyState
            icon={<FileCheck className="h-6 w-6" />}
            title="Pilih proyek"
            description="Pilih proyek untuk melihat dan mengelola bank question-nya."
          />
        ) : loading ? (
          <div className="card flex items-center justify-center gap-3 p-10 text-sm text-gray-500 dark:text-slate-400">
            <Spinner className="h-5 w-5" /> Memuat pertanyaan...
          </div>
        ) : questions.length === 0 ? (
          <EmptyState
            icon={<FileCheck className="h-6 w-6" />}
            title="Belum ada pertanyaan"
            description="Tambahkan pertanyaan checklist untuk setiap kategori permit proyek ini."
          />
        ) : filteredQuestions.length === 0 ? (
          <EmptyState
            icon={<FileCheck className="h-6 w-6" />}
            title="Tidak ada pertanyaan di kategori ini"
            description="Coba pilih kategori lain atau hapus filter."
            action={
              <button onClick={() => setFilterCategory('')} className="btn-ghost">
                Hapus filter
              </button>
            }
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                    <th className="px-5 py-3 font-semibold">No</th>
                    <th className="px-5 py-3 font-semibold">Pertanyaan</th>
                    <th className="px-5 py-3 font-semibold">Kategori</th>
                    <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filteredQuestions.map((q, i) => (
                    <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 text-gray-400 dark:text-slate-500">{i + 1}</td>
                      <td className="max-w-xl px-5 py-3.5 text-gray-800 dark:text-slate-200">{q.questionEn}</td>
                      <td className="px-5 py-3.5">
                        {q.categoryName && q.categoryColor ? (
                          <CategoryBadge name={q.categoryName} color={q.categoryColor} />
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(q)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-slate-800 dark:hover:text-brand-400"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(q)}
                            disabled={busy}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {modalOpen && (
          <QuestionModal
            categories={categories}
            initial={editing}
            onClose={() => setModalOpen(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
