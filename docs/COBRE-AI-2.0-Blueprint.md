# COBRE.AI 2.0 — Blueprint de Produto e Arquitetura
### Plataforma de Cobrança Sindical com Atualização Automática da Base (Receita Federal) e Recuperação Automática de Receita

> Documento de análise e redesign elaborado na ótica de Analista de Sistemas + Gestor de Produto/Projeto.
> Base: especificações COBRE.IA v1.0 e COBRE.AI v2.0 fornecidas. Plataforma atual em produção: `cobreai.app.br`.

---

## 1. Sumário Executivo

O COBRE.AI já é um produto maduro no papel: 23 módulos, multi-tenant, integrações brasileiras (PIX/Boleto/WhatsApp), e um módulo sindical (bases, listas, convenções, cobrança em lote) que é o real diferencial competitivo. O problema é que a documentação descreve um **conjunto de funcionalidades**, não um **motor de geração de valor**. As duas peças que transformam isso num produto "imbatível" no nicho sindical ainda estão imaturas ou ausentes:

1. **Base sindical viva** — hoje a base depende de importação manual de CSV e de APIs pagas (CNPJá). Falta um motor que mantenha a base de empresas da categoria sempre atualizada a partir da fonte oficial (Receita Federal), por cidade e CNAE, detectando automaticamente quem abriu, quem fechou, quem mudou de atividade.
2. **Recuperação automática de receita (RRA)** — hoje existe "régua de cobrança" baseada em dias fixos. Isso é automação burra. O diferencial é um motor que prioriza, decide canal/horário/tom e negocia sozinho dentro de guardrails, otimizando a *receita efetivamente recuperada* — não o *número de mensagens enviadas*.

Este blueprint redesenha o produto em torno dessas duas máquinas, corrige riscos técnicos urgentes (com destaque para o **CNPJ alfanumérico de julho/2026**, que quebra o modelo de dados atual), e organiza tudo num roadmap executável.

**Conclusão central:** o COBRE.AI não deve se vender como "sistema de cobrança". Deve se vender como **"a plataforma que descobre toda a base de contribuintes da sua categoria e recupera a receita sozinha"**. Cobrança é commodity; *enriquecimento de base + recuperação automática* é o moat.

---

## 2. Diagnóstico da Versão Atual

### 2.1 Pontos fortes (preservar)
- Arquitetura multi-tenant correta (isolamento por `empresa_id`).
- Cobertura funcional ampla e coerente com o fluxo brasileiro (CPF/CNPJ, PIX EMV, Boleto FEBRABAN, BOLEPIX).
- Módulo sindical (convenção coletiva → lista → cobrança em lote) bem desenhado conceitualmente. É o ativo mais valioso.
- Stack moderna e barata de operar (Cloudflare Workers + D1 + R2 + Hono).
- Login por telefone reduz fricção (bom para clientes finais que negociam pelo portal).

### 2.2 Riscos e gaps (corrigir)

| # | Risco / Gap | Severidade | Impacto |
|---|---|---|---|
| R1 | **CNPJ alfanumérico (jul/2026)**: o schema trata CNPJ como string numérica e a validação assume dígitos. A partir de jul/2026 novas inscrições terão letras. | 🔴 Crítico / Urgente | Falha ao cadastrar/validar empresas novas; base sindical fica incompleta justamente nos leads mais quentes (empresas recém-abertas). |
| R2 | **Dependência de API paga (CNPJá) para a base** | 🔴 Alto | Custo variável que escala com o volume; sem ela, a base "morre". |
| R3 | **D1/SQLite para base nacional de CNPJ** (~60M de estabelecimentos) | 🔴 Alto | D1 não foi feito para cruzamentos analíticos massivos (filtrar 200k empresas por CNAE+cidade). Precisa de uma camada analítica (BigQuery/Postgres). |
| R4 | **Régua de cobrança "burra"** (offset de dias fixo) | 🟡 Médio | Baixa taxa de recuperação, fadiga de canal, risco de spam/bloqueio no WhatsApp. |
| R5 | **LGPD e base legal do uso de dados de sócios (QSA)** | 🔴 Alto | Uso de dados pessoais de sócios para prospecção sem base legal clara é passivo jurídico. |
| R6 | **Autenticação só por SMS (Twilio)** | 🟡 Médio | Custo por login, dependência de fornecedor, e SMS é frágil (interceptação/atraso). Falta fallback. |
| R7 | **Sem trilha de auditoria/idempotência em cobrança e webhooks** | 🟡 Médio | Risco de cobrança duplicada e de webhook Stripe/PIX processado 2x. |
| R8 | **"Conciliação por similaridade de nome"** sem normalização robusta | 🟡 Médio | Falsos positivos em auto-match (score ≥ 70) podem baixar cobrança errada. |
| R9 | **Sem motor de eventos** (tudo parece síncrono/cron) | 🟡 Médio | Dificulta automações reativas ("empresa pagou → atualizar score → parar régua"). |

### 2.3 Conclusões da análise
1. O produto está **funcionalmente completo, mas estrategicamente plano**: muitos módulos, pouca inteligência conectando-os.
2. Há um **risco regulatório com prazo de validade** (CNPJ alfanumérico) que precisa entrar no roadmap imediato.
3. A proposta de valor precisa ser reorganizada em torno de **duas máquinas** (Base Viva + RRA) e o resto vira "tabela de apoio".
4. A camada de dados precisa ser **separada em dois planos**: transacional (cobranças, pagamentos — D1/Postgres) e analítico (base nacional CNPJ — BigQuery/coluna).

---

## 3. Reposicionamento de Produto

### 3.1 Proposta de valor (dupla)

**Para o sindicato (cliente pagante):**
> "Descubra 100% das empresas da sua categoria na sua base territorial, mantenha o cadastro vivo automaticamente e recupere a contribuição sindical/assistencial sem operação manual."

**Para a empresa cobrada (devedor):**
> "Resolva sua pendência em 2 cliques, com PIX/Boleto e proposta de parcelamento justa, sem precisar falar com ninguém."

O segredo de produto: **alinhar os dois lados**. Régua agressiva demais queima a relação sindicato↔empresa (que se repete todo ano). O motor RRA precisa maximizar recuperação *preservando* a relação — por isso ele é guiado por score e por guardrails de negociação, não por volume de disparo.

### 3.2 North Star Metric
**Receita Sindical Recuperada por Real de Custo Operacional (R$ recuperado / R$ de custo de disparo+infra).**
Mede simultaneamente eficácia (recuperou) e eficiência (sem queimar dinheiro em SMS/WhatsApp inútil). Substitui métricas vaidosas como "mensagens enviadas".

---

## 4. Decisões de Arquitetura Críticas

### 4.1 CNPJ alfanumérico — adequação obrigatória (prazo: julho/2026)
A Receita Federal, pela IN RFB nº 2.229/2024, passa a emitir CNPJ em formato alfanumérico para **novas inscrições a partir de julho/2026**. Estrutura nova: 12 posições alfanuméricas (raiz + ordem do estabelecimento) + 2 dígitos verificadores **que continuam numéricos**, totalizando as mesmas 14 posições. CNPJs existentes **não mudam**.

**Impacto direto no COBRE.AI:**
- Campos `cnpj`, `documento` (quando tipo CNPJ) **não podem mais ser `INTEGER`/numéricos** — devem ser `TEXT/VARCHAR(14)`, armazenados **sem máscara, em maiúsculas**.
- A função de validação de dígito verificador precisa ser reescrita: cada caractere vira valor = (código ASCII − 48) e entra no **módulo 11** (números mantêm o valor; letras A–Z assumem 17–42). Os dois DVs finais permanecem numéricos.
- Índices, importadores CSV, máscaras de frontend, e contratos de API precisam aceitar `[0-9A-Z]`.
- Como a base sindical prospecta justamente **empresas recém-abertas** (leads mais quentes), ignorar isso significa perder os melhores leads a partir de julho/2026.

> **Ação:** tratar como item P0 do roadmap, com homologação antes de abril/2026 (ambientes de teste das SEFAZ já aceitam alfanumérico antes da produção).

**Implementação de referência da validação (pseudo):**
```
function valorChar(c):           # '0'..'9' -> 0..9 ; 'A'..'Z' -> 17..42
    return ord(c.upper()) - 48

function validarCNPJ(s):
    s = remover_mascara(s).upper()
    if len(s) != 14: return false
    if not regex_match(s, "^[0-9A-Z]{12}[0-9]{2}$"): return false
    # módulo 11 com pesos 5,4,3,2,9,8,7,6,5,4,3,2 sobre valorChar()
    dv1 = modulo11(s[0:12])
    dv2 = modulo11(s[0:13])
    return s[12] == dv1 and s[13] == dv2
```

### 4.2 Plano de dados em duas camadas
- **Transacional (OLTP):** cobranças, pagamentos, negociações, usuários, comunicações. Mantém D1/SQLite no curto prazo; migrar para **Postgres** (Neon/Supabase) quando o volume e os relatórios crescerem. Multi-tenant por `empresa_id` + Row Level Security.
- **Analítico/Base nacional (OLAP):** a base de CNPJ da Receita (dezenas de milhões de linhas) **não fica no D1**. Vai para **BigQuery** (ou DuckDB/Parquet em R2 para custo mínimo). Filtros por CNAE+cidade+situação rodam aqui; só o *recorte* da categoria do sindicato é materializado de volta no transacional.

### 4.3 Motor de eventos
Adotar um barramento de eventos leve (Cloudflare Queues / Workflows). Eventos como `cobranca.criada`, `pagamento.confirmado`, `negociacao.proposta`, `empresa.aberta`, `empresa.baixada` disparam reações (atualizar score, parar régua, gerar boas-vindas). Isso destrava o RRA e a Base Viva sem cron monolítico.

### 4.4 Idempotência e auditoria
- Toda criação de cobrança e todo webhook recebem `idempotency_key`.
- Tabela `eventos_auditoria` (quem, o quê, quando, payload) imutável para compliance e disputas.

---

## 5. Motor de Atualização da Base Sindical (Receita Federal)

Este é o pedido central nº 1. A chave é entender que **não existe uma única "API da Receita Federal" aberta e gratuita** que devolva, em tempo real, "todas as empresas do CNAE X na cidade Y". A estratégia correta combina três fontes em camadas.

### 5.1 As fontes (e por que cada uma)

| Camada | Fonte | Uso | Custo | Observação |
|---|---|---|---|---|
| A — Base completa | **Dados Abertos CNPJ (RFB)** — dumps mensais em CSV/ZIP | Construir e atualizar a base nacional inteira (empresas, estabelecimentos, sócios, CNAE, situação, endereço) | Grátis | Atualização **mensal**; é a fonte de verdade para "quem existe". |
| B — Consulta analítica | **BigQuery** (base pública `basedosdados` ou ingestão própria dos dumps) | Filtrar por CNAE + município + situação + data de abertura em escala | Pago por consulta (barato com particionamento) | Já há precedente no sistema atual (RAIS via BigQuery). |
| C — Enriquecimento on-demand | **BrasilAPI / OpenCNPJ** (gratuitas) e **CNPJá / Infosimples** (pagas) | Dado fresco de um CNPJ específico no momento da cobrança/cadastro | Grátis a pago | Usar só pontualmente, não para varrer a base. |

> **Importante (compliance):** existe uma **API oficial de Consulta CNPJ via Conecta gov.br/SERPRO**, porém ela é restrita a **órgãos e entidades da Administração Pública** (Portaria RFB 1.384/2016). Um sindicato/SaaS privado **não pode** usá-la livremente — por isso o motor se apoia nos **Dados Abertos** (públicos) + enriquecimento por APIs comerciais com contrato.

### 5.2 Pipeline de ingestão (ETL mensal incremental)
```
[RFB Dados Abertos ZIP/CSV]
      │  (job mensal, dia útil seguinte à publicação)
      ▼
[Stage em R2/Parquet]  ──►  normalização (CNPJ alfanumérico-ready, UF, município IBGE, CNAE)
      │
      ▼
[BigQuery: tabela particionada por UF e mês]
      │
      ├─►  DIFF contra carga anterior  ──►  eventos:
      │         • empresa.aberta   (CNAE alvo + cidade alvo)  → lead novo
      │         • empresa.baixada  → churn / parar cobrança
      │         • empresa.cnae_alterado → entra/sai do escopo
      │         • empresa.endereco_alterado → re-territorializar
      ▼
[Materialização do recorte da categoria do sindicato]
      │  filtro: CNAE(s) da convenção + municípios da base territorial + situação=ATIVA
      ▼
[empresas_base no transacional]  → pronto para listas e cobrança em lote
```

### 5.3 Modelo de "escopo sindical"
Cada sindicato define um **Escopo** (nova entidade): conjunto de CNAEs (principal e/ou secundário) + lista de municípios (código IBGE) + filtros (porte, situação, data de abertura mínima). O motor:
1. Materializa o recorte atual da Receita para esse escopo.
2. A cada atualização mensal, calcula o **delta** (novas, baixadas, alteradas).
3. Gera **leads automáticos** para empresas novas no escopo e **alertas** para baixas/alterações.
4. Estima funcionários (já existe `estimativa_funcionarios`) e calcula o valor da contribuição via convenção coletiva.

### 5.4 Detecção de oportunidade (o "lead engine" sindical)
- **Empresa abriu no CNAE/cidade do sindicato →** dispara fluxo de boas-vindas + 1ª cobrança da contribuição.
- **Empresa mudou de CNAE para dentro do escopo →** entra na base.
- **Empresa deu baixa →** encerra cobranças abertas e marca como churn (não cobra empresa morta — protege a reputação do sindicato).
- **Sócio em comum entre empresas (QSA) →** identifica grupos econômicos (com cuidado LGPD, ver §5.5).

### 5.5 LGPD e base legal (não pular)
- Dados **cadastrais de PJ** (razão social, CNAE, endereço, situação) são públicos → uso tranquilo.
- Dados de **sócios (pessoas físicas, QSA)** são dados pessoais. Base legal recomendada: **legítimo interesse** para a finalidade de cobrança da contribuição da categoria, com (a) registro do teste de proporcionalidade (LIA), (b) minimização (só usar o necessário), (c) canal de oposição/atendimento ao titular, (d) **não** enriquecer com score de crédito de PF sem base legal própria.
- Política de retenção e trilha de origem do dado (`fonte_dados`, `dados_atualizados_at` — já existem no schema; reforçar).

---

## 6. Motor de Recuperação Automática de Receita (RRA)

Pedido central nº 2 e o verdadeiro diferencial. Substitui a "régua de cobrança" linear por um motor de decisão.

### 6.1 Arquitetura do motor (5 estágios)
```
1) SCORE          2) SEGMENTAR        3) DECIDIR          4) AGIR             5) APRENDER
   propensão   →     prioridade    →    canal+tom+      →   executar    →     mede resultado
   de pagar          (fila)             horário+oferta      (PIX/WA/...)      e re-treina
```

### 6.2 Estágio 1 — Score de propensão a pagar
Evoluir o "Health Score" existente para um **score preditivo** (0–100) por cobrança, combinando:
- Histórico de pagamento do cliente (em dia / atraso médio).
- Idade e valor da dívida.
- Engajamento (abriu link? leu WhatsApp?).
- Sinais da base RF: situação cadastral ativa, porte, CNAE (alguns setores pagam melhor).
- Sazonalidade da categoria.

Começa como **score baseado em regras + pesos** (entrega valor imediato, explicável) e evolui para modelo estatístico/ML quando houver volume de dados rotulados (pagou/não pagou).

### 6.3 Estágio 2 — Priorização inteligente
Em vez de cobrar todo mundo igual, ordena a fila por **valor esperado de recuperação = valor_em_aberto × probabilidade_de_pagar**. Foca esforço (e custo de canal) onde o retorno é maior. Cobranças de baixíssima propensão e baixo valor entram em trilha de baixo custo (só e-mail/PIX), não consomem WhatsApp pago.

### 6.4 Estágio 3 — Decisão (a "régua inteligente")
Para cada cobrança, o motor decide:
- **Canal**: o que historicamente funciona para *aquele* cliente (WhatsApp > e-mail > SMS, ou o inverso).
- **Horário**: melhor janela de resposta observada.
- **Tom**: amigável → lembrete → formal → urgente (escalonamento por estágio e por score).
- **Oferta**: se elegível, já apresenta proposta de parcelamento/desconto dentro dos limites da empresa (negociação automatizada, §6.6).
- **Cadência**: respeita teto de frequência por canal (anti-fadiga, protege reputação do número de WhatsApp).

Isto generaliza a `regua_cobranca` atual: o `dias_offset` vira só **um gatilho**; a decisão de *como* agir é do motor.

### 6.5 Estágio 4 — Execução
- Gera/atualiza PIX EMV e Boleto, monta a mensagem com variáveis (`{nome}`, `{valor_atualizado}`, `{link}`), dispara pelo canal escolhido, registra em `logs_comunicacao` com `idempotency_key`.
- Atualiza juros/multa automaticamente para vencidas no link público.

### 6.6 Estágio 5 — Negociação automatizada com guardrails
- Cliente acessa o link → vê proposta pré-aprovada **dentro dos limites da empresa** (`neg_desconto_minimo/maximo`, `neg_parcelas_maximas`, `neg_entrada_minima_percent`).
- Aceite gera parcelas e cobranças automaticamente, **sem intervenção humana**, registrando tudo.
- Propostas fora dos limites caem na fila de aprovação manual (fluxo já existente).
- **Guardrail de relação:** o motor nunca propõe condição que destrua a margem do sindicato nem cobra empresa baixada/contestada.

### 6.7 Otimização contínua
- **A/B test** de templates, horários e ofertas; o motor migra tráfego para a variante vencedora.
- Loop fechado: `pagamento.confirmado` realimenta o score e desliga a régua daquela cobrança na hora (via evento — §4.3).
- Painel de **Receita Recuperada** (não "mensagens enviadas") como métrica de topo.

### 6.8 Por que isso gera valor para os dois lados
- **Sindicato:** recupera mais, gasta menos em disparo, e não queima a relação com a categoria (cobrança proporcional, sem spam).
- **Empresa:** resolve sozinha, com proposta justa, no canal e horário que prefere.

---

## 7. Modelo de Dados — Deltas e Novas Entidades

Mantém o schema existente e acrescenta/ajusta:

**Ajustes urgentes (P0):**
- `clientes.documento`, `empresas.cnpj`, `empresas_base.cnpj`, `itens_lista.cnpj` → `VARCHAR(14)` alfanumérico, sem máscara, uppercase.

**Novas tabelas:**
```sql
-- Escopo de prospecção do sindicato (CNAE + território)
escopos_sindicais (
  id, empresa_id, nome,
  cnaes_principais, cnaes_secundarios,        -- arrays
  municipios_ibge, ufs,
  porte_min, porte_max, situacao_alvo,        -- ex: 'ATIVA'
  data_abertura_min,
  total_empresas, ultima_sincronizacao_at,
  created_at, updated_at
)

-- Log de sincronização com a base RF (auditoria do motor de base)
sync_receita (
  id, empresa_id, escopo_id, referencia_mes,
  novas_empresas, empresas_baixadas, empresas_alteradas,
  status, iniciado_at, concluido_at, erro
)

-- Score preditivo por cobrança (motor RRA)
scores_cobranca (
  id, empresa_id, cobranca_id, cliente_id,
  score, probabilidade_pagar, valor_esperado_recuperacao,
  fatores_json,                               -- explicabilidade
  modelo_versao, calculado_at
)

-- Decisões e experimentos do motor RRA
rra_decisoes (
  id, empresa_id, cobranca_id,
  canal, horario_envio, tom, oferta_json,
  variante_ab, resultado,                     -- pago/ignorado/negociado
  enviado_at, respondido_at
)

-- Trilha de auditoria imutável (compliance/LGPD/disputas)
eventos_auditoria (
  id, empresa_id, ator_tipo, ator_id, acao,
  entidade, entidade_id, payload_json, ip, created_at
)

-- Consentimento / oposição do titular (LGPD)
lgpd_solicitacoes (
  id, empresa_id, titular_doc, tipo,          -- acesso/oposicao/exclusao
  status, detalhes, created_at, resolvido_at
)
```

---

## 8. APIs Novas/Alteradas (resumo)

```
# Motor de Base RF
POST /api/escopos                      # criar escopo (CNAE+cidade)
POST /api/escopos/:id/sincronizar      # rodar sync com a base RF
GET  /api/escopos/:id/deltas           # novas / baixadas / alteradas
GET  /api/escopos/:id/leads            # empresas novas no escopo

# Motor RRA
POST /api/rra/calcular-scores          # (re)calcular fila de propensão
GET  /api/rra/fila                     # cobranças priorizadas por valor esperado
POST /api/rra/processar                # executar decisões (canal/horário/oferta)
GET  /api/rra/receita-recuperada       # KPI de topo

# Compliance
POST /api/lgpd/solicitacoes            # registrar pedido do titular
GET  /api/auditoria                    # consulta trilha
```

---

## 9. Roadmap (MoSCoW) e Ordem de Construção

### Fase 0 — Fundação e risco regulatório (4–6 semanas) — *Must*
1. **CNPJ alfanumérico** (schema + validação módulo 11 + máscaras + importadores). **P0, prazo jul/2026.**
2. Idempotência em cobranças e webhooks + tabela de auditoria.
3. Barramento de eventos (Cloudflare Queues/Workflows).

### Fase 1 — Base Viva (6–8 semanas) — *Must*
4. Ingestão mensal dos Dados Abertos RFB → BigQuery (camada analítica).
5. Entidade **Escopo** + materialização do recorte CNAE+cidade.
6. Motor de **delta** (novas/baixadas/alteradas) + leads automáticos.
7. Compliance LGPD (base legal QSA, oposição, retenção).

### Fase 2 — RRA (6–8 semanas) — *Must / Should*
8. Score de propensão (regras + pesos, explicável).
9. Priorização por valor esperado + fila.
10. Régua inteligente (canal/horário/tom) substituindo offset fixo.
11. Negociação automatizada com guardrails.
12. Painel "Receita Recuperada" + A/B testing.

### Fase 3 — Otimização e escala (contínuo) — *Should / Could*
13. Migração OLTP D1 → Postgres quando o volume exigir.
14. Modelo de ML para o score (quando houver dados rotulados).
15. Multi-canal avançado, melhor-horário por ML, monitor de CNAEs em tempo quase real.

### Won't (por ora)
- Uso da API oficial SERPRO/Conecta (restrita a órgãos públicos).
- Score de crédito de PF dos sócios (passivo LGPD sem base legal própria).

---

## 10. KPIs de Produto

| Camada | KPI | Por quê |
|---|---|---|
| North Star | R$ recuperado / R$ de custo operacional | Eficácia + eficiência juntas |
| Base Viva | % de cobertura da categoria (empresas mapeadas / empresas reais no escopo) | Mede o moat de dados |
| Base Viva | Tempo médio "empresa abriu → 1ª cobrança" | Velocidade de captura de receita nova |
| RRA | Taxa de recuperação (pago / em aberto elegível) | Eficácia da cobrança |
| RRA | Custo por real recuperado | Eficiência de canal |
| Relação | Taxa de opt-out / reclamação | Saúde da relação sindicato↔empresa |
| Negociação | % de acordos fechados sem intervenção humana | Grau de automação |

---

## 11. Riscos, Compliance e Dependências

| Risco | Mitigação |
|---|---|
| Prazo CNPJ alfanumérico (jul/2026) | Item P0; homologar antes de abr/2026 |
| Dados de sócios (LGPD) | Legítimo interesse documentado + canal de oposição + minimização |
| API oficial RFB restrita | Usar Dados Abertos públicos + APIs comerciais sob contrato para enriquecimento |
| Reputação do número WhatsApp (bloqueio) | Anti-fadiga, opt-out, templates aprovados pela Meta |
| Custo de APIs pagas escalando | Enriquecimento on-demand (não varredura), cache, preferir fontes gratuitas |
| Auto-match de conciliação errado | Subir limiar, exigir match de valor+data, confirmação humana acima de X reais |
| Cobrança de empresa baixada | Evento `empresa.baixada` encerra cobranças automaticamente |

---

## 12. Próximos Passos Sugeridos
1. Validar este blueprint e priorizar Fase 0 + Fase 1 (são os que destravam o diferencial e tiram o risco regulatório da mesa).
2. Definir o **escopo piloto** (1 sindicato, 1 CNAE, 1–3 municípios) para provar a Base Viva + RRA ponta a ponta.
3. A partir daí, gerar o código módulo a módulo: começar pela função de validação de CNPJ alfanumérico e pelo pipeline de ingestão RFB→BigQuery.

---

*Documento de análise/redesign. Os pontos sobre CNPJ alfanumérico (IN RFB 2.229/2024, jul/2026), Dados Abertos CNPJ (atualização mensal) e restrição da API oficial Conecta/SERPRO foram verificados em fontes públicas atuais.*
