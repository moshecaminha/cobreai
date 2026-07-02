"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
export default function Usuarios(){
  const router=useRouter();const sb=supabaseBrowser();const [rows,setRows]=useState<any[]>([]);const [c,setC]=useState(true);
  useEffect(()=>{(async()=>{const {data:{user}}=await sb.auth.getUser();if(!user){router.push("/login");return;}const {data:u}=await sb.from("usuarios").select("empresa_id").eq("id",user.id).maybeSingle();if(!u){router.push("/onboarding");return;}const {data}=await sb.from("usuarios").select("*").order("created_at");setRows(data??[]);setC(false);})();},[]);
  return (<div className="mx-auto max-w-4xl px-6 py-8"><h1 className="font-display text-2xl font-bold text-ink-100">Usuários</h1><p className="mt-1 text-ink-300">Equipe com acesso ao sistema.</p>
    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10"><table className="w-full text-sm"><thead className="bg-white/[0.04] text-left text-ink-500"><tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">Papel</th></tr></thead>
      <tbody>{c&&<tr><td colSpan={3} className="px-4 py-8 text-center text-ink-500">Carregando…</td></tr>}{rows.map(r=>(<tr key={r.id} className="border-t border-white/5"><td className="px-4 py-3 text-ink-100">{r.nome||"—"}</td><td className="px-4 py-3 text-ink-300">{r.email||"—"}</td><td className="px-4 py-3"><span className="rounded-full bg-navy-600 px-2 py-0.5 text-xs text-ink-300">{r.papel||r.role||"membro"}</span></td></tr>))}</tbody></table></div>
    <p className="mt-4 text-xs text-ink-500">Convite de novos usuários por e-mail entra num próximo lote.</p></div>);
}
