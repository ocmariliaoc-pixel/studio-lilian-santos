"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, CreditCard, EyeOff, FileUp, Loader2, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatMoeda } from "@/lib/format";
import { dataBR } from "@/lib/financeiro";
import { ehRepasseCartao } from "@/lib/extrato-ton";
import { cn } from "@/lib/utils";
import { ignorarMovimento, importarExtrato, lancarDoExtrato, type ImportacaoState } from "./actions";
import { semResetar } from "@/lib/form";

export type Movimento = {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  descricao: string;
  meio: string | null;
  valor: number;
  lancamento_id: string | null;
  ignorado: boolean;
  lancamento: { descricao: string; cliente_nome: string | null } | null;
};

export function UploadExtrato() {
  const [state, action, pending] = useActionState<ImportacaoState, FormData>(importarExtrato, {});
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  return (
    <form onSubmit={semResetar(action)} className="bg-card space-y-3 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <FileUp className="text-gold-dark mt-0.5 size-5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">Subir extrato da maquininha</p>
          <p className="text-muted-foreground text-xs">
            No app da Ton: Extrato → período → Exportar PDF. Pode subir o mesmo período de novo: nada é duplicado.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* input escondido: o botão e o texto ficam em português em qualquer navegador */}
        <label className="hover:bg-secondary flex h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium">
          <FileUp className="size-4" />
          Escolher PDF do extrato
          <input
            type="file"
            name="arquivo"
            accept="application/pdf,.pdf"
            required
            className="sr-only"
            onChange={(e) => setNomeArquivo(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        <span className="text-muted-foreground min-w-0 truncate text-sm">{nomeArquivo ?? "Nenhum arquivo escolhido"}</span>
        <Button type="submit" disabled={pending || !nomeArquivo}>
          {pending ? <Loader2 className="animate-spin" /> : <FileUp />}
          Importar
        </Button>
      </div>
      {state.resumo && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{state.resumo}</p>}
      {state.erro && <p className="text-destructive text-sm">{state.erro}</p>}
    </form>
  );
}

export function ListaExtrato({ movimentos, admin }: { movimentos: Movimento[]; admin: boolean }) {
  const [pendente, iniciar] = useTransition();
  function rodar(fn: () => Promise<{ ok?: boolean; erro?: string }>, msg: string) {
    iniciar(async () => {
      const r = await fn();
      if (r.ok) toast.success(msg);
      else toast.error(r.erro);
    });
  }

  if (movimentos.length === 0)
    return <p className="text-muted-foreground bg-card rounded-xl border border-dashed p-6 text-center text-sm">Nenhum extrato importado ainda.</p>;

  return (
    <ul className="bg-card divide-y overflow-hidden rounded-xl border">
      {movimentos.map((m) => {
        const cartao = ehRepasseCartao(m);
        const estado = m.lancamento_id ? "ok" : m.ignorado ? "ignorado" : cartao ? "cartao" : "falta";
        return (
          <li key={m.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3", estado === "ignorado" && "opacity-50")}>
            <span className="text-muted-foreground w-12 text-xs tabular-nums">{dataBR(m.data).slice(0, 5)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{m.descricao}</span>
              <span className="text-muted-foreground block truncate text-xs">
                {m.meio}
                {m.lancamento && ` · no caixa: ${m.lancamento.descricao}`}
              </span>
            </span>
            <span className={cn("w-24 text-right font-semibold tabular-nums", m.tipo === "saida" && "text-rose-700")}>
              {m.tipo === "saida" ? "−" : ""}
              {formatMoeda(m.valor)}
            </span>
            <span className="flex w-full items-center justify-end gap-2 sm:w-auto">
              {estado === "ok" && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="size-4" /> no caixa
                </span>
              )}
              {estado === "cartao" && (
                <span className="flex items-center gap-1 text-xs font-medium text-sky-800">
                  <CreditCard className="size-4" /> repasse do cartão
                </span>
              )}
              {estado === "falta" && admin && (
                <>
                  <Button size="sm" disabled={pendente} onClick={() => rodar(() => lancarDoExtrato(m.id), "Lançado no caixa")}>
                    <Plus /> Lançar no caixa
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pendente} onClick={() => rodar(() => ignorarMovimento(m.id, true), "Ignorado")}>
                    <EyeOff /> Ignorar
                  </Button>
                </>
              )}
              {estado === "ignorado" && admin && (
                <Button size="sm" variant="ghost" disabled={pendente} onClick={() => rodar(() => ignorarMovimento(m.id, false), "Reaberto")}>
                  <RotateCcw /> Reabrir
                </Button>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
