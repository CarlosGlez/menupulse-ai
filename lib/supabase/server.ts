import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente con la clave SECRETA (omite RLS). Solo se usa dentro de Route Handlers / Server Components,
 * después de validar la entrada. Nunca importar desde un componente cliente.
 */
let admin: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

export function getAdminClient(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new Error("Supabase no está configurado (.env.local)");
  if (!admin) {
    admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
