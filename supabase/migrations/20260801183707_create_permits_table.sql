/*
# Create permits table for ERP permit management

1. New Tables
- `permits`
  - `id` (uuid, primary key) — unique permit identifier
  - `permit_number` (text, unique) — human-readable permit ID (e.g. PMT-2024-0001)
  - `department` (text, not null) — nama departemen
  - `contractor_name` (text, not null) — nama kontraktor
  - `address_1` (text, not null) — alamat baris 1
  - `address_2` (text) — alamat baris 2 (opsional)
  - `city` (text, not null) — kota
  - `province` (text, not null) — provinsi
  - `project` (text, not null) — nama proyek
  - `status` (text, not null, default 'pending') — status permit (pending/approved/rejected)
  - `user_id` (uuid, not null, defaults to authenticated user) — owner
  - `user_email` (text, not null) — email pemohon (untuk tampilan)
  - `created_at` (timestamptz, default now()) — tanggal pengajuan
  - `updated_at` (timestamptz, default now()) — tanggal update terakhir

2. Security
- Enable RLS on `permits`.
- Owner-scoped CRUD: each authenticated user can only access rows they own.
- `user_id` defaults to `auth.uid()` so inserts that omit it still succeed.

3. Notes
- A trigger updates `updated_at` automatically on row change.
- An index on `user_id` speeds up owner-scoped queries.
*/

CREATE TABLE IF NOT EXISTS permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_number text UNIQUE NOT NULL,
  department text NOT NULL,
  contractor_name text NOT NULL,
  address_1 text NOT NULL,
  address_2 text,
  city text NOT NULL,
  province text NOT NULL,
  project text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE permits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_permits" ON permits;
CREATE POLICY "select_own_permits" ON permits FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_permits" ON permits;
CREATE POLICY "insert_own_permits" ON permits FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_permits" ON permits;
CREATE POLICY "update_own_permits" ON permits FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_permits" ON permits;
CREATE POLICY "delete_own_permits" ON permits FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_permits_user_id ON permits(user_id);
CREATE INDEX IF NOT EXISTS idx_permits_created_at ON permits(created_at DESC);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_permits_updated_at ON permits;
CREATE TRIGGER trg_permits_updated_at
  BEFORE UPDATE ON permits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
