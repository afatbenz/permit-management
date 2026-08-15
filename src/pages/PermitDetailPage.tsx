import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, Building2, MapPin, Calendar, FileText, User,
  CheckCircle2, XCircle, Trash2, ArrowRight, PenLine, Send, Loader2,
} from 'lucide-react';
import { api, type Permit, type PermitStatus } from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { StatusBadge, EmptyState, Spinner } from '@/components/ui';
import { useActiveProject } from '@/lib/activeProject';
import { useClientStore } from '@/stores/Client';

const STATUS_LABEL: Record<PermitStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function PermitDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMember } = useActiveProject();
  const user = useClientStore((state) => state.user);
  const [permit, setPermit] = useState<Permit | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);

  // Admin = super_admin or org_admin. Members (incl. project_admin per-project)
  // cannot approve/reject — the backend enforces this too.
  const isAdmin = !isMember;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getPermit(id);
      setPermit(res.permit);
      setNotFound(false);
    } catch (e) {
      if (e instanceof Error && e.message.includes('tidak ditemukan')) {
        setNotFound(true);
      } else {
        setError(e instanceof Error ? e.message : 'Gagal memuat permit');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this permit? This cannot be undone.')) return;
    setActioning(true);
    try {
      await api.deletePermit(id);
      navigate('/permit');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus permit');
      setActioning(false);
    }
  };

  const handleStatus = async (status: PermitStatus, reason?: string) => {
    setActioning(true);
    setError('');
    try {
      const res = await api.updatePermitStatus(id, status, reason);
      setPermit(res.permit);
      setRejectOpen(false);
      setRejectionReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengubah status');
    } finally {
      setActioning(false);
    }
  };

  const formatDateTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : '—';

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-brand-600" />
      </div>
    );
  }

  if (notFound || !permit) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Permit not found"
          description="This permit may have been deleted or you don't have access to view it."
          action={<button onClick={() => navigate('/permit')} className="btn-primary"><ArrowLeft className="h-4 w-4" /> Back to permits</button>}
        />
      </div>
    );
  }

  const INFO_ROWS = [
    { icon: <FileText className="h-4 w-4" />, label: 'Permit ID', value: permit.permitNumber, mono: true },
    { icon: <Building2 className="h-4 w-4" />, label: 'Department', value: permit.department },
    { icon: <Building2 className="h-4 w-4" />, label: 'Contractor', value: permit.contractorName },
    { icon: <User className="h-4 w-4" />, label: 'Submitted by', value: '—' },
    { icon: <Calendar className="h-4 w-4" />, label: 'Tanggal Pengajuan', value: formatDateTime(permit.createdAt) },
    { icon: <Calendar className="h-4 w-4" />, label: 'Last Updated', value: formatDateTime(permit.updatedAt) },
  ];

  const STATUS_TIMELINE = [
    { key: 'draft', label: 'Draft', icon: <PenLine className="h-4 w-4" />, done: true },
    { key: 'submitted', label: 'Submitted', icon: <Send className="h-4 w-4" />, done: permit.status !== 'draft' },
    { key: 'final', label: permit.status === 'rejected' ? 'Rejected' : 'Approved', icon: permit.status === 'rejected' ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />, done: permit.status === 'approved' || permit.status === 'rejected' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <button onClick={() => navigate('/permit')} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Back to permits
      </button>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Header card */}
      <div className="card p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">{permit.workTitle}</h1>
              <p className="mt-0.5 font-mono text-xs text-brand-600 dark:text-brand-400">{permit.permitNumber}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                {permit.projectName ?? permit.projectCode ?? '—'}
              </p>
              <div className="mt-2"><StatusBadge status={permit.status} /></div>
            </div>
          </div>

          {permit.status === 'draft' && isAdmin && (
            <button
              onClick={handleDelete}
              disabled={actioning}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 transition-all hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              {actioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
            </button>
          )}
        </div>

        {/* Admin actions: approve / reject a submitted permit */}
        {isAdmin && permit.status === 'submitted' && (
          <div className="mt-5 flex flex-col gap-3 border-t border-gray-200 pt-5 dark:border-slate-800">
            {rejectOpen ? (
              <div className="flex flex-col gap-3 rounded-xl bg-rose-50/50 p-4 dark:bg-rose-500/5">
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Alasan penolakan (wajib)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatus('rejected', rejectionReason)}
                    disabled={actioning || !rejectionReason.trim()}
                    className="btn-primary !bg-rose-600 hover:!bg-rose-700"
                  >
                    {actioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Reject
                  </button>
                  <button onClick={() => setRejectOpen(false)} className="btn-ghost">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleStatus('approved')}
                  disabled={actioning}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve
                </button>
                <button
                  onClick={() => setRejectOpen(true)}
                  disabled={actioning}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            )}
          </div>
        )}
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

          {permit.workDesc && (
            <div className="mt-6 border-t border-gray-200 pt-5 dark:border-slate-800">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Deskripsi Pekerjaan</h3>
              <p className="text-sm text-gray-700 dark:text-slate-300">{permit.workDesc}</p>
            </div>
          )}

          {/* Address */}
          <div className="mt-6 border-t border-gray-200 pt-5 dark:border-slate-800">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Address</h3>
            <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 dark:bg-slate-800/40">
              <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
              <div className="text-sm text-gray-700 dark:text-slate-300">
                <p className="font-medium">{permit.location1}</p>
                {permit.location2 && <p>{permit.location2}</p>}
                <p>{permit.city}, {permit.province}</p>
              </div>
            </div>
          </div>

          {/* Schedule */}
          {(permit.startAt || permit.endAt) && (
            <div className="mt-6 border-t border-gray-200 pt-5 dark:border-slate-800">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Jadwal Pekerjaan</h3>
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-slate-300">
                <Calendar className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <span>{formatDateTime(permit.startAt)} → {formatDateTime(permit.endAt)}</span>
              </div>
            </div>
          )}
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

          {permit.status === 'rejected' && permit.rejectionReason && (
            <div className="mt-4 rounded-xl bg-rose-50/50 p-4 text-sm text-rose-700 dark:bg-rose-500/5 dark:text-rose-300">
              <p className="font-semibold">Alasan penolakan</p>
              <p className="mt-1">{permit.rejectionReason}</p>
            </div>
          )}

          {(permit.approvedAt || permit.rejectedAt) && (
            <div className="mt-4 rounded-xl bg-brand-50/50 p-4 text-xs text-brand-700 dark:bg-brand-500/5 dark:text-brand-300">
              {permit.approvedAt && <p>Disetujui: {formatDateTime(permit.approvedAt)}</p>}
              {permit.rejectedAt && <p>Ditolak: {formatDateTime(permit.rejectedAt)}</p>}
            </div>
          )}

          <div className="mt-4 rounded-xl bg-brand-50/50 p-4 text-center dark:bg-brand-500/5">
            <p className="text-xs text-brand-700 dark:text-brand-300">Need help with this permit?</p>
            <button className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
              Contact support <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PermitDetailPage;
