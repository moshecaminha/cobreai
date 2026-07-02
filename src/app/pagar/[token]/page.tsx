import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabase-server";
import { gerarPixCopiaECola } from "@/lib/pix";
import CopyButton from "./copy-button";
export const dynamic="force-dynamic";
function brl(n:number){return (n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
export default async function Pagar({params}:{params:{token:string}}){
  const admin=supabaseAdmin();const {data:cob}=await admin.from("cobrancas").select("*, clientes(nome), empresas(nome, cidade, config_pix_chave)").eq("token_publico",params.token).maybeSingle();
  if(!cob)return <main className="flex min-h-screen items-center justify-center px-6"><p className="text-ink-300">Cobrança não encontrada.</p></main>;
  const emp=cob.empresas||{};const paga=cob.status==="pago";const chave=emp.config_pix_chave;let pixCode="",qr="";
  if(chave&&!paga){pixCode=gerarPixCopiaECola({chave,nome:emp.nome||"RECEBEDOR",cidade:emp.cidade||"BRASIL",valor:Number(cob.valor),txid:(cob.numero||"").replace(/[^A-Za-z0-9]/g,"").slice(0,25),descricao:cob.descricao});qr=await QRCode.toDataURL(pixCode,{margin:1,width:240});}
  return (<main className="flex min-h-screen items-center justify-center px-6 py-10"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-navy-800/60 p-8"><div className="font-display text-lg tracking-tight text-ink-100">Cobre<span className="text-recover-500">.ai</span></div><p className="mt-1 text-sm text-ink-500">{emp.nome}</p>
    <div className="mt-6 rounded-xl border border-white/10 bg-navy-900 p-5"><div className="text-xs uppercase tracking-widest text-ink-500">{cob.descricao||"Cobrança"}</div><div className="mt-1 font-display text-3xl font-bold text-ink-100">{brl(cob.valor)}</div><div className="mt-2 text-sm text-ink-300">{cob.clientes?.nome}</div><div className="text-sm text-ink-500">Vencimento: {cob.vencimento_date?new Date(cob.vencimento_date+"T00:00:00").toLocaleDateString("pt-BR"):"—"}</div></div>
    {paga?(<div className="mt-6 rounded-xl border border-recover-500/40 bg-recover-500/10 p-4 text-center text-recover-400">Pagamento confirmado ✓</div>):chave?(<div className="mt-6 text-center"><div className="mb-2 text-sm text-ink-300">Pague via PIX</div>{qr&&<img src={qr} alt="QR PIX" className="mx-auto rounded-lg bg-white p-2" width={220} height={220}/>}<div className="mt-4 break-all rounded-lg bg-navy-900 p-3 text-xs text-ink-500">{pixCode}</div><div className="mt-4"><CopyButton text={pixCode}/></div></div>):(<div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-500">Chave PIX não configurada pelo emissor.</div>)}
    <p className="mt-6 text-center text-xs text-ink-500">Pagamento seguro · COBRE.ai</p></div></main>);
}
