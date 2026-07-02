"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
function brl(n:number){return (n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
export default function Pagamentos(){
  const router=useRouter();const sb=supabaseBrowser();const [rows,setRows]=useState<any[]>([]);const [c,setC]=useState(true);
  useEffect(()=>{(async()=>{const {data:{user}}=await sb.auth.getUser();if(!user){router.push("/login");return;}const {data:u}=await sb.from("usuarios").select("empresa_id").eq("id",user.id).maybeSingle();if(!u){router.push("/onboarding");return;}
    const {data}=await sb.from("pagamentos").select("*, cobrancas(numero, clientes(nome))").order("created_at",{ascending:false}).limit(500);setRows(data??[]);setC(false);})();},[]);
  const total=rows.reduce((s,r)=>s+(r.valor||0),0);
  return (<div className="mx-auto max-w-6xl px-6 py-8"><h1 className="font-display text-2xl font-bold text-ink-100">Pagamentos</h1><p className="mt-1 text-ink-300">Pagamentos confirmados.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-white/10 bg-navy-800/60 p-4"><div className="text-xs uppercase tracking-widest text-ink-500">Total recebido</div><div className="mt-2 font-display text-xl font-bold text-recover-400">{brl(total)}</div></div><div className="rounded-xl border border-white/10 bg-navy-800/60 p-4"><div className="text-xs uppercase tracking-widest text-ink-500">Qtd. pagamentos</div><div className="mt-2 font-display text-xl font-bold text-ink-100">{rows.length}</div></div></div>
    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10"><table className="w-full text-sm"><thead className="bg-white/[0.04] text-left text-ink-500"><tr><th className="px-4 py-3">Cliente / Cobrança</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3">Método</th><th className="px-4 py-3">Data</th></tr></thead>
      <tbody>{c&&<tr><td colSpan={4} className="px-4 py-8 text-center text-ink-500">Carregando…</td></tr>}{!c&&rows.length===0&&<tr><td colSpan={4} className="px-4 py-10 text-center text-ink-500">Nenhum pagamento ainda.</td></tr>}
      {rows.map(r=>(<tr key={r.id} className="border-t border-white/5"><td className="px-4 py-3"><div className="text-ink-100">{r.cobrancas?.clientes?.nome||"—"}</div><div className="text-xs text-ink-500">{r.cobrancas?.numero}</div></td><td className="px-4 py-3 text-right text-recover-400">{brl(r.valor)}</td><td className="px-4 py-3 text-ink-300">{r.metodo||"—"}</td><td className="px-4 py-3 text-ink-500">{r.created_at?new Date(r.created_at).toLocaleDateString("pt-BR"):"—"}</td></tr>))}</tbody></table></div></div>);
}
