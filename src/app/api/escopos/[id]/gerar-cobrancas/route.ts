import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import { estimarFuncionarios, calcularValor } from "@/lib/estimativa";
import { detectaTipo } from "@/lib/documento";
export const dynamic="force-dynamic";export const maxDuration=60;
export async function POST(req:NextRequest,{params}:{params:{id:string}}){
  const sb=supabaseServer();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({erro:"nao autenticado"},{status:401});
  const body=await req.json().catch(()=>({}));
  const {data:escopo}=await sb.from("escopos_sindicais").select("*").eq("id",params.id).maybeSingle();if(!escopo)return NextResponse.json({erro:"escopo nao encontrado"},{status:404});
  const {data:conv}=await sb.from("convencao_coletiva").select("*").eq("id",body.convencao_id).maybeSingle();if(!conv)return NextResponse.json({erro:"selecione uma convencao valida"},{status:400});
  const {data:empresas}=await sb.from("empresas_base").select("*").eq("escopo_id",params.id);if(!empresas?.length)return NextResponse.json({erro:"escopo sem empresas. sincronize primeiro."},{status:400});
  const admin=supabaseAdmin();const venc=body.vencimento||conv.data_vencimento_date||new Date(Date.now()+15*864e5).toISOString().slice(0,10);
  let geradas=0,total=0;
  for(const e of empresas){const func=estimarFuncionarios(e.porte,e.funcionarios_estimados);const valor=calcularValor(conv,func);
    let clienteId=e.cliente_id as string|null;
    if(!clienteId){const {data:cli}=await admin.from("clientes").insert({empresa_id:escopo.empresa_id,nome:e.razao_social||e.nome_fantasia||e.cnpj,documento:(e.cnpj||"").replace(/\D/g,"")||null,tipo_documento:e.cnpj?detectaTipo(e.cnpj):null,email:e.email||null,telefone:e.telefone||null,whatsapp:e.telefone||null,cidade:e.cidade||null,estado:e.estado||null,is_ativo:true}).select("id").single();clienteId=cli?.id??null;
      if(clienteId)await admin.from("empresas_base").update({is_cliente:true,cliente_id:clienteId,valor_cobranca:valor,funcionarios_estimados:func}).eq("id",e.id);}
    if(!clienteId)continue;
    const numero="COB-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
    const {error}=await admin.from("cobrancas").insert({empresa_id:escopo.empresa_id,cliente_id:clienteId,numero,descricao:`Contribuição sindical ${conv.ano_vigencia||""} - ${conv.nome}`.trim(),valor,vencimento_date:venc,status:"pendente",metodo_pagamento:"pix",convencao_id:conv.id,funcionarios_estimados:func,idempotency_key:`${escopo.id}:${clienteId}:${conv.id}:${venc}`});
    if(!error){geradas++;total+=valor;}}
  return NextResponse.json({ok:true,geradas,total});
}
