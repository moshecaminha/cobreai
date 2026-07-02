import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-800/60 p-5">
      <div className="text-xs uppercase tracking-widest text-ink-500">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold text-ink-100">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-500">{hint}</div>}
    </div>
  );
}

export default async function Dashboard() {
  const sb = supabaseServer();
  const [{ count: clientes }, { count: cobrancas }, { count: base }] = await Promise.all([
    sb.from("clientes").select("*", { count: "exact", head: true }),
    sb.from("cobrancas").select("*", { count: "exact", head: true }),
    sb.from("empresas_base").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold text-ink-100">Painel</h1>
      <p className="mt-1 text-ink-300">Visão geral da sua base e cobranças.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Kpi label="Empresas na base" value={String(base ?? 0)} hint="via Receita / Casa dos Dados" />
        <Kpi label="Clientes" value={String(clientes ?? 0)} />
        <Kpi label="Cobranças" value={String(cobrancas ?? 0)} />
      </div>

      <a href="/dashboard/escopos" className="mt-8 block rounded-2xl border border-white/15 bg-white/[0.03] p-8 text-center transition hover:border-recover-500/50">
        <p className="text-ink-300">
          Comece criando um <span className="text-recover-400 font-medium">escopo sindical</span> (CNAE + cidade) e sincronize a base com a Receita.
        </p>
      </a>
    </div>
  );
}
