"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import AddressField, { Endereco, enderecoVazio } from "@/components/address-field";

export default function EmpresaEdit() {
  const router = useRouter();
  const sb = supabaseBrowser();
  const [id, setId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [end, setEnd] = useState<Endereco>(enderecoVazio);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: u } = await sb.from("usuarios").select("empresa_id").eq("id", user.id).maybeSingle();
      if (!u) { router.push("/onboarding"); return; }
      const { data: e } = await sb.from("empresas").select("*").eq("id", u.empresa_id).single();
      if (e) {
        setId(e.id); setNome(e.nome ?? ""); setCnpj(e.cnpj ?? "");
        setTelefone(e.telefone ?? ""); setEmail(e.email ?? "");
        setEnd({
          cep: e.cep ?? "", logradouro: e.endereco ?? "", numero: e.numero ?? "",
          complemento: e.complemento ?? "", bairro: e.bairro ?? "",
          cidade: e.cidade ?? "", uf: e.estado ?? "", ibge: e.ibge ?? "",
        });
      }
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvar() {
    if (!id) return;
    setLoading(true); setMsg(null);
    const { error } = await sb.from("empresas").update({
      nome, cnpj: cnpj || null, telefone: telefone || null, email: email || null,
      cep: end.cep || null, endereco: end.logradouro || null, numero: end.numero || null,
      complemento: end.complemento || null, bairro: end.bairro || null,
      cidade: end.cidade || null, estado: end.uf || null, ibge: end.ibge || null,
    }).eq("id", id);
    setLoading(false);
    setMsg(error ? "Erro ao salvar." : "Dados salvos com sucesso.");
  }

  if (carregando) return <main className="mx-auto max-w-3xl px-6 py-10 text-ink-500">Carregando…</main>;

  const I = "mt-1 w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2.5 text-ink-100 outline-none focus:border-recover-500";
  const L = "block text-xs text-ink-500";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-ink-300 hover:text-ink-100">← Painel</Link>
      <h1 className="mt-3 font-display text-2xl font-bold">Dados do sindicato</h1>
      <p className="mt-1 text-ink-300">Cadastro usado nas cobranças. Digite o CEP para preencher o endereço automaticamente.</p>

      <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-navy-800/60 p-6">
        <div><label className={L}>Nome *</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className={I} /></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1"><label className={L}>CNPJ</label>
            <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className={I} /></div>
          <div><label className={L}>Telefone</label>
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className={I} /></div>
          <div><label className={L}>E-mail</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={I} /></div>
        </div>

        <div className="mt-2 border-t border-white/10 pt-4">
          <div className="mb-3 font-display font-medium">Endereço</div>
          <AddressField value={end} onChange={setEnd} />
        </div>

        {msg && <p className={`text-sm ${msg.includes("Erro") ? "text-danger-500" : "text-recover-400"}`}>{msg}</p>}
        <button onClick={salvar} disabled={loading || !nome}
          className="justify-self-start rounded-lg bg-recover-500 px-6 py-2.5 font-medium text-navy-900 disabled:opacity-50">
          {loading ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </main>
  );
}
