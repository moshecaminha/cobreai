/**
 * Consulta CEP via ViaCEP e devolve endereço + código IBGE do município.
 * O campo `ibge` é o código do município (mesmo usado pela Receita/IBGE),
 * essencial para amarrar cliente ↔ território do escopo sindical.
 */
export interface EnderecoCep {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  ibge: string;      // código IBGE do município
}

export async function buscaCep(cepRaw: string): Promise<EnderecoCep | null> {
  const cep = (cepRaw || "").replace(/\D/g, "");
  if (cep.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: "no-store" });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.erro) return null;
    return {
      cep: d.cep ?? cep,
      logradouro: d.logradouro ?? "",
      bairro: d.bairro ?? "",
      cidade: d.localidade ?? "",
      uf: d.uf ?? "",
      ibge: d.ibge ?? "",
    };
  } catch {
    return null;
  }
}
