import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Building2, FolderKanban } from 'lucide-react';
import { api, type CreatePermitInput } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { Field, SuggestionInput } from '@/components/Field';
import { Spinner } from '@/components/ui';
import { useActiveProject } from '@/lib/activeProject';
import { useClientStore } from '@/stores/Client';

const DEPARTMENTS = [
  'Engineering',
  'Operations',
  'Health & Safety',
  'Environmental',
  'Construction',
  'Maintenance',
  'Quality Assurance',
  'Procurement',
  'Facilities',
  'Logistics',
];

const PROVINCES = [
  'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Banten', 'Bali', 'DI Yogyakarta',
  'Sumatera Utara', 'Sumatera Selatan', 'Riau', 'Kalimantan Timur', 'Kalimantan Selatan',
  'Sulawesi Selatan', 'Sulawesi Utara', 'Papua', 'Maluku', 'Aceh', 'Lampung',
];

type ProjectOption = { id: string; name: string; projectCode: string };

export function NewPermitPage() {
  const navigate = useNavigate();
  const { activeProject, isMember, projects: myProjects } = useActiveProject();
  const user = useClientStore((state) => state.user);

  // Members are locked to their active project. Admins pick from the org's
  // projects (loaded on mount).
  const [adminProjects, setAdminProjects] = useState<ProjectOption[]>([]);
  const [form, setForm] = useState<CreatePermitInput>({
    projectId: '',
    workTitle: '',
    department: '',
    contractorName: '',
    location1: '',
    location2: '',
    city: '',
    province: '',
    startAt: '',
    endAt: '',
    workDesc: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Lock members to their active project.
  useEffect(() => {
    if (isMember && activeProject) {
      setForm((f) => ({ ...f, projectId: activeProject.id }));
    }
  }, [isMember, activeProject]);

  // Admins: load all org projects for the picker.
  useEffect(() => {
    if (!isMember && user?.organizationId) {
      api
        .listOrgProjects(user.organizationId)
        .catch(() => null)
        .then((res) => {
          if (res?.projects) {
            setAdminProjects(res.projects);
            setForm((f) => ({ ...f, projectId: f.projectId || res.projects[0]?.id || '' }));
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMember, user?.organizationId]);

  const memberProject = isMember ? activeProject : null;
  const projectOptions: ProjectOption[] = memberProject
    ? [{ id: memberProject.id, name: memberProject.name, projectCode: memberProject.projectCode }]
    : adminProjects.length > 0
      ? adminProjects
      : myProjects.map((p) => ({ id: p.id, name: p.name, projectCode: p.projectCode }));

  const set = <K extends keyof CreatePermitInput>(key: K, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (
      !form.projectId ||
      !form.workTitle ||
      !form.department ||
      !form.contractorName ||
      !form.location1 ||
      !form.city ||
      !form.province
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreatePermitInput = {
        projectId: form.projectId,
        workTitle: form.workTitle,
        department: form.department,
        contractorName: form.contractorName,
        location1: form.location1,
        location2: form.location2 || undefined,
        city: form.city,
        province: form.province,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
        workDesc: form.workDesc || undefined,
      };
      const { permit } = await api.createPermit(payload);
      navigate(`/permit/${permit.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat permit.');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <button onClick={() => navigate('/permit')} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Back to permits
      </button>

      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">Add Permit Baru</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Fill in the contractor and project details to submit a new permit application.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6 p-6">
        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Project info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Project Information</h2>
          </div>

          {memberProject ? (
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-slate-800/60 dark:text-slate-300">
              <FolderKanban className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <span className="font-medium">{memberProject.name}</span>
              <span className="font-mono text-xs text-gray-400">{memberProject.projectCode}</span>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Project <span className="text-rose-500">*</span></label>
              <select
                className="input-field"
                value={form.projectId}
                onChange={(e) => set('projectId', e.target.value)}
                required
              >
                {projectOptions.length === 0 && <option value="">—</option>}
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.projectCode})</option>
                ))}
              </select>
            </div>
          )}

          <Field
            id="workTitle"
            label="Judul Pekerjaan"
            value={form.workTitle}
            onChange={(v) => set('workTitle', v)}
            placeholder="e.g. Instalasi Scaffolding Area B"
            required
          />
          <SuggestionInput
            id="department"
            label="Nama Departemen"
            value={form.department}
            onChange={(v) => set('department', v)}
            suggestions={DEPARTMENTS}
            placeholder="Type or select a department"
            required
          />
        </div>

        <div className="border-t border-gray-200 dark:border-slate-800" />

        {/* Contractor info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Contractor Information</h2>
          </div>
          <Field id="contractor" label="Nama Kontraktor" value={form.contractorName} onChange={(v) => set('contractorName', v)} placeholder="e.g. PT. Karya Bangun Persada" required />
        </div>

        <div className="border-t border-gray-200 dark:border-slate-800" />

        {/* Address */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Address</h2>
          </div>
          <Field id="addr1" label="Alamat 1" value={form.location1} onChange={(v) => set('location1', v)} placeholder="Jl. Sudirman No. 1" required />
          <Field id="addr2" label="Alamat 2" value={form.location2 ?? ''} onChange={(v) => set('location2', v)} placeholder="Gedung B, Lantai 3 (opsional)" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="city" label="Kota" value={form.city} onChange={(v) => set('city', v)} placeholder="Jakarta" required />
            <SuggestionInput
              id="province"
              label="Provinsi"
              value={form.province}
              onChange={(v) => set('province', v)}
              suggestions={PROVINCES}
              placeholder="Type or select a province"
              required
            />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-800" />

        {/* Schedule */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Schedule (Opsional)</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="startAt" label="Mulai" type="datetime-local" value={form.startAt ?? ''} onChange={(v) => set('startAt', v)} />
            <Field id="endAt" label="Selesai" type="datetime-local" value={form.endAt ?? ''} onChange={(v) => set('endAt', v)} />
          </div>
          <Field
            id="workDesc"
            label="Deskripsi Pekerjaan"
            value={form.workDesc ?? ''}
            onChange={(v) => set('workDesc', v)}
            placeholder="Detail pekerjaan (opsional)"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-5 dark:border-slate-800">
          <button type="button" onClick={() => navigate('/permit')} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? <Spinner className="h-4 w-4" /> : <><Save className="h-4 w-4" /> Submit Permit</>}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewPermitPage;
