import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

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
