"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
function brl(n:number){return (n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
export default function Lotes(){
  const router=useRouter();const sb=supabaseBrowser();const [grupos,setGrupos]=useState<any[]>([]);const [c,setC]=useState(true);
  useEffect(()=>{(async()=>{const {data:{user}}=await sb.auth.getUser();if(!user){router.push("/login");return;}const {data:u}=await sb.from("usuarios").select("empresa_id").eq("id",user.id).maybeSingle();if(!u){router.push("/onboarding");return;}
    const {data}=await sb.from("cobrancas").select("descricao,valor,status,created_at").limit(3000);
    const map:Record<string,any>={};for(const r of data??[]){const dia=(r.created_at||"").slice(0,10);const k=`${dia}|${r.descricao||"Avulsas"}`;if(!map[k])map[k]={dia,descricao:r.descricao||"Avulsas",qtd:0,total:0,pagas:0};map[k].qtd++;map[k].total+=r.valor||0;if(r.status==="pago")map[k].pagas++;}
    setGrupos(Object.values(map).sort((a:any,b:any)=>b.dia.localeCompare(a.dia)));setC(false);})();},[]);
  return (<div className="mx-auto max-w-5xl px-6 py-8"><h1 className="font-display text-2xl font-bold text-ink-100">Lotes</h1><p className="mt-1 text-ink-300">Cobranças geradas agrupadas por lote.</p>
    <div className="mt-6 space-y-3">{c&&<p className="text-ink-500">Carregando…</p>}{!c&&grupos.length===0&&<p className="text-ink-500">Nenhum lote. Gere cobranças em lote a partir de um escopo.</p>}
      {grupos.map((g,i)=>(<div key={i} className="rounded-xl border border-white/10 bg-navy-800/60 p-5"><div className="flex items-center justify-between"><div><div className="font-display font-medium text-ink-100">{g.descricao}</div><div className="text-xs text-ink-500">{g.dia?new Date(g.dia+"T00:00:00").toLocaleDateString("pt-BR"):"—"}</div></div><div className="text-right"><div className="font-display font-bold text-ink-100">{brl(g.total)}</div><div className="text-xs text-ink-500">{g.qtd} cobranças · {g.pagas} pagas</div></div></div></div>))}</div></div>);
}
