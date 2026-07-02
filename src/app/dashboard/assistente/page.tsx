"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import CnaePicker, { CnaeTag } from "../escopos/cnae-picker";
import { Check } from "lucide-react";

export default function Assistente(){
  const router=useRouter();const sb=supabaseBrowser();const [empresaId,setEmpresaId]=useState<string|null>(null);
  const [passo,setPasso]=useState(1);const [msg,setMsg]=useState<string|null>(null);const [loading,setLoading]=useState(false);
  const [cnaes,setCnaes]=useState<CnaeTag[]>([]);const [nomeEscopo,setNomeEscopo]=useState("");const [ufs,setUfs]=useState("");const [municipios,setMunicipios]=useState("");
  const [conv,setConv]=useState<any>({nome:"",ano_vigencia:new Date().getFullYear(),valor_base:"",valor_por_funcionario:""});
  const [boasVindas,setBoasVindas]=useState("Olá {{cliente_nome}}! Somos o {{empresa_nome}}. Em breve enviaremos sua contribuição.");
  const [reguaDias,setReguaDias]=useState("-3,0,3,7");

  useEffect(()=>{(async()=>{const {data:{user}}=await sb.auth.getUser();if(!user){router.push("/login");return;}const {data:u}=await sb.from("usuarios").select("empresa_id").eq("id",user.id).maybeSingle();if(!u){router.push("/onboarding");return;}setEmpresaId(u.empresa_id);})();},[]);

  async function finalizar(){
    if(!empresaId)return;setLoading(true);setMsg(null);
    try{
      const arr=(s:string)=>s.split(/[,\n]/).map(x=>x.trim()).filter(Boolean);
      await sb.from("escopos_sindicais").insert({empresa_id:empresaId,nome:nomeEscopo||"Meu escopo",cnaes_principais:cnaes.map(c=>c.codigo),ufs:arr(ufs).map(x=>x.toUpperCase()),municipios:arr(municipios)});
      if(conv.nome)await sb.from("convencao_coletiva").insert({empresa_id:empresaId,nome:conv.nome,ano_vigencia:Number(conv.ano_vigencia)||null,valor_base:Number(conv.valor_base)||0,valor_por_funcionario:Number(conv.valor_por_funcionario)||0,is_ativo:true});
      if(boasVindas.trim())await sb.from("templates_mensagem").insert({empresa_id:empresaId,nome:"Boas-vindas",tipo:"boas_vindas",conteudo:boasVindas,is_ativo:true});
      const dias=arr(reguaDias).map(Number);
      for(const d of dias)await sb.from("regua_cobranca").insert({empresa_id:empresaId,nome:d<0?`Lembrete ${Math.abs(d)}d antes`:d===0?"No vencimento":`Cobrança ${d}d após`,dias_offset:d,enviar_whatsapp:true,is_ativo:true});
      setPasso(5);
    }catch(e:any){setMsg("Erro: "+e.message);}finally{setLoading(false);}
  }
  const I="mt-1 w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2.5 text-ink-100 outline-none focus:border-recover-500";const L="block text-xs text-ink-500";
  const Passos=["CNAEs de interesse","Convenção","Boas-vindas","Régua"];
  return (<div className="mx-auto max-w-2xl px-6 py-8"><h1 className="font-display text-2xl font-bold text-ink-100">Assistente de Configuração</h1><p className="mt-1 text-ink-300">Configure seu sindicato em poucos passos.</p>
    <div className="mt-6 flex gap-2">{Passos.map((p,i)=>(<div key={i} className={`flex-1 rounded-full px-2 py-1 text-center text-xs ${passo>i+1?"bg-recover-500 text-navy-900":passo===i+1?"bg-navy-600 text-ink-100":"bg-white/5 text-ink-500"}`}>{p}</div>))}</div>
    <div className="mt-6 rounded-2xl border border-white/10 bg-navy-800/60 p-6">
      {passo===1&&(<div className="grid gap-4"><div><label className={L}>Nome do escopo</label><input className={I} placeholder="Comércio de Recife" value={nomeEscopo} onChange={e=>setNomeEscopo(e.target.value)}/></div><CnaePicker value={cnaes} onChange={setCnaes}/><div className="grid grid-cols-2 gap-4"><div><label className={L}>UFs</label><input className={I} placeholder="PE" value={ufs} onChange={e=>setUfs(e.target.value)}/></div><div><label className={L}>Municípios</label><input className={I} placeholder="Recife" value={municipios} onChange={e=>setMunicipios(e.target.value)}/></div></div></div>)}
      {passo===2&&(<div className="grid gap-4"><div className="grid grid-cols-2 gap-4"><div><label className={L}>Nome da convenção</label><input className={I} value={conv.nome} onChange={e=>setConv({...conv,nome:e.target.value})}/></div><div><label className={L}>Ano</label><input className={I} value={conv.ano_vigencia} onChange={e=>setConv({...conv,ano_vigencia:e.target.value})}/></div></div><div className="grid grid-cols-2 gap-4"><div><label className={L}>Valor base (R$)</label><input className={I} value={conv.valor_base} onChange={e=>setConv({...conv,valor_base:e.target.value})}/></div><div><label className={L}>Por funcionário (R$)</label><input className={I} value={conv.valor_por_funcionario} onChange={e=>setConv({...conv,valor_por_funcionario:e.target.value})}/></div></div></div>)}
      {passo===3&&(<div><label className={L}>Mensagem de boas-vindas</label><textarea className={I} rows={5} value={boasVindas} onChange={e=>setBoasVindas(e.target.value)}/></div>)}
      {passo===4&&(<div><label className={L}>Régua — dias separados por vírgula (negativo = antes)</label><input className={I} value={reguaDias} onChange={e=>setReguaDias(e.target.value)}/><p className="mt-2 text-xs text-ink-500">Ex.: -3, 0, 3, 7 cria lembretes 3 dias antes, no vencimento, 3 e 7 dias depois.</p></div>)}
      {passo===5&&(<div className="flex flex-col items-center py-8 text-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-recover-500 text-navy-900"><Check size={28}/></span><p className="mt-4 font-display text-lg text-ink-100">Configuração concluída!</p><p className="mt-1 text-sm text-ink-500">Escopo, convenção, template e régua criados.</p><a href="/dashboard/escopos" className="mt-4 rounded-lg bg-recover-500 px-5 py-2.5 font-medium text-navy-900">Ir para Bases / Listas</a></div>)}
      {msg&&<p className="mt-4 text-sm text-danger-500">{msg}</p>}
      {passo<5&&(<div className="mt-6 flex justify-between"><button onClick={()=>setPasso(Math.max(1,passo-1))} disabled={passo===1} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-ink-100 hover:bg-white/5 disabled:opacity-40">Voltar</button>
        {passo<4?<button onClick={()=>setPasso(passo+1)} className="rounded-lg bg-recover-500 px-6 py-2.5 font-medium text-navy-900">Próximo</button>:<button onClick={finalizar} disabled={loading} className="rounded-lg bg-recover-500 px-6 py-2.5 font-medium text-navy-900 disabled:opacity-50">{loading?"Criando…":"Concluir"}</button>}</div>)}
    </div></div>);
}
