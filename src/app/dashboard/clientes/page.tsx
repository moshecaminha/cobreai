"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { mascaraDocumento } from "@/lib/documento";
import ClienteForm, { Cliente } from "./cliente-form";
import { Users, CheckCircle2, AlertCircle, Wallet, Plus, Search, Pencil, Trash2 } from "lucide-react";

type Row = any;

function brl(n: number) { return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function Clientes() {
  const router = useRouter();
  const sb = supabaseBrowser();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "ativos" | "inativos">("todos");
  const [form, setForm] = useState<Cliente | null | undefined>(undefined); // undefined=fechado
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: u } = await sb.from("usuarios").select("empresa_id").eq("id", user.id).maybeSingle();
    if (!u) { router.push("/onboarding"); return; }
    setEmpresaId(u.empresa_id);
    const { data } = await sb.from("clientes").select("*").order("nome");
    setRows(data ?? []);
    setCarregando(false);
  }
  useEffect(() => { carregar(); }, []);

  async function excluir(id: string) {
    if (!confirm("Excluir este cliente?")) return;
    await sb.from("clientes").delete().eq("id", id);
    carregar();
  }

  const filtrados = rows.filter((r) => {
    if (filtro === "ativos" && !r.is_ativo) return false;
    if (filtro === "inativos" && r.is_ativo) return false;
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (r.nome || "").toLowerCase().includes(q)
      || (r.documento || "").includes(q.replace(/\D/g, ""))
      || (r.email || "").toLowerCase().includes(q);
  });

  const total = rows.length;
  const ativos = rows.filter((r) => r.is_ativo).length;
  const inadimplentes = rows.filter((r) => (r.total_divida ?? 0) > (r.total_pago ?? 0)).length;
  const totalDevido = rows.reduce((s, r) => s + Math.max(0, (r.total_divida ?? 0) - (r.total_pago ?? 0)), 0);

  function paraForm(r: Row): Cliente {
    return {
      id: r.id, nome: r.nome ?? "", documento: r.documento ?? "", email: r.email ?? "",
      telefone: r.telefone ?? "", whatsapp: r.whatsapp ?? "", observacoes: r.observacoes ?? "",
      is_ativo: r.is_ativo ?? true, cep: r.cep ?? "", endereco: r.endereco ?? "", numero: r.numero ?? "",
      complemento: r.complemento ?? "", bairro: r.bairro ?? "", cidade: r.cidade ?? "", estado: r.estado ?? "", ibge: r.ibge ?? "",
    };
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-100">Clientes</h1>
          <p className="mt-1 text-ink-300">Gerencie sua base de clientes.</p>
        </div>
        <button onClick={() => setForm(null)}
          className="inline-flex items-center gap-2 rounded-lg bg-recover-500 px-4 py-2.5 font-medium text-navy-900 hover:bg-recover-400">
          <Plus size={18} /> Novo cliente
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Card icon={<Users size={18} />} label="Total" value={String(total)} />
        <Card icon={<CheckCircle2 size={18} className="text-recover-500" />} label="Ativos" value={String(ativos)} />
        <Card icon={<AlertCircle size={18} className="text-danger-500" />} label="Inadimplentes" value={String(inadimplentes)} />
        <Card icon={<Wallet size={18} className="text-amber-500" />} label="Total devido" value={brl(totalDevido)} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, documento ou e-mail…"
            className="w-full rounded-lg border border-white/10 bg-navy-900 py-2.5 pl-9 pr-3 text-ink-100 outline-none focus:border-recover-500" />
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as any)}
          className="rounded-lg border border-white/10 bg-navy-900 px-3 py-2.5 text-ink-100 outline-none">
          <option value="todos">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-left text-ink-500">
            <tr>
              <th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Contato</th><th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Devido</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">Carregando…</td></tr>}
            {!carregando && filtrados.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-500">Nenhum cliente. Clique em “Novo cliente”.</td></tr>
            )}
            {filtrados.map((r) => {
              const devido = Math.max(0, (r.total_divida ?? 0) - (r.total_pago ?? 0));
              return (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-ink-100">{r.nome}</td>
                  <td className="px-4 py-3 text-ink-300">{r.documento ? mascaraDocumento(r.documento) : "—"}</td>
                  <td className="px-4 py-3 text-ink-500">{r.telefone || r.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${r.is_ativo ? "bg-recover-500/15 text-recover-400" : "bg-white/10 text-ink-500"}`}>
                      {r.is_ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-ink-300">{devido > 0 ? brl(devido) : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setForm(paraForm(r))} className="text-ink-500 hover:text-recover-400"><Pencil size={16} /></button>
                      <button onClick={() => excluir(r.id)} className="text-ink-500 hover:text-danger-500"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {form !== undefined && empresaId && (
        <ClienteForm empresaId={empresaId} inicial={form ?? undefined}
          onClose={() => setForm(undefined)}
          onSaved={() => { setForm(undefined); carregar(); }} />
      )}
    </div>
  );
}

function Card({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-800/60 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-ink-500">{icon}{label}</div>
      <div className="mt-2 font-display text-xl font-bold text-ink-100">{value}</div>
    </div>
  );
}
