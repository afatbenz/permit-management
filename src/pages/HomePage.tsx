import { FileText, Clock, CheckCircle2, XCircle, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { getPermits, type Permit } from '@/lib/supabase'; // Asumsi mock data ini masih Anda gunakan
import { useNavigate } from 'react-router-dom';
import { useClientStore } from '@/stores/Client';
import { StatusBadge, EmptyState } from '@/components/ui';

const HomePage = () => {
  // Gunakan standard hooks yang sudah kita bangun
  const { user } = useClientStore();
  const navigate = useNavigate();
  
  const permits: Permit[] = getPermits().slice(0, 5);

  const stats = {
    total: getPermits().length,
    pending: getPermits().filter((p) => p.status === 'pending').length,
    approved: getPermits().filter((p) => p.status === 'approved').length,
    rejected: getPermits().filter((p) => p.status === 'rejected').length,
  };

  // Sesuaikan dengan struktur data user dari API (Zustand)
  const firstName = user?.name ? user.name.split(' ')[0] : 'Guest';

  const STAT_CARDS = [
    { label: 'Total Permits', value: stats.total, icon: <FileText className="h-5 w-5" />, tint: 'text-brand-600 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-400' },
    { label: 'Pending', value: stats.pending, icon: <Clock className="h-5 w-5" />, tint: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400' },
    { label: 'Approved', value: stats.approved, icon: <CheckCircle2 className="h-5 w-5" />, tint: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' },
    { label: 'Rejected', value: stats.rejected, icon: <XCircle className="h-5 w-5" />, tint: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400' },
  ];

  // LANGSUNG RETURN KONTEN, JANGAN BUNGKUS DENGAN <DashboardLayout>
  return (
    <div className="space-y-6">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-2xl bg-brand-700 p-6 text-white sm:p-8">
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-brand-100">Welcome back,</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{firstName} 👋</h1>
            <p className="mt-2 max-w-md text-sm text-brand-100">Here's what's happening with your permit applications today.</p>
          </div>
          <button onClick={() => navigate('/permit/new')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-soft transition-all hover:bg-brand-50 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> New Permit
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="card p-5">
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.tint}`}>{s.icon}</div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent permits */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Permits</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Your latest applications</p>
          </div>
          <button onClick={() => navigate('/permit')} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            View all <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {permits.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="No permits yet"
            description="Get started by creating your first permit application."
            action={<button onClick={() => navigate('/permit/new')} className="btn-primary"><Plus className="h-4 w-4" /> Add Permit Baru</button>}
          />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {permits.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/permit/${p.id}`)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/40"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{p.project}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-slate-400">{p.permit_number} · {p.contractor_name}</p>
                </div>
                <div className="hidden sm:block">
                  <StatusBadge status={p.status} />
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-slate-600" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Activity tip */}
      <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/50 px-5 py-4 dark:border-brand-500/20 dark:bg-brand-500/5">
        <TrendingUp className="h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
        <p className="text-sm text-brand-700 dark:text-brand-300">
          <span className="font-semibold">Tip:</span> Keep your contractor information up to date to speed up the approval process.
        </p>
      </div>
    </div>
  );
}

export default HomePage;