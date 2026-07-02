"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
export default function Configuracoes(){
  const router=useRouter();const sb=supabaseBrowser();const [id,setId]=useState<string|null>(null);
  const [f,setF]=useState<any>({neg_desconto_minimo:0,neg_desconto_maximo:20,neg_parcelas_maximas:12,neg_entrada_minima_percent:0});
  const [msg,setMsg]=useState<string|null>(null);const [c,setC]=useState(true);
  useEffect(()=>{(async()=>{const {data:{user}}=await sb.auth.getUser();if(!user){router.push("/login");return;}
    const {data:u}=await sb.from("usuarios").select("empresa_id").eq("id",user.id).maybeSingle();if(!u){router.push("/onboarding");return;}
    const {data:e}=await sb.from("empresas").select("id,neg_desconto_minimo,neg_desconto_maximo,neg_parcelas_maximas,neg_entrada_minima_percent").eq("id",u.empresa_id).single();if(e){setId(e.id);setF(e);}setC(false);})();},[]);
  async function salvar(){if(!id)return;setMsg(null);const {error}=await sb.from("empresas").update({neg_desconto_minimo:Number(f.neg_desconto_minimo)||0,neg_desconto_maximo:Number(f.neg_desconto_maximo)||0,neg_parcelas_maximas:Number(f.neg_parcelas_maximas)||1,neg_entrada_minima_percent:Number(f.neg_entrada_minima_percent)||0}).eq("id",id);setMsg(error?"Erro ao salvar.":"Configurações salvas.");}
  if(c)return <div className="px-6 py-8 text-ink-500">Carregando…</div>;
  const S=({label,val,set,min,max,suf}:any)=>(<div className="rounded-xl border border-white/10 bg-navy-800/60 p-5"><div className="flex items-center justify-between"><span className="text-ink-100">{label}</span><span className="font-display font-bold text-recover-400">{val}{suf}</span></div><input type="range" min={min} max={max} value={val} onChange={e=>set(Number(e.target.value))} className="mt-3 w-full accent-recover-500"/></div>);
  return (<div className="mx-auto max-w-3xl px-6 py-8"><div className="flex items-center justify-between"><div><h1 className="font-display text-2xl font-bold text-ink-100">Configurações</h1><p className="mt-1 text-ink-300">Limites de negociação.</p></div><button onClick={salvar} className="rounded-lg bg-recover-500 px-6 py-2.5 font-medium text-navy-900 hover:bg-recover-400">Salvar</button></div>
    <div className="mt-6 grid gap-4"><S label="Desconto máximo" val={f.neg_desconto_maximo} set={(v:number)=>setF({...f,neg_desconto_maximo:v})} min={0} max={100} suf="%"/><S label="Desconto mínimo (piso)" val={f.neg_desconto_minimo} set={(v:number)=>setF({...f,neg_desconto_minimo:v})} min={0} max={100} suf="%"/><S label="Máximo de parcelas" val={f.neg_parcelas_maximas} set={(v:number)=>setF({...f,neg_parcelas_maximas:v})} min={1} max={36} suf="x"/><S label="Entrada mínima" val={f.neg_entrada_minima_percent} set={(v:number)=>setF({...f,neg_entrada_minima_percent:v})} min={0} max={50} suf="%"/></div>
    {msg&&<p className="mt-4 text-sm text-recover-400">{msg}</p>}</div>);
}
