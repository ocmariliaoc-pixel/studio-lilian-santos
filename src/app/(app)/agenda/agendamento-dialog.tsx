"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Ban, CalendarCheck, Check, Loader2, MessageCircle, RotateCcw, UserX, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoCliente } from "@/components/campo-cliente";
import { CampoData, CampoHora } from "@/components/ui/campo-data";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoeda } from "@/lib/format";
import {
  FORMAS_PAGAMENTO,
  formatDuracao,
  numeroParaCampo,
  parseNumeroBR,
  valorLiquido,
  type FormaPagamento,
  type Servico,
  type TaxaPagamento,
} from "@/lib/configuracoes";
import { linkWhatsApp } from "@/lib/clientes";
import {
  dataLocal,
  hhmmDeMinutos,
  mensagemConfirmacao,
  minutosDeHHMM,
  minutosLocal,
  STATUS,
  type Agendamento,
  type ItemAgendamento,
  type StatusAgendamento,
} from "@/lib/agenda";
import { cn } from "@/lib/utils";
import { marcarRealizado, mudarStatus, salvarAgendamento, type AgendaState } from "./actions";
import { semResetar } from "@/lib/form";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agendamento: Agendamento | null;
  novoEm: { data: string; hora: string };
  servicos: Servico[];
  clientes: string[];
  taxas: TaxaPagamento[];
  intervalo: number;
};

export function AgendamentoDialog(props: Props) {
  const { open, onOpenChange, agendamento } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{agendamento ? agendamento.cliente_nome : "Novo agendamento"}</DialogTitle>
          <DialogDescription>
            {agendamento
              ? `${STATUS[agendamento.status].rotulo}${agendamento.cliente_nova === undefined ? "" : agendamento.cliente_nova ? " · Nova cliente (primeira vez)" : " · Cliente ativa"}${agendamento.marcado_por ? ` · marcado por ${agendamento.marcado_por}` : ""}`
              : "Escolha a cliente, o horário e os serviços."}
          </DialogDescription>
        </DialogHeader>
        {agendamento && (
          <AcoesStatus key={`s-${agendamento.id}`} agendamento={agendamento} taxas={props.taxas} onFechar={() => onOpenChange(false)} />
        )}
        <AgendamentoForm
          key={agendamento?.id ?? `novo-${props.novoEm.data}-${props.novoEm.hora}`}
          {...props}
          onFechar={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Status: confirmar, realizado (com pagamento), faltou, cancelar
// ---------------------------------------------------------------------------
function AcoesStatus({
  agendamento: a,
  taxas,
  onFechar,
}: {
  agendamento: Agendamento;
  taxas: TaxaPagamento[];
  onFechar: () => void;
}) {
  const [pendente, iniciar] = useTransition();
  const [pagando, setPagando] = useState(false);
  const [forma, setForma] = useState<FormaPagamento | "">("");
  const [parcelas, setParcelas] = useState(2);
  const [valorTexto, setValorTexto] = useState(numeroParaCampo(a.valor_total));

  const ativas = taxas.filter((t) => t.ativo);
  const formas = (Object.keys(FORMAS_PAGAMENTO) as FormaPagamento[]).filter((f) => ativas.some((t) => t.forma === f));
  const parcelasAtivas = ativas.filter((t) => t.forma === "credito_parcelado").map((t) => t.parcelas).sort((x, y) => x - y);
  const valor = parseNumeroBR(valorTexto) ?? 0;
  const taxa =
    forma === ""
      ? 0
      : (ativas.find((t) => t.forma === forma && t.parcelas === (forma === "credito_parcelado" ? parcelas : 1))
          ?.taxa_percentual ?? 0);

  function status(s: StatusAgendamento, msg: string) {
    iniciar(async () => {
      const r = await mudarStatus(a.id, s);
      if (r.ok) {
        toast.success(msg);
        onFechar();
      } else toast.error(r.erro);
    });
  }

  function realizar() {
    iniciar(async () => {
      const r = await marcarRealizado(a.id, valor === 0 ? null : forma || null, parcelas, valor);
      if (r.ok) {
        toast.success(valor === 0 ? "Concluído (sem cobrança)" : "Concluído e lançado no caixa");
        onFechar();
      } else toast.error(r.erro);
    });
  }

  const wa = linkWhatsApp(a.cliente_whatsapp, mensagemConfirmacao(a));
  const encerrado = a.status === "realizado" || a.status === "cancelado" || a.status === "faltou";

  if (encerrado) {
    return (
      <div className="bg-secondary/50 flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 text-sm">
        <span>
          {a.status === "realizado"
            ? a.lancado
              ? `Concluído · ${formatMoeda(a.valor_total)} lançado no caixa`
              : "Concluído"
            : STATUS[a.status].rotulo}
        </span>
        {a.status !== "realizado" && (
          <Button variant="outline" size="sm" disabled={pendente} onClick={() => status("agendado", "Agendamento reaberto")}>
            <RotateCcw /> Reabrir
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {a.status === "agendado" ? (
          <Button variant="outline" disabled={pendente} onClick={() => status("confirmado", "Confirmado")}>
            <CalendarCheck /> Confirmado
          </Button>
        ) : (
          <span className="flex h-11 items-center justify-center gap-1.5 rounded-md bg-sky-50 text-sm font-medium text-sky-900">
            <Check className="size-4" /> Confirmado
          </span>
        )}
        <Button
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={pendente}
          onClick={() => setPagando((p) => !p)}
        >
          <Check /> Concluído
        </Button>
        <Button variant="outline" disabled={pendente} onClick={() => status("faltou", "Marcado como falta")}>
          <UserX /> Faltou
        </Button>
        <Button
          variant="outline"
          className="text-destructive"
          disabled={pendente}
          onClick={() => status("cancelado", "Agendamento cancelado")}
        >
          <Ban /> Cancelar
        </Button>
      </div>

      {wa && a.status === "agendado" && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-800"
        >
          <MessageCircle className="size-4" /> Pedir confirmação no WhatsApp
        </a>
      )}

      {pagando && (
        <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          <p className="text-sm font-medium">Pagamento</p>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">R$</span>
            <Input
              aria-label="Valor cobrado"
              inputMode="decimal"
              value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value)}
              className="pl-9 text-lg font-semibold"
            />
          </div>
          {valor > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {formas.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForma(f)}
                  className={cn(
                    "h-11 rounded-lg border px-2 text-sm font-medium",
                    forma === f ? "border-primary bg-primary text-primary-foreground" : "bg-card"
                  )}
                >
                  {f === "credito_parcelado" ? "Parcelado" : FORMAS_PAGAMENTO[f]}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-emerald-900">Valor zero: registrado como brinde.</p>
          )}
          {forma === "credito_parcelado" && valor > 0 && (
            <NativeSelect aria-label="Parcelas" value={String(parcelas)} onChange={(e) => setParcelas(Number(e.target.value))}>
              {parcelasAtivas.map((p) => (
                <option key={p} value={p}>
                  {p}x
                </option>
              ))}
            </NativeSelect>
          )}
          {forma !== "" && valor > 0 && (
            <p className="text-sm">
              Taxa {numeroParaCampo(taxa)}% · entra <strong>{formatMoeda(valorLiquido(valor, taxa))}</strong>
            </p>
          )}
          <Button className="w-full" size="lg" disabled={pendente || (valor > 0 && !forma)} onClick={realizar}>
            {pendente && <Loader2 className="animate-spin" />}
            Confirmar e lançar no caixa
          </Button>
        </div>
      )}
      <hr />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulário: cliente, data/hora, serviços (vários), valor
// ---------------------------------------------------------------------------
function AgendamentoForm({
  agendamento: a,
  novoEm,
  servicos,
  clientes,
  intervalo,
  onFechar,
}: Props & { onFechar: () => void }) {
  const [state, action, pending] = useActionState<AgendaState, FormData>(salvarAgendamento, {});
  const [itens, setItens] = useState<ItemAgendamento[]>(a?.itens ?? []);
  const [hora, setHora] = useState(a ? hhmmDeMinutos(minutosLocal(a.inicio)) : novoEm.hora);
  const [valorManual, setValorManual] = useState<string | null>(a ? numeroParaCampo(a.valor_total) : null);
  // "Marcar mesmo assim": guarda a confirmação num campo escondido e reenvia o formulário
  // depois de atualizar a tela (o botão some ao confirmar e não podia ser ele a enviar).
  const [ignorar, setIgnorar] = useState(false);
  const [reenviar, setReenviar] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (reenviar) {
      setReenviar(false);
      formRef.current?.requestSubmit();
    }
  }, [reenviar]);
  const editavel = !a || a.status === "agendado" || a.status === "confirmado";

  useEffect(() => {
    if (state.foraDoHorario) setIgnorar(false); // mostra de novo o "Marcar mesmo assim"
    if (state.ok) {
      toast.success(a ? "Agendamento atualizado" : "Agendado!");
      onFechar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.em]);

  const duracao = itens.reduce((s, i) => s + i.duracao_min, 0);
  const soma = itens.reduce((s, i) => s + i.valor, 0);
  const valorTexto = valorManual ?? numeroParaCampo(soma);
  const termina = hora && duracao ? hhmmDeMinutos(minutosDeHHMM(hora) + duracao) : null;

  const porCategoria = useMemo(() => {
    const m = new Map<string, Servico[]>();
    for (const s of servicos) m.set(s.categoria, [...(m.get(s.categoria) ?? []), s]);
    return [...m.entries()];
  }, [servicos]);

  function adicionar(id: string) {
    const s = servicos.find((x) => x.id === id);
    if (!s) return;
    setItens((atual) => [...atual, { servico_id: s.id, nome: s.nome, duracao_min: s.duracao_min, valor: s.preco }]);
    setValorManual(null);
  }

  function remover(i: number) {
    setItens((atual) => atual.filter((_, j) => j !== i));
    setValorManual(null);
  }

  return (
    <form ref={formRef} onSubmit={semResetar(action)} className="space-y-4">
      {a && <input type="hidden" name="id" value={a.id} />}
      {ignorar && <input type="hidden" name="ignorar_horario" value="1" />}
      <input type="hidden" name="itens" value={JSON.stringify(itens)} />

      <fieldset disabled={!editavel} className="min-w-0 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cliente_nome">Cliente</Label>
          <CampoCliente clientes={clientes} defaultValue={a?.cliente_nome} parecidasServidor={state.parecidas} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <CampoData id="data" name="data" defaultValue={a ? dataLocal(a.inicio) : novoEm.data} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hora">Horário</Label>
            <CampoHora id="hora" name="hora" value={hora} onChange={setHora} required />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adicionar-servico">Serviços</Label>
          {itens.length > 0 && (
            <ul className="bg-card divide-y rounded-lg border">
              {itens.map((i, idx) => (
                <li key={idx} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{i.nome}</span>
                  <span className="text-muted-foreground text-xs">{formatDuracao(i.duracao_min)}</span>
                  <span className="w-20 text-right">{formatMoeda(i.valor)}</span>
                  {editavel && (
                    <button type="button" onClick={() => remover(idx)} aria-label={`Tirar ${i.nome}`} className="text-muted-foreground p-1">
                      <X className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {editavel && (
            <NativeSelect id="adicionar-servico" value="" onChange={(e) => adicionar(e.target.value)}>
              <option value="">{itens.length ? "+ Adicionar outro serviço" : "Escolha o serviço"}</option>
              {porCategoria.map(([cat, lista]) => (
                <optgroup key={cat} label={cat}>
                  {lista.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} · {formatDuracao(s.duracao_min)} · {formatMoeda(s.preco)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
          )}
          {duracao > 0 && (
            <p className="bg-secondary/60 rounded-md px-3 py-2 text-sm">
              {formatDuracao(duracao)} de atendimento{termina ? `, termina às ${termina}` : ""}
              {intervalo > 0 ? ` (+ ${intervalo} min de intervalo)` : ""}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor_total">Valor</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">R$</span>
            <Input
              id="valor_total"
              name="valor_total"
              inputMode="decimal"
              value={valorTexto}
              onChange={(e) => setValorManual(e.target.value)}
              className="pl-9"
            />
          </div>
          {valorManual !== null && Math.abs((parseNumeroBR(valorManual) ?? 0) - soma) > 0.004 && (
            <p className="text-muted-foreground text-xs">
              Tabela: {formatMoeda(soma)}.{" "}
              <button type="button" className="underline" onClick={() => setValorManual(null)}>
                Usar o valor da tabela
              </button>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="marcado_por">Marcado por</Label>
            <Input id="marcado_por" name="marcado_por" defaultValue={a?.marcado_por ?? ""} placeholder="Ex.: Instagram" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Input id="observacoes" name="observacoes" defaultValue={a?.observacoes ?? ""} placeholder="Ex.: 10% desconto" />
          </div>
        </div>
      </fieldset>

      {state.foraDoHorario && !ignorar ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <p>{state.foraDoHorario}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={pending}
            onClick={() => {
              setIgnorar(true);
              setReenviar(true);
            }}
          >
            Marcar mesmo assim
          </Button>
        </div>
      ) : (
        state.erro && (
          <p role="alert" className="text-destructive text-sm">
            {state.erro}
          </p>
        )
      )}

      {editavel && (
        <Button type="submit" size="lg" className="w-full" disabled={pending || itens.length === 0}>
          {pending && <Loader2 className="animate-spin" />}
          {a ? "Salvar alterações" : "Agendar"}
        </Button>
      )}
    </form>
  );
}
