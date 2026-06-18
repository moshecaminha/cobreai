import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cliente server-side com a sessão do usuário (respeita RLS). */
export function supabaseServer() {
  const store = cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items: { name: string; value: string; options: any }[]) =>
        items.forEach(({ name, value, options }) => {
          try { store.set(name, value, options); } catch { /* chamado fora de contexto mutável */ }
        }),
    },
  });
}

/** Service Role — IGNORA RLS. Somente em jobs de servidor (sync, webhooks). */
export function supabaseAdmin() {
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
