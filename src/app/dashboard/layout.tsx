import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import AppShell from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: u } = await sb.from("usuarios").select("empresa_id, nome").eq("id", user.id).maybeSingle();
  if (!u) redirect("/onboarding");

  const { data: emp } = await sb.from("empresas").select("nome").eq("id", u.empresa_id).maybeSingle();

  return (
    <AppShell nome={emp?.nome ?? u.nome ?? ""} email={user.email ?? ""}>
      {children}
    </AppShell>
  );
}
