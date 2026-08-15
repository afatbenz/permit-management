import { useCallback, useEffect, useState } from 'react';
import { Building2, Copy, Check, KeyRound, Loader2 } from 'lucide-react';
import { api, type InvitationCode, type Province, type City } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Field, SelectField } from '@/components/Field';
import { Spinner } from '@/components/ui';

export function OrganizationSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const orgId = user?.organizationId ?? '';

  // Card 1 — company profile
  const [orgName, setOrgName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');

  // Card 2 — invitation codes
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  // Location dropdowns
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const loadOrg = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError('');
    try {
      const [orgRes, provRes, icRes] = await Promise.all([
        api.getOrganizationSettings(orgId),
        api.listProvinces(),
        api.getInvitationCodes(orgId),
      ]);
      const org = orgRes.organization;
      setOrgName(org.name);
      setAddress(org.address ?? '');
      setCity(org.city ?? '');
      setProvince(org.province ?? '');
      setProvinces(provRes.provinces);
      setCodes(icRes.codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan organisasi.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  // Reload cities when the selected province changes.
  useEffect(() => {
    if (!province) {
      setCities([]);
      return;
    }
    api
      .listCities(province)
      .then((res) => setCities(res.cities))
      .catch(() => setCities([]));
  }, [province]);

  useEffect(() => {
    loadOrg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.updateOrganizationSettings(orgId, { name: orgName, address, city, province });
      setSuccess('Pengaturan perusahaan berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <DashboardLayout active="Organization Settings">
        <div className="flex items-center justify-center gap-3 p-16 text-sm text-gray-500 dark:text-slate-400">
          <Spinner className="h-5 w-5" /> Memuat pengaturan...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout active="Organization Settings">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">Organization Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Kelola profil perusahaan dan kode undangan proyek</p>
        </div>

        {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400">{success}</div>}

        {/* Card 1 — Perusahaan */}
        <form onSubmit={handleSave} className="card space-y-5 p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <Building2 className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Profil Perusahaan</h2>
          </div>

          <Field id="orgName" label="Nama Perusahaan" value={orgName} onChange={setOrgName} required />
          <Field id="orgAddress" label="Alamat Perusahaan" value={address} onChange={setAddress} />
          <SelectField
            id="province"
            label="Provinsi"
            value={province}
            onChange={setProvince}
            options={provinces.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Pilih provinsi"
          />
          <SelectField
            id="city"
            label="Kota / Kabupaten"
            value={city}
            onChange={setCity}
            options={cities.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Pilih kota"
          />

          <button type="submit" disabled={saving} className="btn-primary justify-center">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Simpan Perubahan
          </button>
        </form>

        {/* Card 2 — Kode undangan proyek */}
        <div className="card space-y-4 p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Kode Undangan Proyek</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Bagikan kode ini kepada user yang ingin bergabung ke proyek organisasi Anda.
              </p>
            </div>
          </div>

          {codes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Belum ada kode undangan. Kode dibuat otomatis saat proyek dibuat.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {codes.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{c.projectName ?? 'Proyek'}</p>
                    <p className="font-mono text-lg font-bold tracking-widest text-brand-600 dark:text-brand-400">{c.code}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCode(c.id, c.code)}
                    className="btn-ghost"
                  >
                    {copied === c.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    {copied === c.id ? 'Tersalin' : 'Salin'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
