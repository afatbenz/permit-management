import { useState, type FormEvent } from 'react';
import { Building2, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useRouter } from '@/lib/router';
import { Field } from '@/components/Field';
import { Spinner } from '@/components/ui';

type Mode = 'create' | 'join' | 'choose';

export function OnboardingPage() {
  const { user, signIn } = useAuth();
  const { navigate } = useRouter();
  const [mode, setMode] = useState<Mode>('choose');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Create organization form
  const [createForm, setCreateForm] = useState({
    organizationName: '',
    adminName: user?.name ?? '',
    adminEmail: user?.email ?? '',
    adminPassword: '',
    adminPhone: user?.phone ?? '',
  });
  const setCreate = (key: keyof typeof createForm, value: string) =>
    setCreateForm((p) => ({ ...p, [key]: value }));

  // Join organization form
  const [joinForm, setJoinForm] = useState({
    inviteToken: '',
    name: user?.name ?? '',
    password: '',
    phone: user?.phone ?? '',
  });
  const setJoin = (key: keyof typeof joinForm, value: string) =>
    setJoinForm((p) => ({ ...p, [key]: value }));

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!createForm.organizationName || !createForm.adminEmail || !createForm.adminPassword) {
      setError('Nama organisasi, email, dan password wajib diisi.');
      return;
    }
    if (createForm.adminPassword.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createOrganization(createForm);
      // The account was promoted to org_admin — sign in again to pick up the
      // new role/org and get a valid token.
      await signIn(createForm.adminEmail, createForm.adminPassword);
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
    if (!joinForm.inviteToken || !joinForm.name || !joinForm.password) {
      setError('Token undangan, nama, dan password wajib diisi.');
      return;
    }
    if (joinForm.password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      await api.joinOrganization(joinForm);
      setError('');
      navigate('/login');
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
                  Masukkan token undangan yang Anda terima (registration/invite link).
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
            <Field id="adminName" label="Nama Admin" value={createForm.adminName} onChange={(v) => setCreate('adminName', v)} required />
            <Field id="adminEmail" label="Email Admin" type="email" value={createForm.adminEmail} onChange={(v) => setCreate('adminEmail', v)} required />
            <Field id="adminPhone" label="No. Telepon" type="tel" value={createForm.adminPhone} onChange={(v) => setCreate('adminPhone', v)} required />
            <Field id="adminPassword" label="Password" type="password" value={createForm.adminPassword} onChange={(v) => setCreate('adminPassword', v)} placeholder="Minimal 8 karakter" required />

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

            <Field id="inviteToken" label="Token Undangan" value={joinForm.inviteToken} onChange={(v) => setJoin('inviteToken', v)} placeholder="Tempel token undangan Anda" required />
            <Field id="joinName" label="Nama Lengkap" value={joinForm.name} onChange={(v) => setJoin('name', v)} required />
            <Field id="joinPhone" label="No. Telepon" type="tel" value={joinForm.phone} onChange={(v) => setJoin('phone', v)} required />
            <Field id="joinPassword" label="Password" type="password" value={joinForm.password} onChange={(v) => setJoin('password', v)} placeholder="Minimal 8 karakter" required />

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