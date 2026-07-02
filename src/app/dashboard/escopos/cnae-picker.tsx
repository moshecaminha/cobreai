"use client";

import { useEffect, useRef, useState } from "react";

export type CnaeTag = { codigo: string; descricao: string };

export default function CnaePicker({
  value, onChange,
}: { value: CnaeTag[]; onChange: (v: CnaeTag[]) => void }) {
  const [q, setQ] = useState("");
  const [itens, setItens] = useState<CnaeTag[]>([]);
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const tRef = useRef<any>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setItens([]); return; }
    setLoading(true);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/cnaes/search?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        setItens((d.itens ?? []).filter((i: CnaeTag) => !value.some((v) => v.codigo === i.codigo)));
        setAberto(true);
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(tRef.current);
  }, [q, value]);

  function add(t: CnaeTag) {
    onChange([...value, t]);
    setQ(""); setItens([]); setAberto(false);
  }
  function remove(codigo: string) {
    onChange(value.filter((v) => v.codigo !== codigo));
  }

  return (
    <div>
      <label className="block text-xs text-ink-500">CNAEs (digite uma palavra, ex.: “supermercado”)</label>

      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((t) => (
            <span key={t.codigo} className="inline-flex items-center gap-2 rounded-full border border-recover-500/40 bg-recover-500/10 px-3 py-1 text-sm">
              <span className="text-recover-400">{t.codigo}</span>
              <span className="text-ink-300">{t.descricao}</span>
              <button onClick={() => remove(t.codigo)} className="text-ink-500 hover:text-danger-500">×</button>
            </span>
          ))}
        </div>
      )}

      <div className="relative mt-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => itens.length && setAberto(true)}
          placeholder="Buscar atividade ou código…"
          className="w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2.5 text-ink-100 outline-none focus:border-recover-500" />
        {aberto && (itens.length > 0 || loading) && (
          <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-white/10 bg-navy-800 shadow-xl">
            {loading && <div className="px-3 py-2 text-sm text-ink-500">Buscando…</div>}
            {itens.map((i) => (
              <button key={i.codigo} onClick={() => add(i)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-white/5">
                <span className="text-recover-400">{i.codigo}</span>
                <span className="text-ink-300">{i.descricao}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
