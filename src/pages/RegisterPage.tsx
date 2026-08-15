import { useState, type FormEvent } from 'react';
import { UserPlus, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { Field } from '@/components/Field';
import { Spinner } from '@/components/ui';

/** Digits-only; first 2 chars are forced to "62". */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return '62';
  // "08..." → "628...", already "62..." stays; strip a stray leading 0.
  const withoutZero = digits.replace(/^0+/, '');
  const prefixed = withoutZero.startsWith('62') ? withoutZero : `62${withoutZero}`;
  return prefixed.slice(0, 15);
}

function passwordStrength(pw: string): { score: number; label: string; segments: boolean[] } {
  const checks = [
    pw.length >= 6,
    /[A-Z]/.test(pw),
    /[a-z]/.test(pw),
    /\d/.test(pw),
    /^\S+$/.test(pw),
  ];
  const score = checks.filter(Boolean).length;
  const label = score === 0 ? 'Sangat lemah' : score <= 2 ? 'Lemah' : score <= 3 ? 'Cukup' : score === 4 ? 'Kuat' : 'Sangat kuat';
  // 4 visual segments for the bar.
  const segments = [score >= 1, score >= 2, score >= 3, score >= 4];
  return { score, label, segments };
}

const PASSWORD_RULE_MSG =
  'Password minimal 6 karakter, kombinasi huruf besar, huruf kecil, dan angka (tanpa spasi)';

export function RegisterPage() {
  const { signUp } = useAuth();
  const { navigate } = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '62',
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const set = (key: keyof typeof form, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const strength = passwordStrength(form.password);
  const validPhone = /^62\d{8,}$/.test(form.phone);
  const validPassword =
    form.password.length >= 6 &&
    /[A-Z]/.test(form.password) &&
    /[a-z]/.test(form.password) &&
    /\d/.test(form.password) &&
    /^\S+$/.test(form.password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!form.name || !form.email) {
      setError('Nama dan email wajib diisi.');
      return;
    }
    if (!validPhone) {
      setError('No. telepon minimal 10 digit setelah kode 62.');
      return;
    }
    if (!validPassword) {
      setError(PASSWORD_RULE_MSG);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak sama.');
      return;
    }

    setSubmitting(true);
    try {
      await signUp(form);
      setSuccessMessage('Akun berhasil dibuat! Silakan login untuk melanjutkan ke Create/Join Organization.');
      setForm({ name: '', email: '', phone: '62', password: '', confirmPassword: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
            <UserPlus className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">Buat Akun</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Daftar untuk mulai menggunakan platform. Setelah login Anda bisa membuat atau bergabung ke organisasi.
          </p>
        </div>

        {successMessage && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 px-4 py-4 text-sm text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
              {successMessage}
            </div>
            <button onClick={() => navigate('/login')} className="btn-primary w-full justify-center">
              Ke Halaman Login
            </button>
          </div>
        )}

        {!successMessage && (
          <form onSubmit={handleSubmit} className="card space-y-5 p-6">
            {error && (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">
                {error}
              </div>
            )}

            <Field id="name" label="Nama Lengkap" value={form.name} onChange={(v) => set('name', v)} placeholder="e.g. Samuel Sinaga" required />
            <Field id="email" label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} placeholder="nama@perusahaan.com" required />
            <Field
              id="phone"
              label="No. Telepon"
              type="tel"
              value={form.phone}
              onChange={(v) => set('phone', normalizePhone(v))}
              placeholder="628xxxxxxxxxx"
              required
            />
            <Field
              id="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={(v) => set('password', v)}
              placeholder="Minimal 6 karakter"
              required
            />

            {/* Password-strength progress bar */}
            {form.password && (
              <div>
                <div className="flex gap-1.5">
                  {strength.segments.map((on, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        on
                          ? strength.score <= 2
                            ? 'bg-rose-500'
                            : strength.score === 3
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          : 'bg-gray-200 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`mt-1.5 text-xs font-medium ${
                    strength.score <= 2
                      ? 'text-rose-600 dark:text-rose-400'
                      : strength.score === 3
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {strength.label}
                </p>
              </div>
            )}

            <Field
              id="confirmPassword"
              label="Konfirmasi Password"
              type="password"
              value={form.confirmPassword}
              onChange={(v) => set('confirmPassword', v)}
              placeholder="Ulangi password"
              required
            />

            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
              {submitting ? <Spinner className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              Daftar
            </button>
          </form>
        )}

        {!successMessage && (
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-slate-400">
            Sudah punya akun?{' '}
            <button onClick={() => navigate('/login')} className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
              Masuk
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
