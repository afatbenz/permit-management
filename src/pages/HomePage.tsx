import { FileText, Clock, CheckCircle2, XCircle, TrendingUp, Plus, ArrowRight, ChevronRight } from 'lucide-react';
import { getPermits, type Permit } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useActiveProject } from '@/lib/activeProject';
import { useHasProject } from '@/lib/useHasProject';
import { useRouter } from '@/lib/router';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge, EmptyState } from '@/components/ui';

export function HomePage() {
  const { user } = useAuth();
  const { navigate } = useRouter();

  // Permits are project-bound, so a user without an ACTIVE project gets a
  // neutral dashboard — no New Permit button, no stat cards, no Recent Permits.
  // Members are scoped to their chosen project; admins see everything.
  const { hasProject } = useHasProject(user?.id);
  const { activeProject, isMember } = useActiveProject();
  const scopedProjectId = isMember ? activeProject?.id : undefined;

  const permits: Permit[] = getPermits(scopedProjectId).slice(0, 5);

  const stats = {
    total: getPermits(scopedProjectId).length,
    pending: getPermits(scopedProjectId).filter((p) => p.status === 'pending').length,
    approved: getPermits(scopedProjectId).filter((p) => p.status === 'approved').length,
    rejected: getPermits(scopedProjectId).filter((p) => p.status === 'rejected').length,
  };

  const hasAccessibleProject = isMember ? !!activeProject : hasProject;

  const firstName = (user?.name ?? '').split(' ')[0] || 'Pengguna';

  const STAT_CARDS = [
    { label: 'Total Permits', value: stats.total, icon: <FileText className="h-5 w-5" />, tint: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400', bar: 'bg-blue-500' },
    { label: 'Pending', value: stats.pending, icon: <Clock className="h-5 w-5" />, tint: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400', bar: 'bg-amber-500' },
    { label: 'Approved', value: stats.approved, icon: <CheckCircle2 className="h-5 w-5" />, tint: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400', bar: 'bg-emerald-500' },
    { label: 'Rejected', value: stats.rejected, icon: <XCircle className="h-5 w-5" />, tint: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400', bar: 'bg-rose-500' },
  ];

  return (
    <DashboardLayout active="Home">
      <div className="space-y-6">
        {/* Hero greeting — light blue banner, navy text, illustration on the right */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-blue-100/70 to-sky-50 p-6 ring-1 ring-blue-100 sm:p-8">
          <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-blue-700">Welcome back,</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{firstName} 👋</h1>
              <p className="mt-2 max-w-md text-sm text-slate-600">Here's what's happening with your permit applications today.</p>
            </div>
            {hasAccessibleProject && (
              <button onClick={() => navigate('/dashboard/permits/new')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-blue-700 active:scale-[0.98]">
                <Plus className="h-4 w-4" /> New Permit
              </button>
            )}
          </div>
          {/* Flat illustration: document/clipboard in front of a building + plant */}
          <svg
            viewBox="0 0 320 180"
            className="pointer-events-none absolute -right-4 bottom-0 hidden w-56 opacity-90 lg:block"
            fill="none"
            aria-hidden="true"
          >
            {/* sun */}
            <circle cx="256" cy="28" r="18" fill="#bfdbfe" />
            {/* building */}
            <rect x="190" y="54" width="78" height="86" rx="8" fill="#dbeafe" />
            <rect x="202" y="66" width="16" height="16" rx="3" fill="#93c5fd" />
            <rect x="226" y="66" width="16" height="16" rx="3" fill="#93c5fd" />
            <rect x="202" y="90" width="16" height="16" rx="3" fill="#93c5fd" />
            <rect x="226" y="90" width="16" height="16" rx="3" fill="#93c5fd" />
            <rect x="202" y="114" width="40" height="26" rx="3" fill="#60a5fa" />
            {/* plant */}
            <rect x="24" y="120" width="64" height="10" rx="5" fill="#a78bfa" />
            <path d="M30 122 C28 96 40 88 40 70 C40 92 52 96 52 120 Z" fill="#34d399" />
            <path d="M56 122 C54 100 66 94 68 78 C66 98 74 104 76 122 Z" fill="#6ee7b7" />
            {/* document / clipboard */}
            <rect x="76" y="52" width="72" height="96" rx="10" fill="#fff" />
            <rect x="76" y="52" width="72" height="14" rx="10" fill="#60a5fa" />
            <rect x="90" y="82" width="44" height="7" rx="3.5" fill="#dbeafe" />
            <rect x="90" y="98" width="44" height="7" rx="3.5" fill="#dbeafe" />
            <rect x="90" y="114" width="28" height="7" rx="3.5" fill="#dbeafe" />
          </svg>
        </div>

        {/* Stat cards */}
        {hasAccessibleProject ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STAT_CARDS.map((s) => (
              <div key={s.label} className="card group relative overflow-hidden p-5 transition-all hover:shadow-soft">
                <span className={`absolute inset-x-0 bottom-0 h-1 ${s.bar}`} />
                <div className="flex items-start justify-between">
                  <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.tint}`}>{s.icon}</div>
                  <ChevronRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Belum terikat ke proyek</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-slate-400">
                Fitur perizinan tersedia setelah Anda di-assign ke sebuah proyek dan disetujui admin organisasi.
              </p>
            </div>
          </div>
        )}

        {/* Recent permits */}
        {hasAccessibleProject && (
        <div className="card">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Permits</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Your latest applications</p>
            </div>
            <button onClick={() => navigate('/dashboard/permits')} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              View all <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {permits.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No permits yet"
              description="Get started by creating your first permit application."
              action={<button onClick={() => navigate('/dashboard/permits/new')} className="btn-primary"><Plus className="h-4 w-4" /> Add Permit Baru</button>}
            />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {permits.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/dashboard/permits/${p.id}`)}
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
        )}

        {/* Activity tip */}
        {hasAccessibleProject && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/50 px-5 py-4 dark:border-brand-500/20 dark:bg-brand-500/5">
          <TrendingUp className="h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
          <p className="text-sm text-brand-700 dark:text-brand-300">
            <span className="font-semibold">Tip:</span> Keep your contractor information up to date to speed up the approval process.
          </p>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
