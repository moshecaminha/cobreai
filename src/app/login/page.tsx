"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function Login() {
  const router = useRouter();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErro(null); setMsg(null); setLoading(true);
    const sb = supabaseBrowser();

    if (modo === "criar") {
      const { error } = await sb.auth.signUp({
        email,
        password: senha,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      });
      setLoading(false);
      if (error) return setErro(traduz(error.message));
      setMsg("Conta criada! Enviamos um e-mail de confirmação. Confirme para liberar o acesso.");
      return;
    }

    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) return setErro(traduz(error.message));
    router.push("/dashboard");
    router.refresh();
  }

  function traduz(m: string) {
    if (/invalid login/i.test(m)) return "E-mail ou senha incorretos.";
    if (/not confirmed/i.test(m)) return "Confirme seu e-mail antes de entrar.";
    if (/rate limit/i.test(m)) return "Muitas tentativas de e-mail. Aguarde alguns minutos.";
    if (/at least/i.test(m)) return "A senha precisa ter no mínimo 6 caracteres.";
    if (/already registered/i.test(m)) return "Este e-mail já tem conta. Use Entrar.";
    return "Não foi possível concluir. Tente novamente.";
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-navy-800/60 p-8">
        <Link href="/" className="font-display text-lg tracking-tight">
          Cobre<span className="text-recover-500">.ai</span>
        </Link>

        <div className="mt-6 flex rounded-lg border border-white/10 p-1 text-sm">
          <button onClick={() => { setModo("entrar"); setErro(null); setMsg(null); }}
            className={`flex-1 rounded-md py-1.5 ${modo === "entrar" ? "bg-recover-500 text-navy-900 font-medium" : "text-ink-300"}`}>
            Entrar
          </button>
          <button onClick={() => { setModo("criar"); setErro(null); setMsg(null); }}
            className={`flex-1 rounded-md py-1.5 ${modo === "criar" ? "bg-recover-500 text-navy-900 font-medium" : "text-ink-300"}`}>
            Criar conta
          </button>
        </div>

        {msg ? (
          <p className="mt-6 text-sm text-recover-400">{msg}</p>
        ) : (
          <div className="mt-5">
            <label className="block text-xs text-ink-500">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@sindicato.org.br"
              className="mt-1 w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2.5 text-ink-100 outline-none focus:border-recover-500" />

            <label className="mt-4 block text-xs text-ink-500">Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
              placeholder="mínimo 6 caracteres"
              className="mt-1 w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2.5 text-ink-100 outline-none focus:border-recover-500" />

            {erro && <p className="mt-3 text-sm text-danger-500">{erro}</p>}

            <button onClick={submit} disabled={loading || !email || senha.length < 6}
              className="mt-5 w-full rounded-lg bg-recover-500 px-4 py-2.5 font-medium text-navy-900 transition hover:bg-recover-400 disabled:opacity-50">
              {loading ? "Aguarde…" : modo === "criar" ? "Criar conta" : "Entrar"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
