"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
export default function GerarLote({escopoId}:{escopoId:string}){
  const router=useRouter();const sb=supabaseBrowser();const [aberto,setAberto]=useState(false);const [convs,setConvs]=useState<any[]>([]);const [convId,setConvId]=useState("");const [venc,setVenc]=useState("");const [loading,setLoading]=useState(false);const [msg,setMsg]=useState<string|null>(null);
  useEffect(()=>{(async()=>{const {data}=await sb.from("convencao_coletiva").select("id,nome,ano_vigencia").order("created_at",{ascending:false});setConvs(data??[]);if(data?.[0])setConvId(data[0].id);})();},[]);
  async function gerar(){if(!convId){setMsg("Crie uma convenção primeiro.");return;}setLoading(true);setMsg(null);
    try{const r=await fetch(`/api/escopos/${escopoId}/gerar-cobrancas`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({convencao_id:convId,vencimento:venc||undefined})});const d=await r.json();if(!r.ok)throw new Error(d?.erro||"falha");setMsg(`${d.geradas} cobranças · total ${(d.total||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`);router.refresh();}catch(e:any){setMsg("Erro: "+e.message);}finally{setLoading(false);}}
  const I="rounded-lg border border-white/10 bg-navy-900 px-3 py-2 text-ink-100 outline-none focus:border-recover-500";
  return (<div className="relative"><button onClick={()=>setAberto(!aberto)} className="rounded-lg bg-navy-700 px-5 py-2.5 font-medium text-ink-100 ring-1 ring-white/15 hover:bg-navy-600">Gerar cobranças em lote</button>
    {aberto&&(<div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-white/10 bg-navy-800 p-4 shadow-xl"><label className="block text-xs text-ink-500">Convenção</label><select className={I+" mt-1 w-full"} value={convId} onChange={e=>setConvId(e.target.value)}>{convs.length===0&&<option value="">Nenhuma — crie em Convenção</option>}{convs.map(c=><option key={c.id} value={c.id}>{c.nome} {c.ano_vigencia||""}</option>)}</select><label className="mt-3 block text-xs text-ink-500">Vencimento (opcional)</label><input type="date" className={I+" mt-1 w-full"} value={venc} onChange={e=>setVenc(e.target.value)}/><button onClick={gerar} disabled={loading} className="mt-4 w-full rounded-lg bg-recover-500 px-4 py-2.5 font-medium text-navy-900 disabled:opacity-50">{loading?"Gerando…":"Gerar agora"}</button>{msg&&<p className="mt-2 text-xs text-ink-300">{msg}</p>}</div>)}</div>);
}
