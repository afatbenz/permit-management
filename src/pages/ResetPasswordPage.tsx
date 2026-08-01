import { useState } from 'react';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { AuthLayout } from '@/components/AuthLayout';
import { Field } from '@/components/Field';
import { Spinner } from '@/components/ui';

export function ResetPasswordPage() {
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <AuthLayout title="Reset password" subtitle="We'll send a recovery link to your email.">
      {sent ? (
        <div className="animate-scale-in space-y-5">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Check your inbox</p>
            <p className="max-w-xs text-sm text-emerald-600/80 dark:text-emerald-400/80">
              We've sent a password reset link to <span className="font-medium">{email}</span>.
            </p>
          </div>
          <button onClick={() => navigate('/login')} className="btn-outline w-full">Back to sign in</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </div>
          )}
          <Field id="email" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" required icon={<Mail className="h-4 w-4" />} />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner className="h-4 w-4" /> : <>Send Reset Link <ArrowRight className="h-4 w-4" /></>}
          </button>
          <button type="button" onClick={() => navigate('/login')} className="btn-ghost w-full">Back to sign in</button>
        </form>
      )}
    </AuthLayout>
  );
}
