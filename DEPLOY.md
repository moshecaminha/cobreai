# Deploy do COBRE.ai na Vercel

O projeto já está **compilado e validado** (`npm run build` passou). Banco de produção
no ar no Supabase `cobreai-prod` (região São Paulo), com schema e RLS aplicados.

## Variáveis de ambiente (defina na Vercel)
| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ltizczxquvplietbtekv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_RyLT9kcCqxN9dt2FrNXuZg_Exi2EY8s` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(copie em Supabase → Project Settings → API → service_role; NÃO compartilhe)* |

A chave da Casa dos Dados não vai em env global: ela é salva por sindicato em
`empresas.casadosdados_api_key`.

## Opção 1 — Vercel CLI (mais rápido)
```bash
npm i -g vercel
cd cobreai
vercel              # faz login e cria o projeto
# adicione as 3 variáveis acima quando solicitado (ou em Settings → Environment Variables)
vercel --prod       # publica em produção
```

## Opção 2 — GitHub + Vercel (deploy contínuo)
1. Crie um repositório no GitHub e suba a pasta `cobreai/`.
2. Na Vercel: **New Project → Import** o repositório.
3. Em **Environment Variables**, cole as 3 variáveis acima.
4. **Deploy**. A partir daí, todo `git push` re-publica.

## Configuração de Auth no Supabase (necessário para o login funcionar)
Em **Supabase → Authentication → URL Configuration**, adicione em **Redirect URLs**:
- `https://SEU-PROJETO.vercel.app/dashboard`
- `https://cobreai.app.br/dashboard` (quando apontar o domínio)

E confirme que o provedor **Email** está habilitado (Authentication → Providers → Email).

## Domínio
Em **Vercel → Settings → Domains**, adicione `cobreai.app.br` e siga o CNAME/A indicado.

## Primeiro teste (smoke test)
1. Acesse a home → **Entrar** → receba o link por e-mail → cai no `/dashboard`.
2. Os KPIs aparecem zerados (banco novo) — isso confirma a conexão e o RLS.
3. Próximo passo de produto: tela de **Escopo Sindical** + botão que chama
   `POST /api/escopos/:id/sync` para popular a base via Casa dos Dados.
