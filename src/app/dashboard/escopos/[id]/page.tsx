import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import SyncButton from "./sync-button";

export const dynamic = "force-dynamic";

export default async function EscopoDetalhe({ params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: escopo } = await sb.from("escopos_sindicais").select("*").eq("id", params.id).maybeSingle();
  if (!escopo) redirect("/dashboard/escopos");

  const { data: empresas } = await sb
    .from("empresas_base")
    .select("cnpj,razao_social,nome_fantasia,cnae_principal,cidade,estado,situacao_cadastral")
    .eq("escopo_id", params.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/dashboard/escopos" className="text-sm text-ink-300 hover:text-ink-100">← Escopos</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{escopo.nome}</h1>
          <p className="mt-1 text-sm text-ink-500">
            CNAE: {escopo.cnaes_principais?.join(", ") || "—"} · {escopo.municipios?.join(", ") || escopo.ufs?.join(", ") || "—"}
          </p>
        </div>
        <SyncButton id={params.id} />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-left text-ink-500">
            <tr>
              <th className="px-4 py-3">CNPJ</th>
              <th className="px-4 py-3">Razão social</th>
              <th className="px-4 py-3">CNAE</th>
              <th className="px-4 py-3">Cidade</th>
              <th className="px-4 py-3">Situação</th>
            </tr>
          </thead>
          <tbody>
            {(empresas ?? []).map((e) => (
              <tr key={e.cnpj} className="border-t border-white/5">
                <td className="px-4 py-3 text-ink-300">{e.cnpj}</td>
                <td className="px-4 py-3">{e.razao_social || e.nome_fantasia || "—"}</td>
                <td className="px-4 py-3 text-ink-500">{e.cnae_principal || "—"}</td>
                <td className="px-4 py-3 text-ink-500">{e.cidade || "—"}/{e.estado || ""}</td>
                <td className="px-4 py-3 text-ink-500">{e.situacao_cadastral || "—"}</td>
              </tr>
            ))}
            {(!empresas || empresas.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                Nenhuma empresa ainda. Clique em “Sincronizar com a Receita”.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
