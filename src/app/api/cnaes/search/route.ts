import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ itens: [] });
  const sb = supabaseServer();
  const digitos = q.replace(/\D/g, "");
  const filtro = digitos.length >= 2
    ? `codigo.ilike.${digitos}%,descricao.ilike.%${q}%`
    : `descricao.ilike.%${q}%`;
  const { data } = await sb.from("cnaes").select("codigo,descricao").or(filtro).order("codigo").limit(20);
  return NextResponse.json({ itens: data ?? [] });
}
