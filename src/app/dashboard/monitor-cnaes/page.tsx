"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Radar } from "lucide-react";
export default function MonitorCnaes(){
  const router=useRouter();const sb=supabaseBrowser();const [rows,setRows]=useState<any[]>([]);const [c,setC]=useState(true);
  useEffect(()=>{(async()=>{const {data:{user}}=await sb.auth.getUser();if(!user){router.push("/login");return;}const {data:u}=await sb.from("usuarios").select("empresa_id").eq("id",user.id).maybeSingle();if(!u){router.push("/onboarding");return;}const {data}=await sb.from("escopos_sindicais").select("id,nome,cnaes_principais,total_empresas").order("created_at",{ascending:false});setRows(data??[]);setC(false);})();},[]);
  return (<div className="mx-auto max-w-5xl px-6 py-8"><h1 className="font-display text-2xl font-bold text-ink-100">Monitor de CNAEs</h1><p className="mt-1 text-ink-300">Acompanhe novas empresas abertas nos CNAEs de interesse. Cada escopo é um monitor — abra e sincronize para buscar as mais recentes na Receita.</p>
    <div className="mt-6 space-y-3">{c&&<p className="text-ink-500">Carregando…</p>}{!c&&rows.length===0&&<p className="text-ink-500">Nenhum escopo. Crie em Bases / Listas.</p>}
      {rows.map(r=>(<Link key={r.id} href={`/dashboard/escopos/${r.id}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-recover-500/50"><div className="flex items-center gap-3"><Radar className="text-recover-400" size={20}/><div><div className="font-display font-medium text-ink-100">{r.nome}</div><div className="text-xs text-ink-500">CNAE: {(r.cnaes_principais||[]).join(", ")||"—"}</div></div></div><span className="text-sm text-ink-500">{r.total_empresas} empresas</span></Link>))}</div></div>);
}
