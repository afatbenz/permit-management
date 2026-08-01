import { useState } from 'react';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { AuthLayout } from '@/components/AuthLayout';
import { Field } from '@/components/Field';
import { Spinner } from '@/components/ui';

export function RegisterPage() {
  const { navigate } = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start managing permits in minutes.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </div>
        )}
        <Field id="name" label="Full name" value={name} onChange={setName} placeholder="John Doe" required icon={<User className="h-4 w-4" />} />
        <Field id="email" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" required icon={<Mail className="h-4 w-4" />} />
        <Field id="password" label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" required icon={<Lock className="h-4 w-4" />} />
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner className="h-4 w-4" /> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
        </button>
        <p className="text-center text-sm text-gray-500 dark:text-slate-400">
          Already have an account?{' '}
          <button type="button" onClick={() => navigate('/login')} className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Sign in
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
