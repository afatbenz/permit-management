import { useRef, useState } from 'react';
import { ArrowLeft, Save, Building2, Map, Wrench, Trash2, FileUp } from 'lucide-react';
import { addPermit, type PermitInput } from '@/lib/supabase';
import { api, type EvidenceType } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Field, SuggestionInput } from '@/components/Field';
import { Spinner } from '@/components/ui';

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

const EVIDENCE_MAX_MB = 5;
const EVIDENCE_TYPES: Array<{ type: EvidenceType; label: string; icon: JSX.Element }> = [
  { type: 'SITE_MAP', label: 'Denah', icon: <Map className="h-4 w-4" /> },
  { type: 'EQUIPMENT', label: 'Alat', icon: <Wrench className="h-4 w-4" /> },
];

type PendingEvidence = { file: File; type: EvidenceType };

function validateEvidenceFile(file: File): string | null {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return `File "${file.name}" harus PNG, JPEG, atau WebP.`;
  }
  if (file.size > EVIDENCE_MAX_MB * 1024 * 1024) {
    return `File "${file.name}" melebihi ${EVIDENCE_MAX_MB} MB.`;
  }
  return null;
}

export function NewPermitPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [form, setForm] = useState<PermitInput>({
    department: '',
    contractor_name: '',
    address_1: '',
    address_2: '',
    city: '',
    province: '',
    project: '',
  });
  const [evidence, setEvidence] = useState<PendingEvidence[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const siteMapRef = useRef<HTMLInputElement>(null);
  const equipmentRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof PermitInput, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const addFiles = (type: EvidenceType, files: FileList | null) => {
    if (!files) return;
    setError('');
    const pending: PendingEvidence[] = [];
    for (const file of Array.from(files)) {
      const err = validateEvidenceFile(file);
      if (err) {
        setError(err);
        continue;
      }
      pending.push({ file, type });
    }
    setEvidence((prev) => [...prev, ...pending]);
  };

  const removeEvidence = (index: number) => {
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.department || !form.contractor_name || !form.address_1 || !form.city || !form.province || !form.project) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    // Small delay to show the spinner (feels more natural)
    setTimeout(async () => {
      try {
        const permit = addPermit(form, user?.email ?? '');

        // Upload evidence (SITE_MAP / EQUIPMENT) to the backend, if any.
        if (evidence.length > 0) {
          await api.uploadEvidences(
            permit.id,
            evidence.map((ev) => ev.file),
            evidence.map((ev) => ev.type),
          );
        }

        setSubmitting(false);
        navigate(`/dashboard/permits/${permit.id}`);
      } catch (err) {
        setSubmitting(false);
        setError(err instanceof Error ? err.message : 'Gagal mengupload evidence.');
      }
    }, 300);
  };

  return (
    <DashboardLayout active="Permit Management">
      <div className="mx-auto max-w-3xl space-y-5">
        <button onClick={() => navigate('/dashboard/permits')} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200">
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
            <Field id="project" label="Nama Project" value={form.project} onChange={(v) => set('project', v)} placeholder="e.g. Pembangunan Jembatan Surabaya" required />
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
            <Field id="contractor" label="Nama Kontraktor" value={form.contractor_name} onChange={(v) => set('contractor_name', v)} placeholder="e.g. PT. Karya Bangun Persada" required />
          </div>

          <div className="border-t border-gray-200 dark:border-slate-800" />

          {/* Address */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Address</h2>
            </div>
            <Field id="addr1" label="Alamat 1" value={form.address_1} onChange={(v) => set('address_1', v)} placeholder="Jl. Sudirman No. 1" required />
            <Field id="addr2" label="Alamat 2" value={form.address_2 ?? ''} onChange={(v) => set('address_2', v)} placeholder="Gedung B, Lantai 3 (opsional)" />
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

          {/* Evidence uploads */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileUp className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Dokumen Pendukung</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {EVIDENCE_TYPES.map((cat) => (
                <div key={cat.type} className="rounded-xl border border-gray-200 p-4 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                    {cat.icon} {cat.label}
                  </div>
                  <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">PNG/JPEG/WebP, maks {EVIDENCE_MAX_MB} MB per file</p>
                  <label className="btn-ghost mt-3 w-full cursor-pointer justify-center !py-2 text-xs">
                    <FileUp className="h-3.5 w-3.5" /> Pilih {cat.label} (multi)
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      ref={cat.type === 'SITE_MAP' ? siteMapRef : equipmentRef}
                      onChange={(e) => {
                        addFiles(cat.type, e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {evidence.filter((ev) => ev.type === cat.type).length > 0 && (
                    <p className="mt-2 text-xs font-medium text-brand-600 dark:text-brand-400">
                      {evidence.filter((ev) => ev.type === cat.type).length} file dipilih
                    </p>
                  )}
                </div>
              ))}
            </div>

            {evidence.length > 0 && (
              <ul className="space-y-2">
                {evidence.map((ev, i) => (
                  <li key={`${ev.type}-${i}`} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5 text-sm dark:bg-slate-800/40">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${ev.type === 'SITE_MAP' ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                      {ev.type === 'SITE_MAP' ? 'Denah' : 'Alat'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-slate-300">{ev.file.name}</span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">{(ev.file.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => removeEvidence(i)} className="text-gray-400 transition-colors hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-5 dark:border-slate-800">
            <button type="button" onClick={() => navigate('/dashboard/permits')} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Spinner className="h-4 w-4" /> : <><Save className="h-4 w-4" /> Submit Permit</>}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
