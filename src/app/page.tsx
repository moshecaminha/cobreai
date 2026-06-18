import Link from "next/link";

function Wordmark() {
  return (
    <span className="font-display text-xl tracking-tight">
      Cobre<span className="text-recover-500">.ai</span>
    </span>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark />
        <nav className="flex items-center gap-6 text-sm text-ink-300">
          <a href="#motores" className="hover:text-ink-100">Como funciona</a>
          <Link
            href="/login"
            className="rounded-lg bg-recover-500 px-4 py-2 font-medium text-navy-900 transition hover:bg-recover-400"
          >
            Entrar
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-10 md:pt-20">
        <p className="rise mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-300">
          <span className="h-1.5 w-1.5 rounded-full bg-recover-500" /> Cobrança sindical · dados da Receita
        </p>
        <h1 className="rise font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
          Toda empresa da sua categoria,<br />
          <span className="text-recover-400">mapeada e cobrada</span> sozinha.
        </h1>
        <p className="rise mt-6 max-w-2xl text-lg text-ink-300">
          O COBRE.ai descobre as empresas do seu CNAE em cada cidade direto na base da Receita,
          mantém o cadastro vivo e recupera a contribuição sindical automaticamente — sem
          operação manual e sem queimar a relação com a categoria.
        </p>
        <div className="rise mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-lg bg-recover-500 px-5 py-3 font-medium text-navy-900 transition hover:bg-recover-400">
            Acessar a plataforma
          </Link>
          <a href="#motores" className="rounded-lg border border-white/15 px-5 py-3 font-medium text-ink-100 transition hover:bg-white/5">
            Ver os dois motores
          </a>
        </div>
      </section>

      {/* Os dois motores — é o conteúdo real do produto, não decoração */}
      <section id="motores" className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-navy-800/60 p-7">
            <div className="mb-3 text-xs font-medium uppercase tracking-widest text-recover-400">Motor 1</div>
            <h2 className="font-display text-2xl font-bold">Base sindical viva</h2>
            <p className="mt-3 text-ink-300">
              Você define o escopo — CNAEs e municípios da categoria. A plataforma busca na Receita,
              materializa a base e detecta automaticamente quem abriu, fechou ou mudou de atividade.
              Empresa nova no escopo vira cobrança no mesmo dia.
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-navy-800/60 p-7">
            <div className="mb-3 text-xs font-medium uppercase tracking-widest text-recover-400">Motor 2</div>
            <h2 className="font-display text-2xl font-bold">Recuperação automática</h2>
            <p className="mt-3 text-ink-300">
              Cada cobrança recebe um score de propensão a pagar. A plataforma prioriza por valor
              esperado, escolhe canal, horário e tom, apresenta proposta de acordo dentro dos seus
              limites e fecha sozinha — você acompanha a receita recuperada, não o número de disparos.
            </p>
          </article>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {[
            ["PIX · Boleto · Cartão", "Pagamento em 2 cliques na página pública."],
            ["WhatsApp · E-mail · SMS", "Régua inteligente, sem spam à categoria."],
            ["Multi-tenant + LGPD", "Dados isolados por sindicato, com trilha de auditoria."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <div className="font-display font-medium">{t}</div>
              <p className="mt-1 text-sm text-ink-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-ink-500">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <Wordmark />
          <span>© {new Date().getFullYear()} COBRE.ai · cobreai.app.br</span>
        </div>
      </footer>
    </main>
  );
}
