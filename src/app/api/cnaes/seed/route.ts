import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ erro: "nao autenticado" }, { status: 401 });
  try {
    const r = await fetch("https://servicodados.ibge.gov.br/api/v2/cnae/subclasses", { cache: "no-store" });
    if (!r.ok) throw new Error("IBGE indisponivel");
    const lista: any[] = await r.json();
    const rows = lista.map((s) => ({
      codigo: String(s.id).replace(/\D/g, ""),
      descricao: s.descricao,
      secao: s?.classe?.grupo?.divisao?.secao?.id ?? null,
      secao_descricao: s?.classe?.grupo?.divisao?.secao?.descricao ?? null,
    }));
    const admin = supabaseAdmin();
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await admin.from("cnaes").upsert(rows.slice(i, i + 500), { onConflict: "codigo" });
      if (error) throw error;
    }
    return NextResponse.json({ ok: true, total: rows.length });
  } catch (e: any) {
    return NextResponse.json({ erro: String(e?.message ?? e) }, { status: 502 });
  }
}

export async function GET() {
  const sb = supabaseServer();
  const { count } = await sb.from("cnaes").select("*", { count: "exact", head: true });
  return NextResponse.json({ total: count ?? 0 });
}
