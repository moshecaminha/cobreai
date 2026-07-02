"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import CnaePicker, { CnaeTag } from "./cnae-picker";

type Escopo = { id: string; nome: string; cnaes_principais: string[]; ufs: string[]; municipios: string[]; total_empresas: number };

export default function Escopos() {
  const router = useRouter();
  const sb = supabaseBrowser();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [temApiKey, setTemApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [cnaesCarregados, setCnaesCarregados] = useState<number | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [escopos, setEscopos] = useState<Escopo[]>([]);
  const [nome, setNome] = useState("");
  const [cnaes, setCnaes] = useState<CnaeTag[]>([]);
  const [ufs, setUfs] = useState("");
  const [municipios, setMunicipios] = useState("");
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
    try { const r = await fetch("/api/cnaes/seed"); const d = await r.json(); setCnaesCarregados(d.total ?? 0); } catch {}
  }
  useEffect(() => { carregar(); }, []);

  async function carregarCnaes() {
    setSeedLoading(true); setMsg(null);
    try {
      const r = await fetch("/api/cnaes/seed", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.erro || "falha");
      setCnaesCarregados(d.total);
      setMsg(`Catálogo de CNAEs carregado: ${d.total} atividades.`);
    } catch (e: any) { setMsg(`Erro ao carregar CNAEs: ${e.message}`); }
    finally { setSeedLoading(false); }
  }

  async function salvarApiKey() {
    if (!empresaId || !apiKey) return;
    setLoading(true);
    const { error } = await sb.from("empresas").update({ casadosdados_api_key: apiKey }).eq("id", empresaId);
    setLoading(false);
    if (!error) { setTemApiKey(true); setApiKey(""); setMsg("Chave salva."); }
  }

  async function criar() {
    if (!empresaId || !nome) return;
    setLoading(true); setMsg(null);
    const arr = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    const { error } = await sb.from("escopos_sindicais").insert({
      empresa_id: empresaId,
      nome,
      cnaes_principais: cnaes.map((c) => c.codigo),
      ufs: arr(ufs).map((x) => x.toUpperCase()),
      municipios: arr(municipios),
    });
    setLoading(false);
    if (error) { setMsg("Erro ao criar escopo."); return; }
    setNome(""); setCnaes([]); setUfs(""); setMunicipios("");
    carregar();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-ink-300 hover:text-ink-100">← Painel</Link>
      <h1 className="mt-3 font-display text-2xl font-bold">Escopos sindicais</h1>
      <p className="mt-1 text-ink-300">Defina CNAE + território. A plataforma busca essas empresas na Receita (Casa dos Dados).</p>

      {cnaesCarregados === 0 && (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="font-medium">Carregar catálogo de CNAEs</div>
          <p className="mt-1 text-sm text-ink-300">Baixe a lista oficial do IBGE uma vez para habilitar a busca por palavra.</p>
          <button onClick={carregarCnaes} disabled={seedLoading}
            className="mt-3 rounded-lg bg-recover-500 px-4 py-2 font-medium text-navy-900 disabled:opacity-50">
            {seedLoading ? "Carregando…" : "Carregar CNAEs do IBGE"}
          </button>
        </div>
      )}

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
        <div>
          <label className="block text-xs text-ink-500">Nome *</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Comércio varejista de Recife"
            className="mt-1 w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2.5 text-ink-100 outline-none focus:border-recover-500" />
        </div>
        <CnaePicker value={cnaes} onChange={setCnaes} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ink-500">UFs</label>
            <input value={ufs} onChange={(e) => setUfs(e.target.value)} placeholder="PE"
              className="mt-1 w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2.5 text-ink-100 outline-none focus:border-recover-500" />
          </div>
          <div>
            <label className="block text-xs text-ink-500">Municípios</label>
            <input value={municipios} onChange={(e) => setMunicipios(e.target.value)} placeholder="Recife, Olinda"
              className="mt-1 w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2.5 text-ink-100 outline-none focus:border-recover-500" />
          </div>
        </div>
        {msg && <p className="text-sm text-recover-400">{msg}</p>}
        <button onClick={criar} disabled={loading || !nome}
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
