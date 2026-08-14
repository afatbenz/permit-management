/** The approval chain a pending permit travels before it is approved. */
export const APPROVAL_PIPELINE: RoleCode[] = [
  'supervisor_subcon',
  'supervisor_maincon',
  'hse_maincon',
  'cm_maincon',
];

import type { RoleCode } from '@/lib/api';

export type Permit = {
  id: string;
  permit_number: string;
  department: string;
  contractor_name: string;
  address_1: string;
  address_2: string | null;
  city: string;
  province: string;
  project: string;
  /** Project this permit belongs to (resolves the per-project approver role). */
  project_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  /** Category this permit belongs to (one per permit). */
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  /** Step of APPROVAL_PIPELINE that must act next; null once decided. */
  current_approver_role: RoleCode | null;
  user_id: string;
  user_email: string;
  created_at: string;
  updated_at: string;
};

export type PermitInput = {
  department: string;
  contractor_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  province: string;
  project: string;
  project_id?: string;
  category_id?: string;
  category_name?: string;
  category_color?: string;
};

// ── In-memory mock store ──────────────────────────────────────

let nextSeq = 1;

function uid(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function now(): string {
  return new Date().toISOString();
}

function createPermit(input: PermitInput, userEmail: string): Permit {
  const year = new Date().getFullYear();
  const seq = String(nextSeq++).padStart(4, '0');
  const ts = now();
  return {
    id: uid(),
    permit_number: `PMT-${year}-${seq}`,
    department: input.department,
    contractor_name: input.contractor_name,
    address_1: input.address_1,
    address_2: input.address_2 ?? null,
    city: input.city,
    province: input.province,
    project: input.project,
    project_id: input.project_id ?? null,
    status: 'pending',
    category_id: input.category_id ?? null,
    category_name: input.category_name ?? null,
    category_color: input.category_color ?? null,
    // Subcon submits → pipeline starts at the next approver after them.
    current_approver_role: 'supervisor_maincon',
    user_id: 'mock-user-001',
    user_email: userEmail,
    created_at: ts,
    updated_at: ts,
  };
}

// Seed with sample data so the dashboard isn't empty
const SEED: Permit[] = [
  createPermit(
    { department: 'Engineering', contractor_name: 'PT. Karya Bangun Persada', address_1: 'Jl. Sudirman No. 12', city: 'Jakarta', province: 'DKI Jakarta', project: 'Pembangunan Jembatan Surabaya', category_id: 'seed-cat-wah', category_name: 'WAH', category_color: '#D97706' },
    'admin@example.com',
  ),
  createPermit(
    { department: 'Construction', contractor_name: 'PT. Mitra Konstruksi', address_1: 'Jl. Gatot Subroto No. 55', address_2: 'Gedung B Lt. 3', city: 'Bandung', province: 'Jawa Barat', project: 'Revitalisasi Kantor Pusat', category_id: 'seed-cat-lifting', category_name: 'Lifting', category_color: '#DC2626' },
    'admin@example.com',
  ),
  createPermit(
    { department: 'Environmental', contractor_name: 'CV. Hijau Lestari', address_1: 'Jl. Pahlawan No. 8', city: 'Surabaya', province: 'Jawa Timur', project: 'Instalasi Pengolahan Limbah', category_id: 'seed-cat-galian', category_name: 'Pekerjaan Galian', category_color: '#059669' },
    'admin@example.com',
  ),
  createPermit(
    { department: 'Health & Safety', contractor_name: 'PT. Safety First Indonesia', address_1: 'Jl. Asia Afrika No. 10', city: 'Yogyakarta', province: 'DI Yogyakarta', project: 'Audit K3 Fasilitas Produksi', category_id: 'seed-cat-general', category_name: 'General Permit', category_color: '#0284C7' },
    'admin@example.com',
  ),
];

// Approve / reject one for variety; push one pending further down the pipeline.
SEED[1].status = 'approved';
SEED[1].current_approver_role = null;
SEED[2].status = 'rejected';
SEED[2].current_approver_role = null;
SEED[3].current_approver_role = 'hse_maincon';

let permits: Permit[] = [...SEED];

// ── CRUD helpers (mirror Supabase query style) ───────────────

/**
 * All permits, newest first. Pass a `projectId` to scope to that project
 * (non-admin "active project" session). Without it, returns every permit
 * (admin org-wide view; seed permits carry `project_id: null` and only show
 * here).
 */
export function getPermits(projectId?: string): Permit[] {
  const all = [...permits].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return projectId ? all.filter((p) => p.project_id === projectId) : all;
}

export function getPermit(id: string): Permit | undefined {
  return permits.find((p) => p.id === id);
}

export function addPermit(input: PermitInput, userEmail: string): Permit {
  const permit = createPermit(input, userEmail);
  permits = [permit, ...permits];
  return permit;
}

export function deletePermit(id: string): void {
  permits = permits.filter((p) => p.id !== id);
}

/** Advances a pending permit to the next approver; cm_maincon finalizes it. */
export function approvePermit(id: string): Permit | undefined {
  const permit = permits.find((p) => p.id === id);
  if (!permit || permit.status !== 'pending' || !permit.current_approver_role) return undefined;
  const idx = APPROVAL_PIPELINE.indexOf(permit.current_approver_role);
  const next = APPROVAL_PIPELINE[idx + 1];
  const updated: Permit = next
    ? { ...permit, current_approver_role: next, updated_at: now() }
    : { ...permit, status: 'approved', current_approver_role: null, updated_at: now() };
  permits = permits.map((p) => (p.id === id ? updated : p));
  return updated;
}

/** Rejects a pending permit (only the current approver can). */
export function rejectPermit(id: string): Permit | undefined {
  const permit = permits.find((p) => p.id === id);
  if (!permit || permit.status !== 'pending' || !permit.current_approver_role) return undefined;
  const updated: Permit = { ...permit, status: 'rejected', current_approver_role: null, updated_at: now() };
  permits = permits.map((p) => (p.id === id ? updated : p));
  return updated;
}

export function permitCount(): number {
  return permits.length;
}
