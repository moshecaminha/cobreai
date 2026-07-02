import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import { CasaDosDados, CasaDosDadosError, filtroDoEscopo, mapEmpresa } from "@/lib/casadosdados";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/escopos/:id/sync
 * Sincroniza o escopo (CNAE + estado + cidade) contra a Casa dos Dados,
 * normaliza e faz upsert em `empresas_base`. Devolve diagnóstico claro.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = supabaseServer();

  const { data: escopo, error: e1 } = await sb.from("escopos_sindicais").select("*").eq("id", params.id).single();
  if (e1 || !escopo) return NextResponse.json({ erro: "Escopo não encontrado" }, { status: 404 });

  const { data: empresa } = await sb.from("empresas").select("casadosdados_api_key").eq("id", escopo.empresa_id).single();
  const apiKey = empresa?.casadosdados_api_key;
  if (!apiKey) return NextResponse.json({ erro: "Configure a chave da Casa dos Dados na tela de Escopos." }, { status: 400 });

  // valida território/CNAE antes de gastar consulta
  const cnaes = (escopo.cnaes_principais ?? []).filter(Boolean);
  if (!cnaes.length) return NextResponse.json({ erro: "Adicione ao menos um CNAE ao escopo." }, { status: 400 });

  const filtroBase = filtroDoEscopo(escopo, 1, 100);
  const cnaeFallback = cnaes[0] ?? null;

  const admin = supabaseAdmin();
  const { data: syncRow } = await admin.from("sync_receita")
    .insert({ empresa_id: escopo.empresa_id, escopo_id: escopo.id, status: "executando" }).select().single();

  try {
    const cdd = new CasaDosDados(apiKey);
    let pagina = 1, salvas = 0, total = 0;

    for (;;) {
      const resp = await cdd.pesquisar({ ...filtroBase, pagina, limite: 100 });
      total = resp?.total ?? 0;
      const lista: any[] = resp?.cnpjs ?? [];
      if (!lista.length) break;

      const rows = lista.map((raw) => ({
        empresa_id: escopo.empresa_id,
        escopo_id: escopo.id,
        ...mapEmpresa(raw, cnaeFallback),
        dados_atualizados_at: new Date().toISOString(),
      }));
      const { error: eUp } = await admin.from("empresas_base").upsert(rows, { onConflict: "empresa_id,cnpj" });
      if (eUp) throw new Error("Erro ao gravar empresas: " + eUp.message);

      salvas += rows.length;
      if (salvas >= total || pagina >= 50) break;
      pagina++;
    }

    await admin.from("sync_receita").update({
      status: "concluido", novas_empresas: salvas, concluido_at: new Date().toISOString(),
    }).eq("id", syncRow.id);
    await admin.from("escopos_sindicais").update({
      total_empresas: salvas, ultima_sincronizacao_at: new Date().toISOString(),
    }).eq("id", escopo.id);

    const aviso = salvas === 0
      ? "A Casa dos Dados retornou 0 empresas para este filtro. Confira: CNAE correto (7 dígitos), UF e município exatamente como no cadastro (sem acento), e se a conta tem saldo."
      : null;

    return NextResponse.json({
      ok: true, novas_empresas: salvas, total,
      filtro: { cnae: filtroBase.codigo_atividade_principal, uf: filtroBase.uf, municipio: filtroBase.municipio, situacao: filtroBase.situacao_cadastral },
      aviso,
    });
  } catch (err: any) {
    const status = err instanceof CasaDosDadosError ? err.status : 502;
    const mapa: Record<number, string> = {
      400: "Filtro rejeitado pela Casa dos Dados (400). Verifique CNAE/UF/município.",
      401: "Chave da Casa dos Dados inválida (401).",
      403: "Sem saldo ou acesso negado na Casa dos Dados (403).",
    };
    const msg = (mapa[status] ? mapa[status] + " " : "") + String(err?.message ?? err);
    await admin.from("sync_receita").update({ status: "erro", erro: msg }).eq("id", syncRow.id);
    return NextResponse.json({ erro: msg, status_casadosdados: status }, { status: status === 401 || status === 403 || status === 400 ? status : 502 });
  }
}
