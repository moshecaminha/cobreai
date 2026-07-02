import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
export const dynamic="force-dynamic";
// Cria movimentações de receita para cobranças pagas ainda não lançadas
export async function POST(){
  const sb=supabaseServer();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({erro:"nao autenticado"},{status:401});
  const {data:u}=await sb.from("usuarios").select("empresa_id").eq("id",user.id).maybeSingle();if(!u)return NextResponse.json({erro:"sem empresa"},{status:400});
  const {data:pagas}=await sb.from("cobrancas").select("id,valor,descricao,updated_at").eq("status","pago");
  const {data:jaLancadas}=await sb.from("movimentacoes").select("cobranca_id").not("cobranca_id","is",null);
  const set=new Set((jaLancadas??[]).map(m=>m.cobranca_id));
  let criadas=0;
  for(const c of pagas??[]){ if(set.has(c.id))continue;
    const {error}=await sb.from("movimentacoes").insert({empresa_id:u.empresa_id,tipo:"receita",categoria:"cobranca",descricao:c.descricao||"Recebimento de cobrança",valor:c.valor,data_movimentacao:(c.updated_at||new Date().toISOString()).slice(0,10),cobranca_id:c.id});
    if(!error)criadas++; }
  return NextResponse.json({ok:true,criadas});
}
