import { Construction } from "lucide-react";

export default function EmConstrucao({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold text-ink-100">{titulo}</h1>
      {descricao && <p className="mt-1 text-ink-300">{descricao}</p>}
      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-20 text-center">
        <Construction className="text-amber-500" size={40} />
        <p className="mt-4 font-display text-lg text-ink-100">Módulo em construção</p>
        <p className="mt-1 max-w-md text-sm text-ink-500">
          Estamos reconstruindo este módulo no COBRE.ai 2.0. Em breve disponível aqui.
        </p>
      </div>
    </div>
  );
}
