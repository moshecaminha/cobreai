"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Escopo = { id: string; nome: string; cnaes_principais: string[]; ufs: string[]; municipios: string[]; total_empresas: number };

export default function Escopos() {
  const router = useRouter();
  const sb = supabaseBrowser();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [temApiKey, setTemApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [escopos, setEscopos] = useState<Escopo[]>([]);
  const [f, setF] = useState({ nome: "", cnaes: "", ufs: "", municipios: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function carregar() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: u } = await sb.from("usuarios").select("empresa_id").eq("id", user.id).maybeSingle();
    if (!u) { router.push("/onboarding"); return; }
    setEmpresaId(u.empresa_id);
    const { data: emp } = await sb.from("empresas").select("casadosdados_api_key").eq("id", u.empresa_id).single();
    setTemApiKey(!!emp?.casadosdados_api_key);
    const { data: es } = await sb.from("escopos_sindicais").select("id,nome,cnaes_principais,ufs,municipios,total_empresas").order("created_at", { ascending: false });
    setEscopos(es ?? []);
  }
  useEffect(() => { carregar(); }, []);

  async function salvarApiKey() {
    if (!empresaId || !apiKey) return;
    setLoading(true);
    const { error } = await sb.from("empresas").update({ casadosdados_api_key: apiKey }).eq("id", empresaId);
    setLoading(false);
    if (!error) { setTemApiKey(true); setApiKey(""); setMsg("Chave salva."); }
  }

  async function criar() {
    if (!empresaId || !f.nome) return;
    setLoading(true); setMsg(null);
    const arr = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    const { error } = await sb.from("escopos_sindicais").insert({
      empresa_id: empresaId,
      nome: f.nome,
      cnaes_principais: arr(f.cnaes),
      ufs: arr(f.ufs).map((x) => x.toUpperCase()),
      municipios: arr(f.municipios),
    });
    setLoading(false);
    if (error) { setMsg("Erro ao criar escopo."); return; }
    setF({ nome: "", cnaes: "", ufs: "", municipios: "" });
    carregar();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-ink-300 hover:text-ink-100">← Painel</Link>
      <h1 className="mt-3 font-display text-2xl font-bold">Escopos sindicais</h1>
      <p className="mt-1 text-ink-300">Defina CNAE + território. A plataforma busca essas empresas na Receita (Casa dos Dados).</p>

      {!temApiKey && (
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5">
          <div className="font-medium text-amber-500">Configure a chave da Casa dos Dados</div>
          <p className="mt-1 text-sm text-ink-300">Sem ela, a sincronização não roda. Pegue em portal.casadosdados.com.br.</p>
          <div className="mt-3 flex gap-2">
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="api-key da Casa dos Dados"
              className="flex-1 rounded-lg border border-white/10 bg-navy-900 px-3 py-2 text-ink-100 outline-none focus:border-recover-500" />
            <button onClick={salvarApiKey} disabled={loading || !apiKey}
              className="rounded-lg bg-recover-500 px-4 py-2 font-medium text-navy-900 disabled:opacity-50">Salvar</button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-navy-800/60 p-6">
        <div className="font-display text-lg font-bold">Novo escopo</div>
        <Campo label="Nome *" v={f.nome} on={(e) => setF({ ...f, nome: e.target.value })} ph="Comércio varejista de Recife" />
        <Campo label="CNAEs principais (separe por vírgula)" v={f.cnaes} on={(e) => setF({ ...f, cnaes: e.target.value })} ph="4711301, 4712100" />
        <div className="grid grid-cols-2 gap-4">
          <Campo label="UFs" v={f.ufs} on={(e) => setF({ ...f, ufs: e.target.value })} ph="PE" />
          <Campo label="Municípios" v={f.municipios} on={(e) => setF({ ...f, municipios: e.target.value })} ph="Recife, Olinda" />
        </div>
        {msg && <p className="text-sm text-recover-400">{msg}</p>}
        <button onClick={criar} disabled={loading || !f.nome}
          className="justify-self-start rounded-lg bg-recover-500 px-5 py-2.5 font-medium text-navy-900 disabled:opacity-50">
          {loading ? "Salvando…" : "Criar escopo"}
        </button>
      </div>

      <div className="mt-8 space-y-3">
        {escopos.length === 0 && <p className="text-ink-500">Nenhum escopo ainda.</p>}
        {escopos.map((e) => (
          <Link key={e.id} href={`/dashboard/escopos/${e.id}`}
            className="block rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-recover-500/50">
            <div className="flex items-center justify-between">
              <div className="font-display font-medium">{e.nome}</div>
              <div className="text-sm text-ink-500">{e.total_empresas} empresas</div>
            </div>
            <div className="mt-1 text-sm text-ink-500">
              CNAE: {e.cnaes_principais?.join(", ") || "—"} · {e.municipios?.join(", ") || e.ufs?.join(", ") || "—"}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

function Campo({ label, v, on, ph }: { label: string; v: string; on: (e: React.ChangeEvent<HTMLInputElement>) => void; ph?: string }) {
  return (
    <div>
      <label className="block text-xs text-ink-500">{label}</label>
      <input value={v} onChange={on} placeholder={ph}
        className="mt-1 w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2.5 text-ink-100 outline-none focus:border-recover-500" />
    </div>
  );
}
