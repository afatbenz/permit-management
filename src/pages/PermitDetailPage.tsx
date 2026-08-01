import { useState } from 'react';
import { ArrowLeft, Building2, MapPin, User, Calendar, FileText, CheckCircle2, XCircle, Clock, Trash2, ArrowRight } from 'lucide-react';
import { getPermit, deletePermit, type Permit } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge, EmptyState } from '@/components/ui';

export function PermitDetailPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const permit: Permit | undefined = getPermit(id);

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this permit? This cannot be undone.')) return;
    deletePermit(id);
    navigate('/dashboard/permits');
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

  if (!permit) {
    return (
      <DashboardLayout active="Permit Management">
        <div className="mx-auto max-w-3xl">
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="Permit not found"
            description="This permit may have been deleted or you don't have access to view it."
            action={<button onClick={() => navigate('/dashboard/permits')} className="btn-primary"><ArrowLeft className="h-4 w-4" /> Back to permits</button>}
          />
        </div>
      </DashboardLayout>
    );
  }

  const INFO_ROWS = [
    { icon: <FileText className="h-4 w-4" />, label: 'Permit ID', value: permit.permit_number, mono: true },
    { icon: <Building2 className="h-4 w-4" />, label: 'Department', value: permit.department },
    { icon: <Building2 className="h-4 w-4" />, label: 'Contractor', value: permit.contractor_name },
    { icon: <User className="h-4 w-4" />, label: 'Submitted by', value: permit.user_email },
    { icon: <Calendar className="h-4 w-4" />, label: 'Tanggal Pengajuan', value: formatDateTime(permit.created_at) },
    { icon: <Calendar className="h-4 w-4" />, label: 'Last Updated', value: formatDateTime(permit.updated_at) },
  ];

  const STATUS_TIMELINE = [
    { key: 'pending', label: 'Submitted', icon: <Clock className="h-4 w-4" />, done: true },
    { key: 'approved', label: 'Under Review', icon: <Clock className="h-4 w-4" />, done: permit.status === 'approved' || permit.status === 'rejected' },
    { key: 'final', label: permit.status === 'rejected' ? 'Rejected' : 'Approved', icon: permit.status === 'rejected' ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />, done: permit.status === 'approved' || permit.status === 'rejected' },
  ];

  return (
    <DashboardLayout active="Permit Management">
      <div className="mx-auto max-w-4xl space-y-5">
        <button onClick={() => navigate('/dashboard/permits')} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to permits
        </button>

        {/* Header card */}
        <div className="card p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">{permit.project}</h1>
                <p className="mt-0.5 font-mono text-xs text-brand-600 dark:text-brand-400">{permit.permit_number}</p>
                <div className="mt-2"><StatusBadge status={permit.status} /></div>
              </div>
            </div>
            <button onClick={handleDelete} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 transition-all hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Info */}
          <div className="card p-6 lg:col-span-2">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Permit Details</h2>
            <dl className="space-y-4">
              {INFO_ROWS.map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                    {row.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs text-gray-400 dark:text-slate-500">{row.label}</dt>
                    <dd className={`truncate text-sm font-medium text-gray-900 dark:text-white ${row.mono ? 'font-mono text-brand-600 dark:text-brand-400' : ''}`}>
                      {row.value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>

            {/* Address */}
            <div className="mt-6 border-t border-gray-200 pt-5 dark:border-slate-800">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Address</h3>
              <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 dark:bg-slate-800/40">
                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
                <div className="text-sm text-gray-700 dark:text-slate-300">
                  <p className="font-medium">{permit.address_1}</p>
                  {permit.address_2 && <p>{permit.address_2}</p>}
                  <p>{permit.city}, {permit.province}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card p-6">
            <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Status Timeline</h2>
            <ol className="relative space-y-6">
              {STATUS_TIMELINE.map((step, i) => {
                const isLast = i === STATUS_TIMELINE.length - 1;
                return (
                  <li key={step.key} className="relative flex gap-3 pb-6">
                    {!isLast && (
                      <span className={`absolute left-4 top-9 h-full w-0.5 ${step.done ? 'bg-brand-500' : 'bg-gray-200 dark:bg-slate-700'}`} />
                    )}
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-800
                      ${step.done
                        ? (permit.status === 'rejected' && isLast ? 'bg-rose-500 text-white' : 'bg-brand-500 text-white')
                        : 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                      {step.icon}
                    </div>
                    <div className="pt-1">
                      <p className={`text-sm font-semibold ${step.done ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>{step.label}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{step.done ? 'Completed' : 'In progress'}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 rounded-xl bg-brand-50/50 p-4 text-center dark:bg-brand-500/5">
              <p className="text-xs text-brand-700 dark:text-brand-300">Need help with this permit?</p>
              <button className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                Contact support <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
