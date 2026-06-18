import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-800/60 p-5">
      <div className="text-xs uppercase tracking-widest text-ink-500">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-500">{hint}</div>}
    </div>
  );
}

export default async function Dashboard() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  // Sem empresa vinculada ainda → completar cadastro
  const { data: vinculo } = await sb.from("usuarios").select("empresa_id").eq("id", user.id).maybeSingle();
  if (!vinculo) redirect("/onboarding");

  // Contagens reais (respeitam RLS do tenant). Tabelas recém-criadas → zero.
  const [{ count: clientes }, { count: cobrancas }, { count: base }] = await Promise.all([
    sb.from("clientes").select("*", { count: "exact", head: true }),
    sb.from("cobrancas").select("*", { count: "exact", head: true }),
    sb.from("empresas_base").select("*", { count: "exact", head: true }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <div className="font-display text-lg tracking-tight">
            Cobre<span className="text-recover-500">.ai</span>
          </div>
          <p className="mt-1 text-sm text-ink-500">{user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="rounded-lg border border-white/15 px-4 py-2 text-sm text-ink-100 hover:bg-white/5">
            Sair
          </button>
        </form>
      </header>

      <h1 className="mt-8 font-display text-2xl font-bold">Painel</h1>
      <p className="mt-1 text-ink-300">Visão geral da sua base e cobranças.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Kpi label="Empresas na base" value={String(base ?? 0)} hint="via Receita / Casa dos Dados" />
        <Kpi label="Clientes" value={String(clientes ?? 0)} />
        <Kpi label="Cobranças" value={String(cobrancas ?? 0)} />
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
        <p className="text-ink-300">
          Próximo passo: criar um <span className="text-ink-100">escopo sindical</span> (CNAE + cidade) e rodar a primeira
          sincronização com a Receita.
        </p>
      </div>
    </main>
  );
}
