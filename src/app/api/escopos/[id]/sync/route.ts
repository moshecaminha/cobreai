import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import { CasaDosDados, filtroDoEscopo, mapEmpresa } from "@/lib/casadosdados";

/**
 * POST /api/escopos/:id/sync
 * Roda a sincronização do escopo sindical contra a Casa dos Dados,
 * normaliza e faz upsert em `empresas_base`, e registra o sync.
 *
 * Segurança: a leitura do escopo passa pela sessão do usuário (RLS);
 * a escrita em massa usa o admin client (server-only).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = supabaseServer();

  // 1) autentica + lê o escopo respeitando RLS (só do próprio tenant)
  const { data: escopo, error: e1 } = await sb
    .from("escopos_sindicais")
    .select("*")
    .eq("id", params.id)
    .single();
  if (e1 || !escopo) return NextResponse.json({ erro: "Escopo não encontrado" }, { status: 404 });

  // 2) chave da Casa dos Dados do tenant
  const { data: empresa } = await sb
    .from("empresas")
    .select("casadosdados_api_key")
    .eq("id", escopo.empresa_id)
    .single();
  const apiKey = empresa?.casadosdados_api_key;
  if (!apiKey) return NextResponse.json({ erro: "Configure a chave Casa dos Dados" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: syncRow } = await admin
    .from("sync_receita")
    .insert({ empresa_id: escopo.empresa_id, escopo_id: escopo.id, status: "executando" })
    .select()
    .single();

  try {
    const cdd = new CasaDosDados(apiKey);
    let pagina = 1, novas = 0;
    // paginação simples (limite por requisição)
    for (;;) {
      const resp = await cdd.pesquisar(filtroDoEscopo(escopo, pagina, 100));
      const lista: any[] = resp?.cnpjs ?? resp?.data ?? resp?.empresas ?? [];
      if (!lista.length) break;

      const rows = lista.map((raw) => ({
        empresa_id: escopo.empresa_id,
        escopo_id: escopo.id,
        ...mapEmpresa(raw),
        dados_atualizados_at: new Date().toISOString(),
      }));

      const { error: eUp } = await admin
        .from("empresas_base")
        .upsert(rows, { onConflict: "empresa_id,cnpj" });
      if (eUp) throw eUp;

      novas += rows.length;
      if (lista.length < 100 || pagina >= 50) break; // teto de segurança
      pagina++;
    }

    await admin.from("sync_receita")
      .update({ status: "concluido", novas_empresas: novas, concluido_at: new Date().toISOString() })
      .eq("id", syncRow.id);
    await admin.from("escopos_sindicais")
      .update({ total_empresas: novas, ultima_sincronizacao_at: new Date().toISOString() })
      .eq("id", escopo.id);

    return NextResponse.json({ ok: true, novas_empresas: novas });
  } catch (err: any) {
    await admin.from("sync_receita")
      .update({ status: "erro", erro: String(err?.message ?? err) })
      .eq("id", syncRow.id);
    return NextResponse.json({ erro: String(err?.message ?? err) }, { status: 502 });
  }
}
