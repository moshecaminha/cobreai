"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function Onboarding() {
  const router = useRouter();
  const [f, setF] = useState({ nome: "", cnpj: "", cidade: "", estado: "", telefone: "", nome_usuario: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(k: keyof typeof f) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  }

  async function salvar() {
    setErro(null); setLoading(true);
    const sb = supabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setLoading(false); router.push("/login"); return; }

    const { error } = await sb.rpc("setup_empresa", {
      p_nome: f.nome, p_cnpj: f.cnpj, p_cidade: f.cidade,
      p_estado: f.estado, p_telefone: f.telefone, p_nome_usuario: f.nome_usuario,
    });
    setLoading(false);
    if (error) return setErro("Não foi possível salvar. Verifique os campos e tente de novo.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-10">
      <div className="font-display text-lg tracking-tight">
        Cobre<span className="text-recover-500">.ai</span>
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold">Complete os dados do sindicato</h1>
      <p className="mt-1 text-ink-300">Usamos isso para emitir cobranças e configurar sua base. Você ajusta depois nas configurações.</p>

      <div className="mt-7 grid gap-4">
        <Campo label="Nome do sindicato / empresa *" v={f.nome} on={set("nome")} ph="Sindicato Patronal de…" />
        <div className="grid grid-cols-2 gap-4">
          <Campo label="CNPJ" v={f.cnpj} on={set("cnpj")} ph="00.000.000/0001-00" />
          <Campo label="Telefone" v={f.telefone} on={set("telefone")} ph="(81) 99999-9999" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2"><Campo label="Cidade" v={f.cidade} on={set("cidade")} ph="Recife" /></div>
          <Campo label="UF" v={f.estado} on={set("estado")} ph="PE" />
        </div>
        <Campo label="Seu nome" v={f.nome_usuario} on={set("nome_usuario")} ph="Como devemos te chamar" />

        {erro && <p className="text-sm text-danger-500">{erro}</p>}

        <button onClick={salvar} disabled={loading || !f.nome}
          className="mt-2 rounded-lg bg-recover-500 px-4 py-3 font-medium text-navy-900 transition hover:bg-recover-400 disabled:opacity-50">
          {loading ? "Salvando…" : "Entrar na plataforma"}
        </button>
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
