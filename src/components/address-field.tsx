"use client";

import { useEffect, useRef, useState } from "react";
import { buscaCep } from "@/lib/cep";

export interface Endereco {
  cep: string; logradouro: string; numero: string; complemento: string;
  bairro: string; cidade: string; uf: string; ibge: string;
}

export const enderecoVazio: Endereco = {
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", ibge: "",
};

// Google Places (autocomplete de rua) — só ativa se a chave estiver configurada.
const GKEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function carregarGoogle(): Promise<any | null> {
  if (!GKEY) return Promise.resolve(null);
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).google?.maps?.places) return Promise.resolve((window as any).google);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GKEY}&libraries=places&language=pt-BR&region=BR`;
    s.async = true;
    s.onload = () => resolve((window as any).google ?? null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

export default function AddressField({
  value, onChange,
}: { value: Endereco; onChange: (e: Endereco) => void }) {
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const ruaRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof Endereco>(k: K, v: string) {
    onChange({ ...value, [k]: v });
  }

  async function preencherPorCep(cep: string) {
    const d = await buscaCep(cep);
    if (!d) { setAviso("CEP não encontrado."); return; }
    setAviso(null);
    onChange({
      ...value,
      cep: d.cep, logradouro: d.logradouro, bairro: d.bairro,
      cidade: d.cidade, uf: d.uf, ibge: d.ibge,
    });
  }

  async function onBlurCep() {
    const cep = value.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setBuscando(true);
    await preencherPorCep(cep);
    setBuscando(false);
  }

  // Autocomplete de rua (Google Places) — best-effort, ativa com a chave
  useEffect(() => {
    let ac: any;
    carregarGoogle().then((g) => {
      if (!g || !ruaRef.current) return;
      ac = new g.maps.places.Autocomplete(ruaRef.current, {
        types: ["address"],
        componentRestrictions: { country: "br" },
        fields: ["address_components"],
      });
      ac.addListener("place_changed", () => {
        const p = ac.getPlace();
        const get = (t: string) => p.address_components?.find((c: any) => c.types.includes(t))?.long_name ?? "";
        const getShort = (t: string) => p.address_components?.find((c: any) => c.types.includes(t))?.short_name ?? "";
        onChange({
          ...value,
          logradouro: get("route") || value.logradouro,
          numero: get("street_number") || value.numero,
          bairro: get("sublocality_level_1") || get("sublocality") || value.bairro,
          cidade: get("administrative_area_level_2") || get("locality") || value.cidade,
          uf: getShort("administrative_area_level_1") || value.uf,
          cep: get("postal_code") || value.cep,
        });
      });
    });
    return () => { if (ac && (window as any).google) (window as any).google.maps.event.clearInstanceListeners(ac); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const I = "mt-1 w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2.5 text-ink-100 outline-none focus:border-recover-500";
  const L = "block text-xs text-ink-500";

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={L}>CEP</label>
          <input value={value.cep} onChange={(e) => set("cep", e.target.value)} onBlur={onBlurCep}
            placeholder="50030-230" className={I} />
          {buscando && <span className="mt-1 block text-xs text-ink-500">Buscando…</span>}
          {aviso && <span className="mt-1 block text-xs text-amber-500">{aviso}</span>}
        </div>
        <div className="col-span-2">
          <label className={L}>Rua / Logradouro {GKEY ? "(digite para autocompletar)" : ""}</label>
          <input ref={ruaRef} value={value.logradouro} onChange={(e) => set("logradouro", e.target.value)}
            placeholder="Av. Conselheiro Aguiar" className={I} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className={L}>Número</label>
          <input value={value.numero} onChange={(e) => set("numero", e.target.value)} className={I} />
        </div>
        <div className="col-span-2">
          <label className={L}>Complemento</label>
          <input value={value.complemento} onChange={(e) => set("complemento", e.target.value)} className={I} />
        </div>
        <div>
          <label className={L}>Bairro</label>
          <input value={value.bairro} onChange={(e) => set("bairro", e.target.value)} className={I} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-2">
          <label className={L}>Cidade</label>
          <input value={value.cidade} onChange={(e) => set("cidade", e.target.value)} className={I} />
        </div>
        <div>
          <label className={L}>UF</label>
          <input value={value.uf} onChange={(e) => set("uf", e.target.value)} className={I} />
        </div>
        <div>
          <label className={L}>Cód. IBGE</label>
          <input value={value.ibge} readOnly placeholder="auto" className={I + " opacity-70"} />
        </div>
      </div>
    </div>
  );
}
