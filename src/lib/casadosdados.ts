/**
 * Casa dos Dados — Cliente da API v5
 * Docs: https://docs.casadosdados.com.br  (schema confirmado em 2025-07-16)
 * Auth: header `api-key`. Endpoints:
 *   POST /v5/cnpj/pesquisa           → pesquisa avançada, corpo PLANO, resposta { total, cnpjs[] }
 *   POST /v5/cnpj/pesquisa/arquivo   → geração de arquivo (assíncrona)
 *   GET  /v5/saldo                   → saldo
 */
const BASE_URL = "https://api.casadosdados.com.br";

/** remove acentos e normaliza p/ o formato aceito pela Casa dos Dados. */
function semAcento(s: string) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
const soDigitos = (s: string) => (s || "").replace(/\D/g, "");

export interface FiltroPesquisa {
  cnpj?: string[];
  cnpj_raiz?: string[];
  busca_textual?: any[];
  codigo_atividade_principal?: string[];
  incluir_atividade_secundaria?: boolean;
  codigo_atividade_secundaria?: string[];
  codigo_natureza_juridica?: string[];
  situacao_cadastral?: Array<"ATIVA" | "BAIXADA" | "INAPTA" | "SUSPENSA" | "NULA">;
  matriz_filial?: "MATRIZ" | "FILIAL";
  cep?: string[];
  uf?: string[];
  municipio?: string[];
  bairro?: string[];
  ddd?: string[];
  data_abertura?: { inicio?: string; fim?: string; ultimos_dias?: number };
  capital_social?: { minimo?: number; maximo?: number };
  porte_empresa?: { codigos: string[] };
  mais_filtros?: Record<string, boolean>;
  limite?: number;
  pagina?: number;
}

export interface EmpresaBaseInput {
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnae_principal: string | null;
  cnae_descricao: string | null;
  situacao_cadastral: string | null;
  data_abertura: string | null;
  natureza_juridica: string | null;
  capital_social: number | null;
  porte: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null; numero: string | null; bairro: string | null;
  cidade: string | null; estado: string | null; cep: string | null;
  fonte_dados: "casadosdados";
}

export class CasaDosDadosError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "CasaDosDadosError"; }
}

export class CasaDosDados {
  constructor(private apiKey: string, private baseUrl: string = BASE_URL) {}
  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { "api-key": this.apiKey, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new CasaDosDadosError(res.status, body || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }
  /** Pesquisa avançada. Retorna { total, cnpjs: [...] }. */
  async pesquisar(filtro: FiltroPesquisa): Promise<{ total: number; cnpjs: any[] }> {
    return this.req("/v5/cnpj/pesquisa", { method: "POST", body: JSON.stringify(filtro) });
  }
  async saldo(): Promise<any> { return this.req("/v5/saldo", { method: "GET" }); }
}

/**
 * Monta o filtro a partir de um Escopo Sindical (CNAE + território).
 * CNAE → só dígitos (7). UF → minúsculo. Município → minúsculo SEM acento.
 * Estado e cidade vão AMBOS no corpo, é o que amarra a coleta ao território.
 */
export function filtroDoEscopo(escopo: {
  cnaes_principais?: string[] | null;
  cnaes_secundarios?: string[] | null;
  incluir_secundaria?: boolean | null;
  ufs?: string[] | null;
  municipios?: string[] | null;
  situacao_alvo?: string | null;
  porte_codigos?: string[] | null;
  capital_social_min?: number | null;
}, pagina = 1, limite = 100): FiltroPesquisa {
  const cnaes = (escopo.cnaes_principais ?? []).map(soDigitos).filter(Boolean);
  const ufs = (escopo.ufs ?? []).map((u) => u.trim().toLowerCase()).filter(Boolean);
  const muns = (escopo.municipios ?? []).map((m) => semAcento(m).trim().toLowerCase()).filter(Boolean);
  const filtro: FiltroPesquisa = {
    situacao_cadastral: [((escopo.situacao_alvo as any) || "ATIVA")],
    limite,
    pagina,
  };
  if (cnaes.length) filtro.codigo_atividade_principal = cnaes;
  if (escopo.incluir_secundaria && (escopo.cnaes_secundarios ?? []).length) {
    filtro.incluir_atividade_secundaria = true;
    filtro.codigo_atividade_secundaria = (escopo.cnaes_secundarios ?? []).map(soDigitos).filter(Boolean);
  }
  if (ufs.length) filtro.uf = ufs;              // <- estado amarrado
  if (muns.length) filtro.municipio = muns;     // <- cidade amarrada (sem acento)
  if (escopo.porte_codigos?.length) filtro.porte_empresa = { codigos: escopo.porte_codigos };
  if (escopo.capital_social_min) filtro.capital_social = { minimo: escopo.capital_social_min };
  return filtro;
}

/** Empresas recém-abertas no escopo nos últimos N dias (lead engine). */
export function filtroEmpresasNovas(escopo: Parameters<typeof filtroDoEscopo>[0], ultimosDias = 30, pagina = 1): FiltroPesquisa {
  return { ...filtroDoEscopo(escopo, pagina, 100), data_abertura: { ultimos_dias: ultimosDias } };
}

/**
 * Normaliza um registro da resposta v5 (schema oficial):
 * endereço aninhado em `endereco`, situacao_cadastral e porte_empresa são objetos.
 * A resposta NÃO traz o CNAE — usamos o CNAE pesquisado como fallback (cnaeFallback).
 */
export function mapEmpresa(raw: any, cnaeFallback?: string | null): EmpresaBaseInput {
  const end = raw.endereco ?? {};
  const sit = raw.situacao_cadastral;
  const situacao = typeof sit === "object" ? (sit?.situacao_cadastral ?? sit?.situacao_atual ?? null) : (sit ?? null);
  const porte = typeof raw.porte_empresa === "object" ? (raw.porte_empresa?.descricao ?? raw.porte_empresa?.codigo ?? null) : (raw.porte ?? null);
  const tel = raw.telefone ?? raw.ddd_telefone_1 ?? raw.contato_telefonico?.[0]?.completo ?? null;
  const logradouro = [end.tipo_logradouro, end.logradouro].filter(Boolean).join(" ") || null;
  return {
    cnpj: soDigitos(raw.cnpj ?? ""),
    razao_social: raw.razao_social ?? null,
    nome_fantasia: raw.nome_fantasia ?? null,
    cnae_principal: raw.atividade_principal?.codigo ?? raw.codigo_atividade_principal ?? cnaeFallback ?? null,
    cnae_descricao: raw.atividade_principal?.descricao ?? null,
    situacao_cadastral: situacao,
    data_abertura: raw.data_abertura ?? null,
    natureza_juridica: raw.descricao_natureza_juridica ?? raw.natureza_juridica?.descricao ?? raw.natureza_juridica ?? null,
    capital_social: raw.capital_social != null ? Number(raw.capital_social) : null,
    porte,
    email: raw.email ?? null,
    telefone: tel,
    endereco: logradouro,
    numero: end.numero ?? null,
    bairro: end.bairro ?? null,
    cidade: end.municipio ?? null,
    estado: end.uf ?? null,
    cep: end.cep ? soDigitos(end.cep) : null,
    fonte_dados: "casadosdados",
  };
}
