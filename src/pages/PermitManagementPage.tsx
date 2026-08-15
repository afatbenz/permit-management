import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, FileText, Eye, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { api, type Permit, type PermitStatus } from '@/lib/api';
// GUNAKAN react-router-dom, BUKAN lib/router lama
import { useNavigate } from 'react-router-dom';
import { StatusBadge, EmptyState, Spinner } from '@/components/ui';
import { useActiveProject } from '@/lib/activeProject';

const PAGE_SIZE = 8;

const STATUS_FILTERS: Array<'all' | PermitStatus> = [
  'all', 'draft', 'submitted', 'approved', 'rejected',
];

const PermitManagementPage = () => {
  const navigate = useNavigate();
  const { activeProject, isMember } = useActiveProject();
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PermitStatus>('all');
  const [page, setPage] = useState(1);

  const projectId = isMember ? activeProject?.id : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.listPermits(projectId);
      setPermits(res.permits);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat permit');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return permits.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        p.permitNumber.toLowerCase().includes(q) ||
        p.projectName?.toLowerCase().includes(q) ||
        p.contractorName.toLowerCase().includes(q) ||
        p.workTitle.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [permits, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">Permit Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Manage and track all permit applications
            {isMember && activeProject ? ` — ${activeProject.name}` : ''}
          </p>
        </div>
        <button onClick={() => navigate('/permit/new')} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Permit Baru
        </button>
      </div>

      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search by permit ID, project, contractor..."
              className="input-field !py-2"
              style={{ paddingLeft: '2.5rem' }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400 dark:text-slate-500" />
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all
                  ${statusFilter === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {paged.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title={search || statusFilter !== 'all' ? 'No matching permits' : 'No permits yet'}
            description={search || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Create your first permit to get started.'}
            action={!search && statusFilter === 'all' ? <button onClick={() => navigate('/permit/new')} className="btn-primary"><Plus className="h-4 w-4" /> Add Permit Baru</button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                  <th className="px-5 py-3 font-semibold">No</th>
                  <th className="px-5 py-3 font-semibold">Permit ID</th>
                  <th className="px-5 py-3 font-semibold">Tanggal Pengajuan</th>
                  <th className="px-5 py-3 font-semibold">Project</th>
                  <th className="px-5 py-3 font-semibold">Judul Pekerjaan</th>
                  <th className="px-5 py-3 font-semibold">Nama Kontraktor</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {paged.map((p, i) => {
                  const no = (currentPage - 1) * PAGE_SIZE + i + 1;
                  return (
                    <tr key={p.id} className="group transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400">{no}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-medium text-brand-600 dark:text-brand-400">{p.permitNumber}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 dark:text-slate-300">{formatDate(p.createdAt)}</td>
                      <td className="px-5 py-3.5 max-w-[180px]">
                        <span className="block truncate font-medium text-gray-900 dark:text-white">{p.projectName ?? p.projectCode ?? '—'}</span>
                        <span className="block truncate text-xs text-gray-400 dark:text-slate-500">{p.department}</span>
                      </td>
                      <td className="px-5 py-3.5 max-w-[220px]">
                        <span className="block truncate text-gray-700 dark:text-slate-300">{p.workTitle}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 dark:text-slate-300">{p.contractorName}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/permit/${p.id}`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-300 dark:hover:border-brand-500/30"
                          >
                            <Eye className="h-3.5 w-3.5" /> Detail
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-slate-800">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-xs font-medium text-gray-700 dark:text-slate-300">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermitManagementPage;
