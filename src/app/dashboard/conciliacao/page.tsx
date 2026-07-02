"use client";
import { useState } from "react";
function brl(n:number){return (n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
export default function Conciliacao(){
  const [linhas,setLinhas]=useState<any[]>([]);const [nome,setNome]=useState("");
  function ler(e:any){const file=e.target.files?.[0];if(!file)return;setNome(file.name);const r=new FileReader();
    r.onload=()=>{const txt=String(r.result||"");const rows=txt.split(/\r?\n/).filter(Boolean).map(l=>l.split(/[;,\t]/));setLinhas(rows.slice(0,200));};r.readAsText(file,"latin1");}
  const total=linhas.length;
  return (<div className="mx-auto max-w-5xl px-6 py-8"><h1 className="font-display text-2xl font-bold text-ink-100">Conciliação Bancária</h1><p className="mt-1 text-ink-300">Importe um extrato (CSV/OFX exportado como CSV) para visualizar as transações. O casamento automático com cobranças entra no próximo lote.</p>
    <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[0.02] py-12 text-center hover:border-recover-500/50"><span className="text-ink-300">Clique para selecionar o arquivo do extrato</span><span className="mt-1 text-xs text-ink-500">{nome||"CSV separado por ; , ou tab"}</span><input type="file" accept=".csv,.txt,.ofx" className="hidden" onChange={ler}/></label>
    {total>0&&(<div className="mt-6"><div className="mb-2 text-sm text-ink-300">{total} linhas lidas de <b>{nome}</b></div><div className="overflow-hidden rounded-2xl border border-white/10"><table className="w-full text-sm"><tbody>{linhas.map((l,i)=>(<tr key={i} className="border-t border-white/5">{l.slice(0,5).map((cel:string,j:number)=>(<td key={j} className="px-3 py-2 text-ink-300">{cel}</td>))}</tr>))}</tbody></table></div></div>)}
  </div>);
}
