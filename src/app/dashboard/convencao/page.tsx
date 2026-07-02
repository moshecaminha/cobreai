"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Plus, Pencil, Trash2, X } from "lucide-react";
function brl(n:number){return (n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
export default function Convencao(){
  const router=useRouter();const sb=supabaseBrowser();
  const [empresaId,setEmpresaId]=useState<string|null>(null);const [rows,setRows]=useState<any[]>([]);const [form,setForm]=useState<any|undefined>(undefined);
  async function carregar(){const {data:{user}}=await sb.auth.getUser();if(!user){router.push("/login");return;}
    const {data:u}=await sb.from("usuarios").select("empresa_id").eq("id",user.id).maybeSingle();if(!u){router.push("/onboarding");return;}setEmpresaId(u.empresa_id);
    const {data}=await sb.from("convencao_coletiva").select("*").order("created_at",{ascending:false});setRows(data??[]);}
  useEffect(()=>{carregar();},[]);
  async function salvar(){if(!empresaId||!form?.nome)return;
    const p={empresa_id:empresaId,nome:form.nome,ano_vigencia:Number(form.ano_vigencia)||null,valor_base:Number(form.valor_base)||0,valor_por_funcionario:Number(form.valor_por_funcionario)||0,valor_minimo:form.valor_minimo?Number(form.valor_minimo):null,valor_maximo:form.valor_maximo?Number(form.valor_maximo):null,data_vencimento_date:form.data_vencimento_date||null,is_ativo:true};
    const q=form.id?sb.from("convencao_coletiva").update(p).eq("id",form.id):sb.from("convencao_coletiva").insert(p);const {error}=await q;if(!error){setForm(undefined);carregar();}}
  async function excluir(id:string){if(!confirm("Excluir?"))return;await sb.from("convencao_coletiva").delete().eq("id",id);carregar();}
  const I="mt-1 w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2.5 text-ink-100 outline-none focus:border-recover-500";const L="block text-xs text-ink-500";
  return (<div className="mx-auto max-w-5xl px-6 py-8">
    <div className="flex items-center justify-between"><div><h1 className="font-display text-2xl font-bold text-ink-100">Convenção Coletiva</h1><p className="mt-1 text-ink-300">Regras de cálculo da contribuição.</p></div>
      <button onClick={()=>setForm({})} className="inline-flex items-center gap-2 rounded-lg bg-recover-500 px-4 py-2.5 font-medium text-navy-900 hover:bg-recover-400"><Plus size={18}/> Nova convenção</button></div>
    <div className="mt-6 space-y-3">{rows.length===0&&<p className="text-ink-500">Nenhuma convenção. Crie uma para a cobrança em lote.</p>}
      {rows.map(r=>(<div key={r.id} className="rounded-xl border border-white/10 bg-navy-800/60 p-5"><div className="flex items-start justify-between">
        <div><div className="font-display font-medium text-ink-100">{r.nome} <span className="text-ink-500">· {r.ano_vigencia||"—"}</span></div>
          <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-ink-300 sm:grid-cols-4"><span>Base: <b className="text-ink-100">{brl(r.valor_base)}</b></span><span>Por func.: <b className="text-recover-400">{brl(r.valor_por_funcionario)}</b></span><span>Mín: {r.valor_minimo?brl(r.valor_minimo):"—"}</span><span>Máx: {r.valor_maximo?brl(r.valor_maximo):"—"}</span></div></div>
        <div className="flex gap-2"><button onClick={()=>setForm(r)} className="text-ink-500 hover:text-recover-400"><Pencil size={16}/></button><button onClick={()=>excluir(r.id)} className="text-ink-500 hover:text-danger-500"><Trash2 size={16}/></button></div></div></div>))}</div>
    {form!==undefined&&(<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4"><div className="my-8 w-full max-w-lg rounded-2xl border border-white/10 bg-navy-800 p-6">
      <div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold text-ink-100">{form.id?"Editar":"Nova"} convenção</h2><button onClick={()=>setForm(undefined)} className="text-ink-500 hover:text-ink-100"><X size={20}/></button></div>
      <div className="mt-5 grid gap-4"><div className="grid grid-cols-2 gap-4"><div><label className={L}>Nome *</label><input className={I} value={form.nome||""} onChange={e=>setForm({...form,nome:e.target.value})}/></div><div><label className={L}>Ano vigência</label><input className={I} value={form.ano_vigencia||""} onChange={e=>setForm({...form,ano_vigencia:e.target.value})}/></div></div>
        <div className="grid grid-cols-2 gap-4"><div><label className={L}>Valor base (R$)</label><input className={I} value={form.valor_base||""} onChange={e=>setForm({...form,valor_base:e.target.value})}/></div><div><label className={L}>Por funcionário (R$)</label><input className={I} value={form.valor_por_funcionario||""} onChange={e=>setForm({...form,valor_por_funcionario:e.target.value})}/></div></div>
        <div className="grid grid-cols-3 gap-4"><div><label className={L}>Mínimo</label><input className={I} value={form.valor_minimo||""} onChange={e=>setForm({...form,valor_minimo:e.target.value})}/></div><div><label className={L}>Máximo</label><input className={I} value={form.valor_maximo||""} onChange={e=>setForm({...form,valor_maximo:e.target.value})}/></div><div><label className={L}>Vencimento</label><input type="date" className={I} value={form.data_vencimento_date||""} onChange={e=>setForm({...form,data_vencimento_date:e.target.value})}/></div></div>
        <div className="flex justify-end gap-2"><button onClick={()=>setForm(undefined)} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-ink-100 hover:bg-white/5">Cancelar</button><button onClick={salvar} className="rounded-lg bg-recover-500 px-6 py-2.5 font-medium text-navy-900">Salvar</button></div></div></div></div>)}
  </div>);
}
