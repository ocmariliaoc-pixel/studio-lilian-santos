"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { numeroParaCampo } from "@/lib/configuracoes";
import type { ParametrosMeta } from "@/lib/metas";
import type { AcaoState } from "@/lib/acoes";
import { salvarMeta } from "./actions";

type Linha = { nome: string; valor: string };

function ListaValores({
  titulo,
  linhas,
  setLinhas,
  exemplo,
}: {
  titulo: string;
  linhas: Linha[];
  setLinhas: (l: Linha[]) => void;
  exemplo: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{titulo}</Label>
      {linhas.map((l, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_7.5rem_2.25rem] gap-2">
          <Input
            aria-label={`${titulo}: nome`}
            value={l.nome}
            placeholder={exemplo}
            onChange={(e) => setLinhas(linhas.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
          />
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs">R$</span>
            <Input
              aria-label={`${titulo}: valor`}
              inputMode="decimal"
              value={l.valor}
              placeholder="0,00"
              className="pl-8"
              onChange={(e) => setLinhas(linhas.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))}
            />
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Remover" onClick={() => setLinhas(linhas.filter((_, j) => j !== i))}>
            <X />
          </Button>
        </div>
      ))}
      <Button type="button" variant="link" className="h-8 px-0" onClick={() => setLinhas([...linhas, { nome: "", valor: "" }])}>
        <Plus /> Adicionar
      </Button>
    </div>
  );
}

export function MetaForm({ parametros, nomeMes }: { parametros: ParametrosMeta; nomeMes: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setAberto(true)}>
        <Pencil /> Ajustar números
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meta de {nomeMes}</DialogTitle>
            <DialogDescription>O que o studio precisa pagar e quanto quer de lucro. A meta é calculada a partir disso.</DialogDescription>
          </DialogHeader>
          <Formulario key={parametros.mes} parametros={parametros} onSalvo={() => setAberto(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Formulario({ parametros: p, onSalvo }: { parametros: ParametrosMeta; onSalvo: () => void }) {
  const [state, action, pending] = useActionState<AcaoState, FormData>(salvarMeta, {});
  const paraLinhas = (itens: { nome: string; valor: number }[]) => itens.map((i) => ({ nome: i.nome, valor: numeroParaCampo(i.valor) }));
  const [custos, setCustos] = useState<Linha[]>(paraLinhas(p.custos));
  const [pessoas, setPessoas] = useState<Linha[]>(paraLinhas(p.pessoas));

  useEffect(() => {
    if (state.ok) {
      toast.success("Meta salva");
      onSalvo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.em]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="mes" value={p.mes} />
      <input type="hidden" name="custos" value={JSON.stringify(custos)} />
      <input type="hidden" name="pessoas" value={JSON.stringify(pessoas)} />

      <p className="bg-secondary/60 rounded-md px-3 py-2 text-xs">
        Aluguel, luz, Lilian, Jocélia e as outras contas fixas já entram sozinhas (Financeiro → Contas a pagar). Aqui, só o
        que não é conta fixa.
      </p>
      <ListaValores titulo="Outros custos do mês" linhas={custos} setLinhas={setCustos} exemplo="Ex.: Insumos" />
      <ListaValores titulo="Outros pagamentos de pessoas" linhas={pessoas} setLinhas={setPessoas} exemplo="Ex.: comissão" />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="lucro_desejado">Lucro desejado</Label>
          <Input id="lucro_desejado" name="lucro_desejado" inputMode="decimal" defaultValue={numeroParaCampo(p.lucro_desejado)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="insumos_pct">Insumos (% do faturamento)</Label>
          <Input id="insumos_pct" name="insumos_pct" inputMode="decimal" defaultValue={numeroParaCampo(p.insumos_pct)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ticket_alvo">Ticket médio para o cálculo (opcional)</Label>
        <Input
          id="ticket_alvo"
          name="ticket_alvo"
          inputMode="decimal"
          defaultValue={p.ticket_alvo ? numeroParaCampo(p.ticket_alvo) : ""}
          placeholder="Vazio = usa o ticket real dos últimos 90 dias"
        />
      </div>

      {state.erro && (
        <p role="alert" className="text-destructive text-sm">
          {state.erro}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Salvar meta
        </Button>
      </DialogFooter>
    </form>
  );
}
