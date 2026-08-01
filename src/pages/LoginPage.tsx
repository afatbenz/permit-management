import { useState } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { AuthLayout } from '@/components/AuthLayout';
import { Field } from '@/components/Field';
import { Spinner } from '@/components/ui';

export function LoginPage() {
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account to continue.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </div>
        )}
        <Field id="email" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" required icon={<Mail className="h-4 w-4" />} />
        <Field id="password" label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required icon={<Lock className="h-4 w-4" />} />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800" />
            Remember me
          </label>
          <button type="button" onClick={() => navigate('/reset-password')} className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Forgot password?
          </button>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner className="h-4 w-4" /> : <>Sign In <ArrowRight className="h-4 w-4" /></>}
        </button>
        <p className="text-center text-sm text-gray-500 dark:text-slate-400">
          Don't have an account?{' '}
          <button type="button" onClick={() => navigate('/register')} className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Create one
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
