"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
function brl(n:number){return (n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
export default function Relatorios(){
  const router=useRouter();const sb=supabaseBrowser();const [cob,setCob]=useState<any[]>([]);const [c,setC]=useState(true);
  useEffect(()=>{(async()=>{const {data:{user}}=await sb.auth.getUser();if(!user){router.push("/login");return;}const {data:u}=await sb.from("usuarios").select("empresa_id").eq("id",user.id).maybeSingle();if(!u){router.push("/onboarding");return;}const {data}=await sb.from("cobrancas").select("valor,status,vencimento_date").limit(2000);setCob(data??[]);setC(false);})();},[]);
  const por=(s:string)=>cob.filter(r=>r.status===s);
  const tot=(a:any[])=>a.reduce((s,r)=>s+(r.valor||0),0);
  const emitido=tot(cob);const recebido=tot(por("pago"));const taxa=emitido>0?(recebido/emitido*100):0;
  const hoje=new Date().toISOString().slice(0,10);
  const vencidoAberto=cob.filter(r=>(r.status==="pendente"||r.status==="vencido")&&r.vencimento_date&&r.vencimento_date<hoje);
  if(c)return <div className="px-6 py-8 text-ink-500">Carregando…</div>;
  const status=[["pendente","Pendente","text-amber-500"],["pago","Pago","text-recover-400"],["vencido","Vencido","text-danger-500"],["cancelado","Cancelado","text-ink-500"]];
  return (<div className="mx-auto max-w-5xl px-6 py-8"><h1 className="font-display text-2xl font-bold text-ink-100">Relatórios</h1><p className="mt-1 text-ink-300">Visão consolidada de cobranças.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-navy-800/60 p-5"><div className="text-xs uppercase tracking-widest text-ink-500">Total emitido</div><div className="mt-2 font-display text-2xl font-bold text-ink-100">{brl(emitido)}</div></div><div className="rounded-xl border border-white/10 bg-navy-800/60 p-5"><div className="text-xs uppercase tracking-widest text-ink-500">Recebido</div><div className="mt-2 font-display text-2xl font-bold text-recover-400">{brl(recebido)}</div></div><div className="rounded-xl border border-white/10 bg-navy-800/60 p-5"><div className="text-xs uppercase tracking-widest text-ink-500">Taxa de recuperação</div><div className="mt-2 font-display text-2xl font-bold text-ink-100">{taxa.toFixed(1)}%</div></div></div>
    <div className="mt-6 rounded-2xl border border-white/10 bg-navy-800/60 p-6"><div className="font-display font-medium text-ink-100">Cobranças por status</div><div className="mt-4 space-y-3">{status.map(([k,label,cor])=>{const arr=por(k as string);const pct=cob.length?arr.length/cob.length*100:0;return(<div key={k}><div className="flex justify-between text-sm"><span className={cor as string}>{label} ({arr.length})</span><span className="text-ink-300">{brl(tot(arr))}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-recover-500" style={{width:`${pct}%`}}/></div></div>);})}</div></div>
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="text-sm text-ink-300">Vencido em aberto: <b className="text-danger-500">{brl(tot(vencidoAberto))}</b> em {vencidoAberto.length} cobranças.</div></div>
  </div>);
}
