import { useState } from 'react';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { AuthLayout } from '@/components/AuthLayout';
import { Field } from '@/components/Field';
import { Spinner } from '@/components/ui';

export function UpdatePasswordPage() {
  const { navigate } = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate('/login'), 1800);
  };

  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong password for your account.">
      {done ? (
        <div className="animate-scale-in flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Password updated</p>
          <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">Redirecting you to sign in…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </div>
          )}
          <Field id="password" label="New password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" required icon={<Lock className="h-4 w-4" />} />
          <Field id="confirm" label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="Re-enter password" required icon={<Lock className="h-4 w-4" />} />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner className="h-4 w-4" /> : <>Update Password <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
