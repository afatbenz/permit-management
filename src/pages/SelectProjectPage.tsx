import { FolderKanban, LogOut, ChevronRight, ShieldCheck } from 'lucide-react';
import { useActiveProject } from '@/lib/activeProject';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { Spinner } from '@/components/ui';
import type { RoleCode } from '@/lib/api';

const ROLE_LABELS: Record<string, string> = {
  supervisor_subcon: 'Supervisor Subcon',
  supervisor_maincon: 'Supervisor Maincon',
  hse_maincon: 'HSE Maincon',
  cm_maincon: 'CM Maincon',
  project_admin: 'Project Admin',
  org_admin: 'Organization Admin',
  super_admin: 'Super Admin',
};

export function SelectProjectPage() {
  const { projects, loading, selectProject } = useActiveProject();
  const { signOut } = useAuth();
  const { navigate } = useRouter();

  const pick = (id: string) => {
    selectProject(id);
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-slate-900">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
            <FolderKanban className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">Pilih Project</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Pilih project untuk mulai bekerja. Semua data yang tampil hanya terkait project yang Anda pilih.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-10 text-sm text-gray-500 dark:text-slate-400">
            <Spinner className="h-5 w-5" /> Memuat project Anda...
          </div>
        ) : projects.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Belum ada project di-assign</p>
            <p className="mx-auto max-w-sm text-sm text-gray-500 dark:text-slate-400">
              Anda belum terdaftar di project mana pun. Hubungi admin organisasi untuk di-assign ke sebuah project.
            </p>
            <button
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              className="btn-ghost justify-center"
            >
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => {
              const roleCode = p.roleCode ?? '';
              return (
                <button
                  key={p.id}
                  onClick={() => pick(p.id)}
                  className="card group flex w-full items-center gap-4 p-5 text-left transition-all hover:border-brand-300"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-gray-900 dark:text-white">{p.name}</p>
                    <p className="truncate font-mono text-xs text-gray-400 dark:text-slate-500">{p.projectCode}</p>
                  </div>
                  <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-slate-800 dark:text-slate-300">
                    <ShieldCheck className="h-3 w-3" />
                    {ROLE_LABELS[roleCode] ?? p.roleName ?? 'Member'}
                  </span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 dark:text-slate-600" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
