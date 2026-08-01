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
  status: 'pending' | 'approved' | 'rejected';
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
    status: 'pending',
    user_id: 'mock-user-001',
    user_email: userEmail,
    created_at: ts,
    updated_at: ts,
  };
}

// Seed with sample data so the dashboard isn't empty
const SEED: Permit[] = [
  createPermit(
    { department: 'Engineering', contractor_name: 'PT. Karya Bangun Persada', address_1: 'Jl. Sudirman No. 12', city: 'Jakarta', province: 'DKI Jakarta', project: 'Pembangunan Jembatan Surabaya' },
    'admin@example.com',
  ),
  createPermit(
    { department: 'Construction', contractor_name: 'PT. Mitra Konstruksi', address_1: 'Jl. Gatot Subroto No. 55', address_2: 'Gedung B Lt. 3', city: 'Bandung', province: 'Jawa Barat', project: 'Revitalisasi Kantor Pusat' },
    'admin@example.com',
  ),
  createPermit(
    { department: 'Environmental', contractor_name: 'CV. Hijau Lestari', address_1: 'Jl. Pahlawan No. 8', city: 'Surabaya', province: 'Jawa Timur', project: 'Instalasi Pengolahan Limbah' },
    'admin@example.com',
  ),
  createPermit(
    { department: 'Health & Safety', contractor_name: 'PT. Safety First Indonesia', address_1: 'Jl. Asia Afrika No. 10', city: 'Yogyakarta', province: 'DI Yogyakarta', project: 'Audit K3 Fasilitas Produksi' },
    'admin@example.com',
  ),
];

// Approve one for variety
SEED[1].status = 'approved';
SEED[2].status = 'rejected';

let permits: Permit[] = [...SEED];

// ── CRUD helpers (mirror Supabase query style) ───────────────

export function getPermits(): Permit[] {
  return [...permits].sort((a, b) => b.created_at.localeCompare(a.created_at));
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

export function permitCount(): number {
  return permits.length;
}
