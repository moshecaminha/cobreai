/**
 * Casa dos Dados — Cliente da API v5
 * Docs: https://docs.casadosdados.com.br
 *
 * Autenticação: header `api-key` (chave por tenant, pré-paga, saldo > 0).
 * Esta é a fonte paga da Receita escolhida para alimentar a Base Sindical.
 *
 * Endpoints usados:
 *  - POST /v5/cnpj/pesquisa          → pesquisa avançada (síncrona, paginada)
 *  - POST /v5/cnpj/pesquisa/arquivo  → geração de arquivo em lote (assíncrona, retorna uuid)
 *  - GET  /v5/saldo                  → saldo da conta  (confirmar caminho exato na doc)
 */

const BASE_URL = "https://api.casadosdados.com.br";

// ---------------------------------------------------------------------------
// Tipos do filtro (schema CNPJPesquisaSolicitacao.pesquisa — confirmado na doc)
// ---------------------------------------------------------------------------
export interface FiltroPesquisa {
  cnpj?: string[];
  cnpj_raiz?: string[];
  busca_textual?: Array<{
    texto: string[];
    tipo_busca?: "exata" | "uma_ou_mais" | "todas";
    razao_social?: boolean;
    nome_fantasia?: boolean;
    nome_socio?: boolean;
  }>;
  codigo_atividade_principal?: string[];   // CNAEs principais (escopo sindical)
  incluir_atividade_secundaria?: boolean;
  codigo_atividade_secundaria?: string[];
  codigo_natureza_juridica?: string[];
  situacao_cadastral?: Array<"ATIVA" | "BAIXADA" | "INAPTA" | "SUSPENSA" | "NULA">;
  matriz_filial?: "MATRIZ" | "FILIAL";
  cep?: string[];
  uf?: string[];                           // ['pe','sp']
  municipio?: string[];                    // ['recife','olinda']
  bairro?: string[];
  ddd?: string[];
  data_abertura?: { inicio?: string; fim?: string; ultimos_dias?: number };
  capital_social?: { minimo?: number; maximo?: number };
  porte_empresa?: { codigos: string[] };
  mei?: { optante?: boolean; excluir_optante?: boolean };
  simples?: { optante?: boolean; excluir_optante?: boolean };
  mais_filtros?: {
    somente_matriz?: boolean;
    com_email?: boolean;
    com_telefone?: boolean;
    excluir_empresas_visualizadas?: boolean;
  };
  excluir?: { cnpj?: string[] };
  limite?: number;                         // por página
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
  constructor(public status: number, message: string) {
    super(message);
    this.name = "CasaDosDadosError";
  }
}

export class CasaDosDados {
  constructor(private apiKey: string, private baseUrl: string = BASE_URL) {}

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "api-key": this.apiKey,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // 401 chave inválida · 403 sem saldo/proibido · 400 payload inválido
      throw new CasaDosDadosError(res.status, `Casa dos Dados ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  /** Pesquisa avançada síncrona e paginada. Filtra por CNAE + município + situação etc. */
  async pesquisar(filtro: FiltroPesquisa): Promise<any> {
    return this.req("/v5/cnpj/pesquisa", {
      method: "POST",
      body: JSON.stringify(filtro),
    });
  }

  /** Geração de arquivo (CSV/Excel) em lote — ideal para grandes recortes. Retorna { arquivo_uuid }. */
  async gerarArquivo(opts: {
    nome: string;
    tipo: "csv" | "excel";
    total_linhas?: number;
    enviar_para?: string[];
    pesquisa: FiltroPesquisa;
  }): Promise<{ mensagem: string; arquivo_uuid: string }> {
    return this.req("/v5/cnpj/pesquisa/arquivo", {
      method: "POST",
      body: JSON.stringify({
        total_linhas: opts.total_linhas ?? 0,
        nome: opts.nome,
        tipo: opts.tipo,
        enviar_para: opts.enviar_para ?? [],
        pesquisa: opts.pesquisa,
      }),
    });
  }

  /** Saldo da conta (consumo pré-pago). Caminho a confirmar na doc oficial. */
  async saldo(): Promise<any> {
    return this.req("/v5/saldo", { method: "GET" });
  }
}

// ---------------------------------------------------------------------------
// MOTOR DE BASE SINDICAL — funções de alto nível usadas pelo sync
// ---------------------------------------------------------------------------

/** Monta o filtro a partir de um Escopo Sindical (CNAE + território). */
export function filtroDoEscopo(escopo: {
  cnaes_principais: string[];
  cnaes_secundarios?: string[];
  incluir_secundaria?: boolean;
  ufs?: string[];
  municipios?: string[];
  situacao_alvo?: string;
  porte_codigos?: string[];
  capital_social_min?: number | null;
}, pagina = 1, limite = 100): FiltroPesquisa {
  return {
    codigo_atividade_principal: escopo.cnaes_principais,
    incluir_atividade_secundaria: escopo.incluir_secundaria ?? true,
    codigo_atividade_secundaria: escopo.cnaes_secundarios ?? [],
    uf: (escopo.ufs ?? []).map((u) => u.toLowerCase()),
    municipio: (escopo.municipios ?? []).map((m) => m.toLowerCase()),
    situacao_cadastral: [(escopo.situacao_alvo as any) ?? "ATIVA"],
    porte_empresa: escopo.porte_codigos?.length ? { codigos: escopo.porte_codigos } : undefined,
    capital_social: escopo.capital_social_min ? { minimo: escopo.capital_social_min } : undefined,
    mais_filtros: { excluir_empresas_visualizadas: true },
    limite,
    pagina,
  };
}

/**
 * Lead engine: empresas recém-abertas no escopo (CNAE + cidade) nos últimos N dias.
 * É o gatilho de captura de receita nova — o grande diferencial sindical.
 */
export function filtroEmpresasNovas(escopo: Parameters<typeof filtroDoEscopo>[0], ultimosDias = 30): FiltroPesquisa {
  return {
    ...filtroDoEscopo(escopo, 1, 100),
    data_abertura: { ultimos_dias: ultimosDias },
  };
}

/**
 * Normaliza um registro da Casa dos Dados para o shape de `empresas_base`.
 * ⚠️ Ajustar os nomes de campo conforme o schema CNPJPesquisaResposta real do tenant.
 */
export function mapEmpresa(raw: any): EmpresaBaseInput {
  return {
    cnpj: (raw.cnpj ?? "").replace(/\D/g, ""),
    razao_social: raw.razao_social ?? null,
    nome_fantasia: raw.nome_fantasia ?? null,
    cnae_principal: raw.cnae_principal?.codigo ?? raw.codigo_atividade_principal ?? null,
    cnae_descricao: raw.cnae_principal?.descricao ?? null,
    situacao_cadastral: raw.situacao_cadastral ?? null,
    data_abertura: raw.data_abertura ?? null,
    natureza_juridica: raw.natureza_juridica?.descricao ?? raw.natureza_juridica ?? null,
    capital_social: raw.capital_social != null ? Number(raw.capital_social) : null,
    porte: raw.porte ?? null,
    email: raw.email ?? null,
    telefone: raw.telefone ?? raw.ddd_telefone_1 ?? null,
    endereco: raw.logradouro ?? null,
    numero: raw.numero ?? null,
    bairro: raw.bairro ?? null,
    cidade: raw.municipio ?? null,
    estado: raw.uf ?? null,
    cep: raw.cep ?? null,
    fonte_dados: "casadosdados",
  };
}
