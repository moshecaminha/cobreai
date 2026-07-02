"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Users, FileText, Megaphone, Layers, List, Handshake,
  Ruler, CalendarClock, MessageSquare, Sparkles, Radar, Database, ScrollText,
  DollarSign, Wallet, TrendingUp, Scale, BarChart3, UserCog, Building2, Settings,
  Bell, LogOut, Menu, X,
} from "lucide-react";

type Item = { href: string; label: string; icon: any; ready?: boolean };
type Group = { titulo: string; itens: Item[] };

const MENU: Group[] = [
  { titulo: "Cobranças", itens: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ready: true },
    { href: "/dashboard/clientes", label: "Clientes", icon: Users },
    { href: "/dashboard/cobrancas", label: "Cobranças", icon: FileText },
    { href: "/dashboard/campanhas", label: "Campanhas", icon: Megaphone },
    { href: "/dashboard/lotes", label: "Lotes", icon: Layers },
    { href: "/dashboard/negociacoes", label: "Negociações", icon: Handshake },
    { href: "/dashboard/regua", label: "Régua", icon: Ruler },
    { href: "/dashboard/agendamentos", label: "Agendamentos", icon: CalendarClock },
    { href: "/dashboard/templates", label: "Templates", icon: MessageSquare },
  ]},
  { titulo: "Prospecção", itens: [
    { href: "/dashboard/assistente", label: "Assistente", icon: Sparkles },
    { href: "/dashboard/monitor-cnaes", label: "Monitor CNAEs", icon: Radar },
    { href: "/dashboard/escopos", label: "Bases / Listas", icon: Database, ready: true },
    { href: "/dashboard/convencao", label: "Convenção", icon: ScrollText },
  ]},
  { titulo: "Financeiro", itens: [
    { href: "/dashboard/pagamentos", label: "Pagamentos", icon: DollarSign },
    { href: "/dashboard/contas-a-pagar", label: "Contas a Pagar", icon: Wallet },
    { href: "/dashboard/fluxo-caixa", label: "Fluxo de Caixa", icon: TrendingUp },
    { href: "/dashboard/conciliacao", label: "Conciliação", icon: Scale },
    { href: "/dashboard/relatorios", label: "Relatórios", icon: BarChart3 },
  ]},
  { titulo: "Sistema", itens: [
    { href: "/dashboard/usuarios", label: "Usuários", icon: UserCog },
    { href: "/dashboard/empresa", label: "Empresa", icon: Building2, ready: true },
    { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
  ]},
];

export default function AppShell({
  nome, email, children,
}: { nome: string; email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const iniciais = (nome || email || "?").slice(0, 2).toUpperCase();

  const Nav = (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <Link href="/dashboard" className="px-3 font-display text-xl tracking-tight text-white">
        Cobre<span className="text-recover-500">.ai</span>
      </Link>
      {MENU.map((g) => (
        <div key={g.titulo}>
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">{g.titulo}</div>
          <div className="space-y-0.5">
            {g.itens.map((i) => {
              const ativo = pathname === i.href || (i.href !== "/dashboard" && pathname.startsWith(i.href));
              const Icon = i.icon;
              return (
                <Link key={i.href} href={i.href} onClick={() => setAberto(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition
                    ${ativo ? "bg-recover-500 font-medium text-navy-900" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                  <Icon size={17} />
                  <span className="flex-1">{i.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      <div className="mt-auto px-3 pt-4 text-[10px] text-white/30">COBRE.ai · v2.0</div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-navy-800 md:block">{Nav}</aside>

      {/* Sidebar mobile */}
      {aberto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAberto(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-white/10 bg-navy-800">{Nav}</aside>
        </div>
      )}

      <div className="md:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-navy-800/80 px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-white/70" onClick={() => setAberto(true)}><Menu size={20} /></button>
            <span className="font-display text-sm text-white/90">{nome || "Meu sindicato"}</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative text-white/60 hover:text-white"><Bell size={18} /></button>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-recover-500 text-xs font-bold text-navy-900">{iniciais}</span>
              <form action="/auth/signout" method="post">
                <button className="text-white/50 hover:text-white" title="Sair"><LogOut size={17} /></button>
              </form>
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
