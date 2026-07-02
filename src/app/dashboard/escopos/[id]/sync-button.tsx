"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<any>(null);

  async function sync() {
    setLoading(true); setMsg(null); setDetalhe(null);
    try {
      const r = await fetch(`/api/escopos/${id}/sync`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.erro || "Falha");
      setDetalhe(d.filtro || null);
      if (d.novas_empresas > 0) setMsg(`✓ ${d.novas_empresas} empresas coletadas (total disponível: ${d.total}).`);
      else setMsg(d.aviso || "0 empresas retornadas.");
      router.refresh();
    } catch (e: any) {
      setMsg("Erro: " + e.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button onClick={sync} disabled={loading}
        className="rounded-lg bg-recover-500 px-5 py-2.5 font-medium text-navy-900 transition hover:bg-recover-400 disabled:opacity-50">
        {loading ? "Sincronizando…" : "Sincronizar com a Receita"}
      </button>
      {msg && <span className="max-w-md text-right text-sm text-ink-300">{msg}</span>}
      {detalhe && (
        <span className="max-w-md text-right text-xs text-ink-500">
          Consultado → CNAE: {(detalhe.cnae || []).join(", ") || "—"} · UF: {(detalhe.uf || []).join(", ") || "—"} · Município: {(detalhe.municipio || []).join(", ") || "—"}
        </span>
      )}
    </div>
  );
}
