import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || typeof supabaseUrl !== "string" || supabaseUrl.trim() === "") {
  throw new Error(
    "Variável de ambiente VITE_SUPABASE_URL não configurada. Verifique o arquivo .env"
  );
}

if (!supabaseAnonKey || typeof supabaseAnonKey !== "string" || supabaseAnonKey.trim() === "") {
  throw new Error(
    "Variável de ambiente VITE_SUPABASE_ANON_KEY não configurada. Verifique o arquivo .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
