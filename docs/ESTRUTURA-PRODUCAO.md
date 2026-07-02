# COBRE.AI 2.0 — Estrutura do Projeto e Subida em Produção

## Stack de produção
| Camada | Tecnologia | Onde |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui | Vercel |
| Banco / Auth / Storage | Supabase (Postgres 17, Auth, Storage, Edge Functions) | região `sa-east-1` (SP) |
| Dados da Receita | Casa dos Dados API v5 (pré-paga, header `api-key`) | por tenant |
| Pagamentos | PIX EMV + Boleto + Stripe (cartão) | — |
| Mensageria | WhatsApp Cloud API + e-mail | por tenant |

## Estrutura de pastas
```
cobreai/
├─ supabase/
│  └─ migrations/
│     └─ 0001_fundacao.sql        # núcleo multi-tenant + RLS + base sindical + RRA
├─ src/
│  ├─ lib/
│  │  ├─ casadosdados.ts          # cliente Casa dos Dados v5 + motor de leads
│  │  └─ supabase.ts              # clients server/browser (a criar)
│  └─ app/                        # rotas Next.js (a criar)
│     ├─ (public)/                # landing, login, /pagar/[token]
│     ├─ (dashboard)/             # área autenticada
│     └─ api/                     # rotas de servidor (sync, rra, webhooks)
├─ .env.local                     # segredos (NUNCA versionar)
└─ package.json
```

## Modelo de dados (migration 0001)
Núcleo: `empresas` (tenants) · `usuarios` (ligados ao Supabase Auth) · `clientes` · `cobrancas` · `pagamentos` · `convencao_coletiva`.
Motor de Base: `escopos_sindicais` · `empresas_base` · `sync_receita`.
Motor RRA: `scores_cobranca` · `rra_decisoes` · `regua_cobranca` · `templates_mensagem` · `logs_comunicacao`.
Governança: `notificacoes` · `eventos_auditoria` · `lgpd_solicitacoes`.
Tudo com **Row Level Security** por `empresa_id` (isolamento de tenant) + papel `admin_saas`.

## Fluxo dos dois motores
**Base Sindical (Receita):** Escopo (CNAE + município) → `pesquisar()` / `gerarArquivo()` na Casa dos Dados → normaliza (`mapEmpresa`) → grava em `empresas_base` → `sync_receita` registra deltas. Leads novos via `filtroEmpresasNovas()` (`data_abertura.ultimos_dias`).

**RRA:** cobrança criada → `scores_cobranca` (propensão) → fila por valor esperado → `rra_decisoes` (canal/horário/tom/oferta) → execução (PIX/WhatsApp) → `pagamento.confirmado` realimenta o score.

## Runbook de subida em produção
1. **Criar projeto Supabase** `cobreai-prod` (org atual, `sa-east-1`) — US$ 10/mês. *(requer sua confirmação)*
2. **Aplicar migration** `0001_fundacao.sql`.
3. **Configurar Auth** (telefone/OTP ou e-mail) e o trigger que cria `usuarios` no primeiro login.
4. **Variáveis de ambiente** na Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `CASADOSDADOS_API_KEY` *(você gera em portal.casadosdados.com.br/plataforma/api/chave e cadastra — eu não manipulo segredos)*
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (quando ativar cartão)
5. **Conectar repositório à Vercel** e fazer o primeiro deploy (preview → produção). *(deploy em produção requer sua confirmação)*
6. **Apontar domínio** `cobreai.app.br` para a Vercel (CNAME/A).
7. **Smoke test:** cadastro de sindicato → criar escopo → sync Casa dos Dados → criar cobrança → página pública `/pagar/[token]`.

## Decisões pendentes (preciso da sua resposta)
- Criar o projeto Supabase `cobreai-prod` agora (US$ 10/mês)?
- Migrar dados da plataforma atual (`cobreai.app.br`) ou começar base limpa?
- Auth por telefone (OTP/SMS, como hoje) ou e-mail+OTP (mais barato, sem Twilio)?
