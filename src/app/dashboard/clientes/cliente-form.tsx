"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import AddressField, { Endereco, enderecoVazio } from "@/components/address-field";
import { validaDocumento, detectaTipo, mascaraDocumento } from "@/lib/documento";
import { X } from "lucide-react";

export type Cliente = {
  id?: string; nome: string; documento: string; email: string; telefone: string; whatsapp: string;
  observacoes: string; is_ativo: boolean;
  cep: string; endereco: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string; ibge: string;
};

const vazio: Cliente = {
  nome: "", documento: "", email: "", telefone: "", whatsapp: "", observacoes: "", is_ativo: true,
  cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", ibge: "",
};

export default function ClienteForm({
  empresaId, inicial, onClose, onSaved,
}: { empresaId: string; inicial?: Cliente; onClose: () => void; onSaved: () => void }) {
  const sb = supabaseBrowser();
  const [c, setC] = useState<Cliente>(inicial ?? vazio);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const end: Endereco = {
    cep: c.cep, logradouro: c.endereco, numero: c.numero, complemento: c.complemento,
    bairro: c.bairro, cidade: c.cidade, uf: c.estado, ibge: c.ibge,
  };
  function setEnd(e: Endereco) {
    setC({ ...c, cep: e.cep, endereco: e.logradouro, numero: e.numero, complemento: e.complemento,
      bairro: e.bairro, cidade: e.cidade, estado: e.uf, ibge: e.ibge });
  }
  function set<K extends keyof Cliente>(k: K, v: Cliente[K]) { setC({ ...c, [k]: v }); }

  async function salvar() {
    setErro(null);
    if (!c.nome.trim()) return setErro("Informe o nome.");
    if (c.documento && !validaDocumento(c.documento)) return setErro("CPF/CNPJ inválido.");
    setLoading(true);
    const payload = {
      empresa_id: empresaId, nome: c.nome, documento: c.documento || null,
      tipo_documento: c.documento ? detectaTipo(c.documento) : null,
      email: c.email || null, telefone: c.telefone || null, whatsapp: c.whatsapp || null,
      observacoes: c.observacoes || null, is_ativo: c.is_ativo,
      cep: c.cep || null, endereco: c.endereco || null, numero: c.numero || null,
      complemento: c.complemento || null, bairro: c.bairro || null,
      cidade: c.cidade || null, estado: c.estado || null, ibge: c.ibge || null,
    };
    const q = c.id
      ? sb.from("clientes").update(payload).eq("id", c.id)
      : sb.from("clientes").insert(payload);
    const { error } = await q;
    setLoading(false);
    if (error) return setErro("Erro ao salvar o cliente.");
    onSaved();
  }

  const I = "mt-1 w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2.5 text-ink-100 outline-none focus:border-recover-500";
  const L = "block text-xs text-ink-500";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-navy-800 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink-100">{c.id ? "Editar cliente" : "Novo cliente"}</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-100"><X size={20} /></button>
        </div>

        <div className="mt-5 grid gap-4">
          <div><label className={L}>Nome *</label>
            <input value={c.nome} onChange={(e) => set("nome", e.target.value)} className={I} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={L}>CPF / CNPJ</label>
              <input value={c.documento} onChange={(e) => set("documento", e.target.value)}
                onBlur={(e) => e.target.value && set("documento", mascaraDocumento(e.target.value))} className={I} /></div>
            <div><label className={L}>Telefone</label>
              <input value={c.telefone} onChange={(e) => set("telefone", e.target.value)} className={I} /></div>
            <div><label className={L}>WhatsApp</label>
              <input value={c.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className={I} /></div>
          </div>
          <div><label className={L}>E-mail</label>
            <input value={c.email} onChange={(e) => set("email", e.target.value)} className={I} /></div>

          <div className="border-t border-white/10 pt-4">
            <div className="mb-3 font-display font-medium text-ink-100">Endereço</div>
            <AddressField value={end} onChange={setEnd} />
          </div>

          <div><label className={L}>Observações</label>
            <textarea value={c.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={2} className={I} /></div>

          <label className="flex items-center gap-2 text-sm text-ink-300">
            <input type="checkbox" checked={c.is_ativo} onChange={(e) => set("is_ativo", e.target.checked)} /> Cliente ativo
          </label>

          {erro && <p className="text-sm text-danger-500">{erro}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-ink-100 hover:bg-white/5">Cancelar</button>
            <button onClick={salvar} disabled={loading}
              className="rounded-lg bg-recover-500 px-6 py-2.5 font-medium text-navy-900 disabled:opacity-50">
              {loading ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
