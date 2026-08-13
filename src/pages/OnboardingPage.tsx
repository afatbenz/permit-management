import { useEffect, useState, type FormEvent } from 'react';
import { Building2, UserPlus, CheckCircle2, Clock, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api, type Province, type City } from '@/lib/api';
import { useRouter } from '@/lib/router';
import { Field, SelectField } from '@/components/Field';
import { Spinner } from '@/components/ui';

type Mode = 'create' | 'join' | 'choose';

export function OnboardingPage() {
  const { user, refreshUser, signOut } = useAuth();
  const { navigate } = useRouter();
  const [mode, setMode] = useState<Mode>('choose');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  // ---- Create organization form (org name + address + city + province) ----
  const [createForm, setCreateForm] = useState({
    organizationName: '',
    address: '',
    city: '',
    province: '',
  });
  const setCreate = (key: keyof typeof createForm, value: string) =>
    setCreateForm((p) => ({ ...p, [key]: value }));

  // ---- Join organization form (invitation code only) ----
  const [joinForm, setJoinForm] = useState({ invitationCode: '' });
  const setJoin = (key: keyof typeof joinForm, value: string) =>
    setJoinForm((p) => ({ ...p, [key]: value }));

  // ---- Location dropdowns ----
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    api
      .listProvinces()
      .then((res) => setProvinces(res.provinces))
      .catch(() => setError('Gagal memuat daftar provinsi.'));
  }, []);

  useEffect(() => {
    if (!createForm.province) {
      setCities([]);
      setCreate('city', '');
      return;
    }
    setLoadingCities(true);
    api
      .listCities(createForm.province)
      .then((res) => setCities(res.cities))
      .catch(() => setError('Gagal memuat daftar kota.'))
      .finally(() => setLoadingCities(false));
  }, [createForm.province]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!createForm.organizationName || !createForm.city || !createForm.province) {
      setError('Nama organisasi, kota, dan provinsi wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createOrganization(createForm);
      // The account was promoted to org_admin server-side; the existing JWT
      // is still valid. Re-sync the session user so the nav shows admin menus.
      await refreshUser();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat organisasi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!joinForm.invitationCode) {
      setError('Kode undangan wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.joinOrganizationByCode(joinForm);
      setJoinSuccess(
        `Permintaan bergabung ke proyek "${res.project.name}" terkirim. Menunggu approval admin organisasi.`,
      );
      setJoinForm({ invitationCode: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal bergabung ke organisasi.');
    } finally {
      setSubmitting(false);
    }
  };

  const back = () => setMode('choose');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-slate-900">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">Selamat datang, {user?.name?.split(' ')[0] ?? ''} 👋</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Pilih bagaimana Anda ingin memulai — buat organisasi baru atau bergabung ke organisasi yang sudah ada.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </div>
        )}

        {joinSuccess && (
          <div className="mb-5 space-y-3">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 px-4 py-4 text-sm text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
              {joinSuccess}
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-4 text-sm text-amber-700 ring-1 ring-amber-600/10 dark:bg-amber-500/10 dark:text-amber-400">
              <Clock className="mt-0.5 h-5 w-5 flex-shrink-0" />
              Dashboard akan terbuka setelah admin organisasi menyetujui permintaan Anda.
            </div>
            <button
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              className="btn-ghost w-full justify-center"
            >
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </div>
        )}

        {mode === 'choose' && (
          <div className="grid gap-4">
            <button
              onClick={() => setMode('create')}
              className="card group flex items-start gap-4 p-6 text-left transition-all hover:border-brand-300"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-white">Create Organization</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  Anda akan menjadi Admin organisasi. Cocok jika perusahaan/instansi Anda belum terdaftar.
                </p>
              </div>
            </button>
            <button
              onClick={() => setMode('join')}
              className="card group flex items-start gap-4 p-6 text-left transition-all hover:border-brand-300"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-white">Join Existing Organization</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  Masukkan kode undangan yang Anda terima dari admin organisasi.
                </p>
              </div>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="card space-y-5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Create Organization</h2>
              <button type="button" onClick={back} className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">Kembali</button>
            </div>

            <Field id="orgName" label="Nama Organisasi" value={createForm.organizationName} onChange={(v) => setCreate('organizationName', v)} placeholder="e.g. PT. Jaya Obayashi" required />
            <Field id="orgAddress" label="Alamat Perusahaan" value={createForm.address} onChange={(v) => setCreate('address', v)} placeholder="e.g. Jl. Sudirman No. 123" />
            <SelectField
              id="orgProvince"
              label="Provinsi"
              value={createForm.province}
              onChange={(v) => setCreate('province', v)}
              options={provinces.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Pilih provinsi"
              required
            />
            <SelectField
              id="orgCity"
              label="Kota / Kabupaten"
              value={createForm.city}
              onChange={(v) => setCreate('city', v)}
              options={cities.map((c) => ({ value: c.id, label: c.name }))}
              placeholder={loadingCities ? 'Memuat kota…' : createForm.province ? 'Pilih kota' : 'Pilih provinsi dulu'}
              required
            />

            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
              {submitting ? <Spinner className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              Buat Organisasi
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="card space-y-5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Join Organization</h2>
              <button type="button" onClick={back} className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">Kembali</button>
            </div>

            <Field id="invitationCode" label="Kode Undangan" value={joinForm.invitationCode} onChange={(v) => setJoin('invitationCode', v.toUpperCase())} placeholder="e.g. JYBYS482" required />

            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
              {submitting ? <Spinner className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              Gabung Organisasi
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
