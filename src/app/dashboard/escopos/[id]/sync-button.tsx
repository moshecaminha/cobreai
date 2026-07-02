"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync() {
    setLoading(true); setMsg(null);
    try {
      const r = await fetch(`/api/escopos/${id}/sync`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.erro || "Falha");
      setMsg(`Sincronizado: ${d.novas_empresas} empresas.`);
      router.refresh();
    } catch (e: any) {
      setMsg(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={sync} disabled={loading}
        className="rounded-lg bg-recover-500 px-5 py-2.5 font-medium text-navy-900 transition hover:bg-recover-400 disabled:opacity-50">
        {loading ? "Sincronizando…" : "Sincronizar com a Receita"}
      </button>
      {msg && <span className="text-sm text-ink-300">{msg}</span>}
    </div>
  );
}
