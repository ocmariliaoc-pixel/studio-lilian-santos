"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatDuracao, numeroParaCampo, type Servico } from "@/lib/configuracoes";
import type { AcaoState } from "@/lib/acoes";
import { salvarServico } from "./actions";

const DURACOES = [5, 10, 15, 20, 30, 40, 45, 50, 60, 75, 90, 105, 120, 150, 180, 210, 240];

export function ServicoDialog({
  open,
  onOpenChange,
  servico,
  categorias,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servico: Servico | null;
  categorias: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{servico ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          <DialogDescription>
            {servico
              ? "Mudanças de preço valem para os próximos agendamentos."
              : "Preencha os dados do procedimento."}
          </DialogDescription>
        </DialogHeader>
        {/* key: reinicia o formulário ao trocar de serviço */}
        <ServicoForm
          key={servico?.id ?? "novo"}
          servico={servico}
          categorias={categorias}
          onSalvo={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ServicoForm({
  servico,
  categorias,
  onSalvo,
}: {
  servico: Servico | null;
  categorias: string[];
  onSalvo: () => void;
}) {
  const [state, action, pending] = useActionState<AcaoState, FormData>(salvarServico, {});
  const [ativo, setAtivo] = useState(servico?.ativo ?? true);

  useEffect(() => {
    if (state.ok) {
      toast.success(servico ? "Serviço atualizado" : "Serviço cadastrado");
      onSalvo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.em]);

  const duracoes = servico && !DURACOES.includes(servico.duracao_min)
    ? [...DURACOES, servico.duracao_min].sort((a, b) => a - b)
    : DURACOES;

  return (
    <form action={action} className="space-y-4">
      {servico && <input type="hidden" name="id" value={servico.id} />}

      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          name="nome"
          defaultValue={servico?.nome}
          placeholder="Ex.: Limpeza de pele profunda"
          autoComplete="off"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoria">Categoria</Label>
        <Input
          id="categoria"
          name="categoria"
          list="categorias"
          defaultValue={servico?.categoria}
          placeholder="Ex.: Facial"
          autoComplete="off"
        />
        <datalist id="categorias">
          {categorias.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="duracao_min">Duração</Label>
          <NativeSelect
            id="duracao_min"
            name="duracao_min"
            defaultValue={String(servico?.duracao_min ?? 60)}
          >
            {duracoes.map((d) => (
              <option key={d} value={d}>
                {formatDuracao(d)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="preco">Preço</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
              R$
            </span>
            <Input
              id="preco"
              name="preco"
              inputMode="decimal"
              defaultValue={numeroParaCampo(servico?.preco)}
              placeholder="0,00"
              className="pl-9"
              required
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="retorno_dias">Retorno recomendado</Label>
        <div className="relative">
          <Input
            id="retorno_dias"
            name="retorno_dias"
            type="number"
            inputMode="numeric"
            min={1}
            max={730}
            defaultValue={servico?.retorno_dias ?? ""}
            placeholder="Ex.: 30"
            className="pr-14"
          />
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
            dias
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          Em quantos dias a cliente deve voltar. Deixe vazio se não houver retorno.
        </p>
      </div>

      <label className="bg-secondary/50 flex items-center justify-between gap-3 rounded-lg p-3">
        <span>
          <span className="block text-sm font-medium">Serviço ativo</span>
          <span className="text-muted-foreground block text-xs">
            Desativado, some da agenda mas o histórico continua.
          </span>
        </span>
        <Switch checked={ativo} onCheckedChange={setAtivo} />
        {ativo && <input type="hidden" name="ativo" value="on" />}
      </label>

      {state.erro && (
        <p role="alert" className="text-destructive text-sm">
          {state.erro}
        </p>
      )}

      <DialogFooter>
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}
