-- ============================================================================
-- COBRE.AI 2.0  ·  Migration 0001 — Fundação
-- Postgres 17 / Supabase  ·  Multi-tenant com Row Level Security
-- Núcleo de cobrança + Motor de Base Sindical (Receita) + Motor RRA
-- ============================================================================
-- Observação CNPJ: mantido no modelo atual (string sem máscara). Campo TEXT
-- para não travar futura migração ao formato alfanumérico (jul/2026).
-- ============================================================================

create extension if not exists "pgcrypto";          -- gen_random_uuid()
create extension if not exists "pg_trgm";            -- similaridade p/ conciliação

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type role_usuario       as enum ('owner','financeiro','operador','viewer','admin_saas');
create type tipo_documento      as enum ('CPF','CNPJ');
create type status_cobranca     as enum ('pendente','pago','vencido','cancelado','negociando');
create type metodo_pagamento    as enum ('pix','boleto','cartao','dinheiro','outro');
create type situacao_cadastral  as enum ('ATIVA','BAIXADA','INAPTA','SUSPENSA','NULA');
create type canal_comunicacao   as enum ('whatsapp','email','sms');
create type status_sync         as enum ('pendente','executando','concluido','erro');

-- ============================================================================
-- 1. TENANTS (empresas que usam a plataforma — sindicatos)
-- ============================================================================
create table empresas (
  id                          uuid primary key default gen_random_uuid(),
  nome                        text not null,
  cnpj                        text unique,
  email                       text,
  telefone                    text,
  endereco                    text, cidade text, estado text, cep text,
  logo_url                    text,
  plano                       text default 'trial',
  is_ativo                    boolean default true,

  -- integrações por tenant
  config_whatsapp_token       text,
  config_whatsapp_phone_id    text,
  config_pix_chave            text,
  config_pix_tipo             text,
  config_boleto_beneficiario  text,
  config_boleto_banco         text,
  casadosdados_api_key        text,           -- chave da Casa dos Dados do tenant

  -- limites de negociação
  neg_desconto_minimo         numeric(5,2) default 0,
  neg_desconto_maximo         numeric(5,2) default 20,
  neg_parcelas_maximas        int default 12,
  neg_entrada_minima_percent  numeric(5,2) default 10,

  stripe_customer_id          text,
  stripe_subscription_id      text,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

-- ============================================================================
-- 2. USUÁRIOS (vinculados ao Supabase Auth)
-- ============================================================================
create table usuarios (
  id                  uuid primary key references auth.users(id) on delete cascade,
  empresa_id          uuid not null references empresas(id) on delete cascade,
  nome                text not null,
  email               text,
  telefone            text,
  role                role_usuario not null default 'operador',
  avatar_url          text,
  is_ativo            boolean default true,
  ultimo_acesso_at    timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index idx_usuarios_empresa on usuarios(empresa_id);

-- Helper: tenant do usuário autenticado (usado em todas as policies)
create or replace function current_empresa_id()
returns uuid language sql stable security definer set search_path = public as $$
  select empresa_id from usuarios where id = auth.uid()
$$;

create or replace function is_admin_saas()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from usuarios where id = auth.uid() and role = 'admin_saas')
$$;

-- ============================================================================
-- 3. CLIENTES (devedores)
-- ============================================================================
create table clientes (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresas(id) on delete cascade,
  nome            text not null,
  documento       text,                         -- CPF/CNPJ sem máscara
  tipo_documento  tipo_documento,
  email           text, telefone text, whatsapp text,
  endereco text, numero text, complemento text, bairro text,
  cidade text, estado text, cep text,
  observacoes     text,
  is_ativo        boolean default true,
  total_divida    numeric(14,2) default 0,
  total_pago      numeric(14,2) default 0,
  health_score    int,                           -- 0-100 (calculado)
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_clientes_empresa on clientes(empresa_id);
create index idx_clientes_documento on clientes(empresa_id, documento);
create index idx_clientes_nome_trgm on clientes using gin (nome gin_trgm_ops);

-- ============================================================================
-- 4. CONVENÇÕES COLETIVAS (regra de cálculo da contribuição)
-- ============================================================================
create table convencao_coletiva (
  id                       uuid primary key default gen_random_uuid(),
  empresa_id               uuid not null references empresas(id) on delete cascade,
  nome                     text not null,
  ano_vigencia             int,
  valor_base               numeric(14,2) default 0,
  valor_por_funcionario    numeric(14,2) default 0,
  valor_minimo             numeric(14,2),
  valor_maximo             numeric(14,2),
  percentual_capital_social numeric(7,4),
  data_vencimento_date     date,
  is_ativo                 boolean default true,
  observacoes              text,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);
create index idx_convencao_empresa on convencao_coletiva(empresa_id);

-- ============================================================================
-- 5. ESCOPO SINDICAL  (MOTOR DE BASE — Receita / Casa dos Dados)
--    Define CNAE + território; o sync materializa a base.
-- ============================================================================
create table escopos_sindicais (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresas(id) on delete cascade,
  nome                  text not null,
  cnaes_principais      text[] default '{}',     -- ['7112000', ...]
  cnaes_secundarios     text[] default '{}',
  incluir_secundaria    boolean default true,
  ufs                   text[] default '{}',     -- ['PE','SP']
  municipios            text[] default '{}',     -- nomes (filtro Casa dos Dados)
  situacao_alvo         situacao_cadastral default 'ATIVA',
  porte_codigos         text[] default '{}',
  capital_social_min    numeric(14,2),
  data_abertura_min     date,
  convencao_id          uuid references convencao_coletiva(id),
  total_empresas        int default 0,
  ultima_sincronizacao_at timestamptz,
  is_ativo              boolean default true,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);
create index idx_escopos_empresa on escopos_sindicais(empresa_id);

-- Empresas descobertas na base (resultado do sync com a Receita)
create table empresas_base (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresas(id) on delete cascade,
  escopo_id             uuid references escopos_sindicais(id) on delete set null,
  cnpj                  text not null,
  razao_social          text,
  nome_fantasia         text,
  cnae_principal        text,
  cnae_descricao        text,
  situacao_cadastral    situacao_cadastral,
  data_abertura         date,
  natureza_juridica     text,
  capital_social        numeric(14,2),
  porte                 text,
  quantidade_funcionarios int,
  funcionarios_estimados  int,
  email text, telefone text,
  endereco text, numero text, bairro text, cidade text, estado text, cep text,
  fonte_dados           text default 'casadosdados',
  dados_atualizados_at  timestamptz,
  valor_cobranca        numeric(14,2),
  is_contatado          boolean default false,
  is_cliente            boolean default false,
  cliente_id            uuid references clientes(id) on delete set null,
  observacoes           text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  unique (empresa_id, cnpj)
);
create index idx_empbase_empresa on empresas_base(empresa_id);
create index idx_empbase_escopo on empresas_base(escopo_id);
create index idx_empbase_cnae on empresas_base(empresa_id, cnae_principal);

-- Log de sincronizações com a Receita (auditoria do motor de base)
create table sync_receita (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresas(id) on delete cascade,
  escopo_id         uuid references escopos_sindicais(id) on delete cascade,
  novas_empresas    int default 0,
  empresas_baixadas int default 0,
  empresas_alteradas int default 0,
  creditos_gastos   int default 0,
  status            status_sync default 'pendente',
  iniciado_at       timestamptz default now(),
  concluido_at      timestamptz,
  erro              text
);
create index idx_syncreceita_empresa on sync_receita(empresa_id);

-- ============================================================================
-- 6. COBRANÇAS  +  PAGAMENTOS
-- ============================================================================
create table cobrancas (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references empresas(id) on delete cascade,
  cliente_id          uuid not null references clientes(id) on delete cascade,
  numero              text,
  descricao           text,
  valor               numeric(14,2) not null,
  valor_pago          numeric(14,2) default 0,
  valor_juros         numeric(14,2) default 0,
  valor_multa         numeric(14,2) default 0,
  valor_desconto      numeric(14,2) default 0,
  vencimento_date     date not null,
  pagamento_date      date,
  status              status_cobranca default 'pendente',
  metodo_pagamento    metodo_pagamento,
  pix_codigo          text, pix_qrcode_url text,
  boleto_linha_digitavel text, boleto_url text,
  parcela_atual       int default 1,
  parcela_total       int default 1,
  token_publico       text unique default encode(gen_random_bytes(16),'hex'),
  convencao_id        uuid references convencao_coletiva(id),
  funcionarios_estimados int,
  observacoes         text,
  idempotency_key     text unique,             -- anti-duplicidade
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index idx_cobrancas_empresa on cobrancas(empresa_id);
create index idx_cobrancas_cliente on cobrancas(cliente_id);
create index idx_cobrancas_status_venc on cobrancas(empresa_id, status, vencimento_date);

create table pagamentos (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresas(id) on delete cascade,
  cobranca_id     uuid references cobrancas(id) on delete set null,
  cliente_id      uuid references clientes(id) on delete set null,
  valor           numeric(14,2) not null,
  metodo          metodo_pagamento,
  status          text default 'confirmado',
  transacao_id    text,
  comprovante_url text,
  conciliado_at   timestamptz,
  idempotency_key text unique,
  created_at      timestamptz default now()
);
create index idx_pagamentos_empresa on pagamentos(empresa_id);

-- ============================================================================
-- 7. MOTOR RRA — Recuperação Automática de Receita
-- ============================================================================
-- Score preditivo por cobrança
create table scores_cobranca (
  id                          uuid primary key default gen_random_uuid(),
  empresa_id                  uuid not null references empresas(id) on delete cascade,
  cobranca_id                 uuid not null references cobrancas(id) on delete cascade,
  cliente_id                  uuid references clientes(id) on delete cascade,
  score                       int,                   -- 0-100
  probabilidade_pagar         numeric(5,4),          -- 0-1
  valor_esperado_recuperacao  numeric(14,2),
  fatores_json                jsonb,                 -- explicabilidade
  modelo_versao               text default 'regras_v1',
  calculado_at                timestamptz default now()
);
create index idx_scores_empresa on scores_cobranca(empresa_id);
create index idx_scores_fila on scores_cobranca(empresa_id, valor_esperado_recuperacao desc);

-- Decisões e experimentos do motor (canal/horário/tom/oferta)
create table rra_decisoes (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresas(id) on delete cascade,
  cobranca_id     uuid not null references cobrancas(id) on delete cascade,
  canal           canal_comunicacao,
  horario_envio   time,
  tom             text,                              -- amigavel|lembrete|formal|urgente
  oferta_json     jsonb,
  variante_ab     text,
  resultado       text,                              -- pago|ignorado|negociado|erro
  enviado_at      timestamptz default now(),
  respondido_at   timestamptz
);
create index idx_rra_empresa on rra_decisoes(empresa_id);

-- Régua de cobrança (gatilhos) + templates + logs
create table regua_cobranca (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas(id) on delete cascade,
  nome          text not null,
  dias_offset   int not null,                        -- -5 = 5 dias antes; +3 = depois
  template_id   uuid,
  horario_envio time default '09:00',
  enviar_whatsapp boolean default true,
  enviar_email    boolean default false,
  enviar_sms      boolean default false,
  is_ativo      boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index idx_regua_empresa on regua_cobranca(empresa_id);

create table templates_mensagem (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  nome        text not null,
  tipo        text,                                  -- cobranca|lembrete|confirmacao|negociacao
  conteudo    text not null,                         -- com {nome} {valor} {vencimento} {link}
  is_ativo    boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index idx_templates_empresa on templates_mensagem(empresa_id);

create table logs_comunicacao (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references empresas(id) on delete cascade,
  cliente_id          uuid references clientes(id) on delete set null,
  cobranca_id         uuid references cobrancas(id) on delete set null,
  canal               canal_comunicacao,
  tipo                text,
  destinatario        text,
  conteudo            text,
  status              text,                          -- enviado|entregue|lido|erro
  whatsapp_message_id text,
  template_id         uuid references templates_mensagem(id) on delete set null,
  erro                text,
  created_at          timestamptz default now()
);
create index idx_logs_empresa on logs_comunicacao(empresa_id);

-- ============================================================================
-- 8. NOTIFICAÇÕES + AUDITORIA + LGPD
-- ============================================================================
create table notificacoes (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  usuario_id  uuid references usuarios(id) on delete cascade,
  tipo        text,
  titulo      text, mensagem text, link text,
  is_lida     boolean default false,
  created_at  timestamptz default now()
);
create index idx_notif_usuario on notificacoes(usuario_id, is_lida);

create table eventos_auditoria (
  id          bigint generated always as identity primary key,
  empresa_id  uuid references empresas(id) on delete set null,
  ator_tipo   text, ator_id uuid,
  acao        text not null,
  entidade    text, entidade_id text,
  payload     jsonb,
  ip          inet,
  created_at  timestamptz default now()
);
create index idx_audit_empresa on eventos_auditoria(empresa_id, created_at desc);

create table lgpd_solicitacoes (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references empresas(id) on delete cascade,
  titular_doc  text,
  tipo         text,                                 -- acesso|oposicao|exclusao
  status       text default 'aberta',
  detalhes     text,
  created_at   timestamptz default now(),
  resolvido_at timestamptz
);

-- ============================================================================
-- 9. ROW LEVEL SECURITY — isolamento por tenant
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'empresas','usuarios','clientes','convencao_coletiva','escopos_sindicais',
    'empresas_base','sync_receita','cobrancas','pagamentos','scores_cobranca',
    'rra_decisoes','regua_cobranca','templates_mensagem','logs_comunicacao',
    'notificacoes','eventos_auditoria','lgpd_solicitacoes'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- Política padrão para tabelas com empresa_id: só enxerga o próprio tenant
-- (admin_saas enxerga tudo). Aplicada individualmente abaixo.
do $$
declare t text;
begin
  foreach t in array array[
    'clientes','convencao_coletiva','escopos_sindicais','empresas_base',
    'sync_receita','cobrancas','pagamentos','scores_cobranca','rra_decisoes',
    'regua_cobranca','templates_mensagem','logs_comunicacao','lgpd_solicitacoes'
  ] loop
    execute format($p$
      create policy tenant_isolation on %I
      using (empresa_id = current_empresa_id() or is_admin_saas())
      with check (empresa_id = current_empresa_id() or is_admin_saas());
    $p$, t);
  end loop;
end $$;

-- empresas: usuário vê a própria empresa; admin_saas vê todas
create policy empresa_self on empresas
  using (id = current_empresa_id() or is_admin_saas())
  with check (id = current_empresa_id() or is_admin_saas());

-- usuarios: vê colegas do mesmo tenant
create policy usuarios_tenant on usuarios
  using (empresa_id = current_empresa_id() or is_admin_saas())
  with check (empresa_id = current_empresa_id() or is_admin_saas());

-- notificacoes: só as suas
create policy notif_self on notificacoes
  using (usuario_id = auth.uid() or is_admin_saas())
  with check (empresa_id = current_empresa_id() or is_admin_saas());

-- auditoria: leitura pelo tenant
create policy audit_tenant on eventos_auditoria
  for select using (empresa_id = current_empresa_id() or is_admin_saas());

-- ============================================================================
-- 10. updated_at automático
-- ============================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'empresas','usuarios','clientes','convencao_coletiva','escopos_sindicais',
    'empresas_base','cobrancas','regua_cobranca','templates_mensagem'
  ] loop
    execute format(
      'create trigger trg_%1$s_updated before update on %1$s
       for each row execute function set_updated_at();', t);
  end loop;
end $$;
