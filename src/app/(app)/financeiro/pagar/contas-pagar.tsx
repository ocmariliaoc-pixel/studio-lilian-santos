"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Check, Loader2, Pencil, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoData } from "@/components/ui/campo-data";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoeda } from "@/lib/format";
import { FORMAS_PAGAMENTO, numeroParaCampo } from "@/lib/configuracoes";
import { CATEGORIAS_SAIDA, dataBR } from "@/lib/financeiro";
import type { ContaDoMes, ContaFixa } from "@/lib/contas";
import type { AcaoState } from "@/lib/acoes";
import { cn } from "@/lib/utils";
import { desfazerPagamento, pagarConta, salvarContaFixa } from "./actions";

const SITUACAO = {
  paga: { texto: "paga", classe: "bg-emerald-50 text-emerald-900 border-emerald-200" },
  atrasada: { texto: "atrasada", classe: "bg-rose-50 text-rose-900 border-rose-200" },
  hoje: { texto: "vence hoje", classe: "bg-amber-50 text-amber-900 border-amber-200" },
  a_vencer: { texto: "a vencer", classe: "bg-secondary text-secondary-foreground" },
};

export function ContasPagar({
  itens,
  contas,
  hoje,
  admin,
}: {
  itens: ContaDoMes[];
  contas: ContaFixa[];
  hoje: string;
  admin: boolean;
}) {
  const [pagando, setPagando] = useState<ContaDoMes | null>(null);
  const [editando, setEditando] = useState<ContaFixa | null | "nova">(null);
  const [pendente, iniciar] = useTransition();
  // Tocar num quadrinho do resumo filtra a lista
  const [filtro, setFiltro] = useState<"todas" | "pagas" | "abertas" | "atrasadas">("todas");
  const listados = itens.filter((i) =>
    filtro === "pagas" ? !!i.pagamento : filtro === "abertas" ? !i.pagamento : filtro === "atrasadas" ? i.situacao === "atrasada" : true
  );

  const total = itens.reduce((s, i) => s + i.conta.valor, 0);
  const pago = itens.filter((i) => i.pagamento).reduce((s, i) => s + (i.pagamento?.valor ?? 0), 0);
  const aberto = itens.filter((i) => !i.pagamento).reduce((s, i) => s + i.conta.valor, 0);
  const atrasado = itens.filter((i) => i.situacao === "atrasada").reduce((s, i) => s + i.conta.valor, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero titulo="Contas do mês" valor={formatMoeda(total)} detalhe={`${itens.length} vencimentos`} ativo={filtro === "todas"} onClick={() => setFiltro("todas")} />
        <Numero titulo="Já pago" valor={formatMoeda(pago)} cor="text-emerald-700" detalhe={`${itens.filter((i) => i.pagamento).length} pagas · ver`} ativo={filtro === "pagas"} onClick={() => setFiltro("pagas")} />
        <Numero titulo="Falta pagar" valor={formatMoeda(aberto)} detalhe={`${itens.filter((i) => !i.pagamento).length} contas · ver`} ativo={filtro === "abertas"} onClick={() => setFiltro("abertas")} />
        <Numero titulo="Atrasado" valor={formatMoeda(atrasado)} cor={atrasado ? "text-rose-700" : ""} detalhe={`${itens.filter((i) => i.situacao === "atrasada").length} contas · ver`} ativo={filtro === "atrasadas"} onClick={() => setFiltro("atrasadas")} />
      </div>

      <details className="bg-card rounded-xl border px-4 py-3 text-sm">
        <summary className="text-muted-foreground cursor-pointer text-xs font-semibold tracking-widest uppercase">Legenda</summary>
        <dl className="mt-2 space-y-1.5">
          {[
            ["paga", "já tem saída no caixa para esse vencimento."],
            ["atrasada", "o dia de vencimento passou e ainda não foi paga."],
            ["vence hoje", "vence hoje."],
            ["a vencer", "vence mais para frente no mês."],
            ["Pagar", "registra a saída no caixa com a data do pagamento (dá para desfazer)."],
          ].map(([t, d]) => (
            <div key={t} className="grid grid-cols-[6.5rem_1fr] gap-2">
              <dt className="font-medium">{t}</dt>
              <dd className="text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
      </details>

      {filtro !== "todas" && (
        <p className="bg-secondary/60 flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-sm">
          <span>
            Mostrando só as contas{" "}
            {filtro === "pagas" ? "pagas" : filtro === "abertas" ? "que faltam pagar" : "atrasadas"} · {listados.length}
          </span>
          <button type="button" className="font-medium underline" onClick={() => setFiltro("todas")}>
            ver todas
          </button>
        </p>
      )}

      {listados.length === 0 && (
        <p className="text-muted-foreground bg-card rounded-xl border px-4 py-3 text-sm">Nenhuma conta aqui. 🎉</p>
      )}
      <ul className={cn("bg-card divide-y overflow-hidden rounded-xl border", listados.length === 0 && "hidden")}>
        {listados.map((i) => {
          const s = SITUACAO[i.situacao];
          return (
            <li key={`${i.conta.id}-${i.vencimento}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="w-14 text-center">
                <p className="text-lg leading-none font-semibold tabular-nums">{i.vencimento.slice(8)}</p>
                <p className="text-muted-foreground text-[11px]">{dataBR(i.vencimento).slice(3, 5)}/{i.vencimento.slice(2, 4)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{i.conta.nome}</p>
                <p className="text-muted-foreground text-xs">
                  {i.conta.categoria}
                  {i.pagamento && ` · paga em ${dataBR(i.pagamento.data)}`}
                </p>
              </div>
              <span className={cn("rounded border px-1.5 py-0.5 text-[11px] font-medium", s.classe)}>{s.texto}</span>
              <span className="w-24 text-right font-semibold tabular-nums">{formatMoeda(i.pagamento?.valor ?? i.conta.valor)}</span>
              {admin &&
                (i.pagamento ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pendente}
                    onClick={() =>
                      iniciar(async () => {
                        const r = await desfazerPagamento(i.pagamento!.id);
                        if (r.ok) toast.success("Pagamento desfeito");
                        else toast.error(r.erro);
                      })
                    }
                  >
                    <RotateCcw /> Desfazer
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setPagando(i)}>
                    <Check /> Pagar
                  </Button>
                ))}
            </li>
          );
        })}
      </ul>

      {admin && (
        <details className="bg-card rounded-xl border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Contas fixas cadastradas ({contas.length})</summary>
          <ul className="divide-y border-t">
            {contas.map((c) => (
              <li key={c.id} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", !c.ativo && "opacity-50")}>
                <span className="flex-1">
                  {c.nome} <span className="text-muted-foreground text-xs">· dia {c.dias.join(" e ")}</span>
                </span>
                <span className="tabular-nums">{formatMoeda(c.valor)}</span>
                <Button variant="ghost" size="icon" aria-label={`Editar ${c.nome}`} onClick={() => setEditando(c)}>
                  <Pencil />
                </Button>
              </li>
            ))}
          </ul>
          <div className="border-t p-3">
            <Button variant="outline" onClick={() => setEditando("nova")}>
              <Plus /> Nova conta fixa
            </Button>
          </div>
        </details>
      )}

      <Dialog open={!!pagando} onOpenChange={(o) => !o && setPagando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagar {pagando?.conta.nome}</DialogTitle>
            <DialogDescription>Vira uma saída no caixa, na data do pagamento.</DialogDescription>
          </DialogHeader>
          {pagando && <FormPagar key={pagando.conta.id + pagando.vencimento} item={pagando} hoje={hoje} onFeito={() => setPagando(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando === "nova" ? "Nova conta fixa" : "Editar conta fixa"}</DialogTitle>
            <DialogDescription>Valor de cada vencimento e os dias do mês em que vence.</DialogDescription>
          </DialogHeader>
          {editando && (
            <FormConta key={editando === "nova" ? "nova" : editando.id} conta={editando === "nova" ? null : editando} onFeito={() => setEditando(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormPagar({ item, hoje, onFeito }: { item: ContaDoMes; hoje: string; onFeito: () => void }) {
  const [state, action, pending] = useActionState<AcaoState, FormData>(pagarConta, {});
  useEffect(() => {
    if (state.ok) {
      toast.success("Conta paga");
      onFeito();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.em]);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="conta_id" value={item.conta.id} />
      <input type="hidden" name="vencimento" value={item.vencimento} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="valor-pagar">Valor pago</Label>
          <Input id="valor-pagar" name="valor" inputMode="decimal" defaultValue={numeroParaCampo(item.conta.valor)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data-pagar">Data do pagamento</Label>
          <CampoData id="data-pagar" name="data" defaultValue={hoje} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="forma-pagar">Pago com</Label>
        <NativeSelect id="forma-pagar" name="forma" defaultValue="pix">
          {(["pix", "dinheiro", "debito", "credito_vista"] as const).map((f) => (
            <option key={f} value={f}>
              {FORMAS_PAGAMENTO[f]}
            </option>
          ))}
        </NativeSelect>
      </div>
      {state.erro && <p className="text-destructive text-sm">{state.erro}</p>}
      <DialogFooter>
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Confirmar pagamento
        </Button>
      </DialogFooter>
    </form>
  );
}

function FormConta({ conta, onFeito }: { conta: ContaFixa | null; onFeito: () => void }) {
  const [state, action, pending] = useActionState<AcaoState, FormData>(salvarContaFixa, {});
  const [ativo, setAtivo] = useState(conta?.ativo ?? true);
  useEffect(() => {
    if (state.ok) {
      toast.success("Conta salva");
      onFeito();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.em]);
  return (
    <form action={action} className="space-y-4">
      {conta && <input type="hidden" name="id" value={conta.id} />}
      <input type="hidden" name="ativo" value={ativo ? "on" : "off"} />
      <div className="space-y-2">
        <Label htmlFor="nome-conta">Nome</Label>
        <Input id="nome-conta" name="nome" defaultValue={conta?.nome} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="valor-conta">Valor de cada vencimento</Label>
          <Input id="valor-conta" name="valor" inputMode="decimal" defaultValue={numeroParaCampo(conta?.valor)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dias-conta">Vence no dia</Label>
          <Input id="dias-conta" name="dias" defaultValue={conta?.dias.join(", ")} placeholder="Ex.: 5 ou 15, 30" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cat-conta">Categoria</Label>
        <NativeSelect id="cat-conta" name="categoria" defaultValue={conta?.categoria ?? "Outros"}>
          {CATEGORIAS_SAIDA.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </div>
      <label className="bg-secondary/50 flex items-center justify-between rounded-lg p-3 text-sm font-medium">
        Conta ativa
        <Switch checked={ativo} onCheckedChange={setAtivo} />
      </label>
      {state.erro && <p className="text-destructive text-sm">{state.erro}</p>}
      <DialogFooter>
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}

function Numero({
  titulo,
  valor,
  cor,
  detalhe,
  ativo,
  onClick,
}: {
  titulo: string;
  valor: string;
  cor?: string;
  detalhe?: string;
  ativo?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "bg-card hover:border-gold rounded-xl border p-4 text-left transition-colors",
        ativo && "border-gold ring-gold/40 ring-2"
      )}
    >
      <p className="text-muted-foreground text-xs font-medium">{titulo}</p>
      <p className={cn("mt-1 text-lg font-semibold tabular-nums", cor)}>{valor}</p>
      {detalhe && <p className="text-muted-foreground mt-0.5 text-xs">{detalhe}</p>}
    </button>
  );
}
