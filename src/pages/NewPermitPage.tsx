import { useState } from 'react';
import { ArrowLeft, Save, Building2 } from 'lucide-react';
import { addPermit, type PermitInput } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
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

const NewPermitPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<PermitInput>({
    department: '',
    contractor_name: '',
    address_1: '',
    address_2: '',
    city: '',
    province: '',
    project: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof PermitInput, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.department || !form.contractor_name || !form.address_1 || !form.city || !form.province || !form.project) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    // Small delay to show the spinner (feels more natural)
    setTimeout(() => {
      const permit = addPermit(form, user.email);
      setSubmitting(false);
      navigate(`/dashboard/permits/${permit.id}`);
    }, 300);
  };

  return (
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

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-5 dark:border-slate-800">
          <button type="button" onClick={() => navigate('/dashboard/permits')} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? <Spinner className="h-4 w-4" /> : <><Save className="h-4 w-4" /> Submit Permit</>}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewPermitPage;
