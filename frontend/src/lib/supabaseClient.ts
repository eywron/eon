import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const fallbackUrl = "https://example.supabase.co";
const fallbackKey = "public-anon-key";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
	supabaseUrl || fallbackUrl,
	supabaseAnonKey || fallbackKey
);
