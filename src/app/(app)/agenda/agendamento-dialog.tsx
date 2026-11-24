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
  ehModelo,
  numeroParaCampo,
  precoTexto,
  parseNumeroBR,
  valorLiquido,
  type FormaPagamento,
  type Servico,
  type TaxaPagamento,
} from "@/lib/configuracoes";
import { linkWhatsApp, ORIGENS } from "@/lib/clientes";
import {
  dataLocal,
  hhmmDeMinutos,
  mensagemConfirmacao,
  minutosDeHHMM,
  minutosLocal,
  choqueCom,
  horariosLivres,
  minutosDoCurso,
  somarDias,
  type CursoAgenda,
  mensagemMarcado,
  STATUS,
  type Agendamento,
  type OcupacaoDia,
  type ItemAgendamento,
  type StatusAgendamento,
} from "@/lib/agenda";
import { cn } from "@/lib/utils";
import { marcarRealizado, mudarStatus, ocupacaoDoDia, salvarAgendamento, type AgendaState } from "./actions";
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
  /** cursos (produtos da categoria Cursos) — aparecem numa seção própria */
  cursos?: CursoAgenda[];
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
              ? `${STATUS[agendamento.status].rotulo}${agendamento.cliente_nova === undefined ? "" : agendamento.cliente_nova ? " · Nova cliente (primeira vez)" : " · Cliente ativa"}${agendamento.marcado_por ? ` · origem: ${agendamento.marcado_por}` : ""}`
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
  // Com sinal pago antes, cobra só o que falta
  const sinal = a.sinal ?? 0;
  const [valorTexto, setValorTexto] = useState(numeroParaCampo(Math.max(0, a.valor_total - sinal)));

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

  const modelo = a.itens.some((i) => ehModelo(i));
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
          {sinal > 0 && (
            <p className="rounded-md bg-emerald-100/70 px-3 py-2 text-sm text-emerald-950">
              Sinal já pago: <b>{formatMoeda(sinal)}</b> · total {formatMoeda(a.valor_total)} · falta{" "}
              <b>{formatMoeda(Math.max(0, a.valor_total - sinal))}</b>
            </p>
          )}
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
          {modelo && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Atendimento de <b>modelo</b>: digite o valor combinado com ela (0 = sem cobrança).
            </p>
          )}
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
  cursos,
  onFechar,
}: Props & { onFechar: () => void }) {
  const [state, action, pending] = useActionState<AgendaState, FormData>(salvarAgendamento, {});
  const [itens, setItens] = useState<ItemAgendamento[]>(a?.itens ?? []);
  // Dias seguintes de uma turma de curso: cada um com data, início e término editáveis
  const [diasCurso, setDiasCurso] = useState<{ data: string; inicio: string; fim: string }[]>([]);
  const [hora, setHora] = useState(a ? hhmmDeMinutos(minutosLocal(a.inicio)) : novoEm.hora);
  const [data, setData] = useState(a ? dataLocal(a.inicio) : novoEm.data);
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
      // Novo ou remarcado: oferece a mensagem no WhatsApp; senão, fecha
      if (!state.marcado || (a && !state.marcado.remarcado)) onFechar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.em]);

  const duracao = itens.reduce((s, i) => s + i.duracao_min, 0);
  const soma = itens.reduce((s, i) => s + i.valor, 0);
  const valorTexto = valorManual ?? numeroParaCampo(soma);
  const temModelo = itens.some((i) => ehModelo(i));
  const termina = hora && duracao ? hhmmDeMinutos(minutosDeHHMM(hora) + duracao) : null;

  const porCategoria = useMemo(() => {
    const m = new Map<string, Servico[]>();
    for (const s of servicos) m.set(s.categoria, [...(m.get(s.categoria) ?? []), s]);
    // promoção (Black LS) em primeiro na lista
    return [...m.entries()].sort(([a], [b]) => Number(b === "Black LS") - Number(a === "Black LS"));
  }, [servicos]);

  function adicionar(id: string) {
    if (id.startsWith("curso:")) {
      const c = cursos?.find((x) => x.id === id.slice(6));
      if (!c) return;
      const dias = c.duracao_dias == null ? 1 : Math.max(1, Math.ceil(c.duracao_dias));
      // Sugestão para os dias seguintes (dias corridos, mesmo horário): a pessoa confere e ajusta
      if (dias > 1 && !a) {
        const ini = /^\d{2}:\d{2}$/.test(hora) ? hora : "09:00";
        const fim = hhmmDeMinutos(Math.min(minutosDeHHMM(ini) + minutosDoCurso(c.duracao_dias), 23 * 60 + 55));
        const base = /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : novoEm.data;
        setDiasCurso(Array.from({ length: dias - 1 }, (_, k) => ({ data: somarDias(base, k + 1), inicio: ini, fim })));
      }
      setItens((atual) => [
        ...atual,
        { servico_id: null, nome: c.nome, duracao_min: minutosDoCurso(c.duracao_dias), valor: c.preco, curso_dias: dias },
      ]);
      setValorManual(null);
      return;
    }
    const s = servicos.find((x) => x.id === id);
    if (!s) return;
    setItens((atual) => [...atual, { servico_id: s.id, nome: s.nome, duracao_min: s.duracao_min, valor: s.preco }]);
    setValorManual(null);
  }

  function remover(i: number) {
    if ((itens[i]?.curso_dias ?? 1) > 1) setDiasCurso([]);
    setItens((atual) => atual.filter((_, j) => j !== i));
    setValorManual(null);
  }

  if (state.ok && state.marcado && (!a || state.marcado.remarcado)) {
    const m = state.marcado;
    const texto = mensagemMarcado(m);
    const link = linkWhatsApp(m.whatsapp, texto) ?? `https://wa.me/?text=${encodeURIComponent(texto)}`;
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          ✓ {m.remarcado ? "Remarcado" : "Agendado"}: <b>{m.nome}</b>
        </p>
        <div className="bg-secondary/50 rounded-lg p-3 text-sm whitespace-pre-line">{texto}</div>
        <Button asChild size="lg" className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
          <a href={link} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(onFechar, 300)}>
            <MessageCircle /> Mandar no WhatsApp
          </a>
        </Button>
        {!m.whatsapp && (
          <p className="text-muted-foreground text-xs">
            Ela ainda não tem WhatsApp no cadastro: o WhatsApp abre para você escolher o contato.
          </p>
        )}
        <Button variant="ghost" className="w-full" onClick={onFechar}>
          Agora não
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={semResetar(action)} className="space-y-4">
      {a && <input type="hidden" name="id" value={a.id} />}
      {a && <input type="hidden" name="inicio_anterior" value={a.inicio} />}
      {ignorar && <input type="hidden" name="ignorar_horario" value="1" />}
      <input type="hidden" name="itens" value={JSON.stringify(itens)} />
      {diasCurso.length > 0 && <input type="hidden" name="dias_curso" value={JSON.stringify(diasCurso)} />}

      <fieldset disabled={!editavel} className="min-w-0 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cliente_nome">Cliente</Label>
          <CampoCliente clientes={clientes} defaultValue={a?.cliente_nome} parecidasServidor={state.parecidas} required exigirWhatsapp />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <CampoData id="data" name="data" value={data} onChange={setData} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hora">Horário</Label>
            <HorarioLivre
              data={data}
              hora={hora}
              onHora={setHora}
              duracao={itens.reduce((t, i) => t + i.duracao_min, 0)}
              intervalo={intervalo}
              ignorarId={a?.id ?? null}
              editavel={editavel}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adicionar-servico">Agendamento</Label>
          {itens.length > 0 && (
            <ul className="bg-card divide-y rounded-lg border">
              {itens.map((i, idx) => (
                <li key={idx} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{i.nome}</span>
                  {i.curso_dias && editavel && /^\d{2}:\d{2}$/.test(hora) ? (
                    <span className="flex basis-full items-center gap-2 text-xs sm:order-last">
                      <span className="text-muted-foreground shrink-0">1º dia: {hora} até</span>
                      <CampoHora
                        compacto
                        className="w-32"
                        aria-label="Término do curso no 1º dia"
                        value={hhmmDeMinutos(Math.min(minutosDeHHMM(hora) + i.duracao_min, 23 * 60 + 55))}
                        onChange={(fim) => {
                          const dur = minutosDeHHMM(fim) - minutosDeHHMM(hora);
                          if (dur > 0) setItens((atual) => atual.map((x, j) => (j === idx ? { ...x, duracao_min: dur } : x)));
                        }}
                      />
                    </span>
                  ) : null}
                  <span className="text-muted-foreground text-xs">{formatDuracao(i.duracao_min)}</span>
                  <span className="w-20 text-right">{precoTexto({ nome: i.nome, preco: i.valor }, formatMoeda)}</span>
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
              <option value="">{itens.length ? "+ Adicionar outro serviço ou curso" : "Escolha o serviço ou curso"}</option>
              {porCategoria.map(([cat, lista]) => (
                <optgroup key={cat} label={cat}>
                  {lista.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} · {formatDuracao(s.duracao_min)} · {precoTexto(s, formatMoeda)}
                    </option>
                  ))}
                </optgroup>
              ))}
              {cursos && cursos.length > 0 && (
                <optgroup label="Cursos">
                  {cursos.map((c) => (
                    <option key={c.id} value={`curso:${c.id}`}>
                      {c.nome} · {c.duracao_dias == null ? "1 dia" : c.duracao_dias <= 0.5 ? "meio dia (4h)" : `${c.duracao_dias} ${c.duracao_dias === 1 ? "dia" : "dias"}`} · {formatMoeda(c.preco)}
                    </option>
                  ))}
                </optgroup>
              )}
            </NativeSelect>
          )}
          {!a && diasCurso.length > 0 && (
            <div className="space-y-2 rounded-md border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">
              <p>
                <b>Turma de {diasCurso.length + 1} dias.</b> Os horários abaixo são uma sugestão: <b>confira e edite</b> a
                data, o início e o término de cada dia (o curso nem sempre é no mesmo horário). Esses dias entram sem
                valor — a venda fica no 1º dia.
              </p>
              {diasCurso.map((d, k) => (
                <div key={k} className="bg-card space-y-2 rounded-md border p-2">
                  <p className="text-xs font-semibold">Dia {k + 2}</p>
                  <CampoData
                    value={d.data}
                    onChange={(v) => setDiasCurso((t) => t.map((x, j) => (j === k ? { ...x, data: v } : x)))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1 text-xs">
                      <span>Início</span>
                      <CampoHora
                        compacto
                        aria-label={`Início do dia ${k + 2}`}
                        value={d.inicio}
                        onChange={(v) => setDiasCurso((t) => t.map((x, j) => (j === k ? { ...x, inicio: v } : x)))}
                      />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span>Término</span>
                      <CampoHora
                        compacto
                        aria-label={`Término do dia ${k + 2}`}
                        value={d.fim}
                        onChange={(v) => setDiasCurso((t) => t.map((x, j) => (j === k ? { ...x, fim: v } : x)))}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
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
          {temModelo && (
            <p className="text-xs text-amber-800">
              Modelo: valor a combinar. Digite o valor combinado, ou deixe 0 e preencha ao concluir.
            </p>
          )}
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
            <Label htmlFor="marcado_por">Origem</Label>
            {/* gravado em agendamentos.marcado_por (de onde veio este agendamento) */}
            <NativeSelect id="marcado_por" name="marcado_por" defaultValue={a?.marcado_por ?? ""}>
              <option value="">Escolha…</option>
              {[...ORIGENS, ...(a?.marcado_por && !ORIGENS.includes(a.marcado_por) ? [a.marcado_por] : [])].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </NativeSelect>
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


// ---------------------------------------------------------------------------
// Horário: só oferece os horários livres do dia (não deixa marcar duas clientes juntas).
// "Outro horário" serve para fora do expediente (ex.: 06:30) — choque com outra cliente nunca passa.
// ---------------------------------------------------------------------------
function HorarioLivre({
  data,
  hora,
  onHora,
  duracao,
  intervalo,
  ignorarId,
  editavel,
}: {
  data: string;
  hora: string;
  onHora: (h: string) => void;
  duracao: number;
  intervalo: number;
  ignorarId: string | null;
  editavel: boolean;
}) {
  const [ocupacao, setOcupacao] = useState<OcupacaoDia | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [outro, setOutro] = useState(false);
  const [agora, setAgora] = useState<{ dia: string; min: number } | null>(null);

  useEffect(() => {
    const iso = new Date().toISOString();
    setAgora({ dia: dataLocal(iso), min: minutosLocal(iso) });
  }, []);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return setOcupacao(null);
    let vivo = true;
    setCarregando(true);
    setFalhou(false);
    // Se a consulta falhar ou demorar (internet fraca), libera digitar o horário em vez de travar
    const limite = setTimeout(() => {
      if (!vivo) return;
      setCarregando(false);
      setFalhou(true);
      setOutro(true);
    }, 8000);
    ocupacaoDoDia(data, ignorarId)
      .then((o) => {
        if (!vivo) return;
        setOcupacao(o);
        if (!o) {
          setFalhou(true);
          setOutro(true);
        }
      })
      .catch(() => {
        if (!vivo) return;
        setFalhou(true);
        setOutro(true);
      })
      .finally(() => {
        clearTimeout(limite);
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
      clearTimeout(limite);
    };
  }, [data, ignorarId]);

  // Hoje a lista mostra também os horários que já passaram (para registrar quem já está sendo atendida),
  // mas a sugestão automática continua sendo o primeiro horário livre a partir de agora.
  const livres = useMemo(
    () => (ocupacao ? horariosLivres(ocupacao, duracao, intervalo, 15, null) : []),
    [ocupacao, duracao, intervalo]
  );
  const minAgora = agora && agora.dia === data && !ignorarId ? agora.min : null;
  const proximoLivre = minAgora == null ? livres[0] : (livres.find((m) => m >= minAgora) ?? livres[0]);
  const minHora = /^\d{2}:\d{2}$/.test(hora) ? minutosDeHHMM(hora) : null;
  const choque = ocupacao && minHora != null ? choqueCom(ocupacao, minHora, Math.max(duracao, 15), intervalo) : null;
  const naLista = minHora != null && livres.includes(minHora);

  // Horário que não está na lista:
  //  - agendamento novo, ao abrir/trocar o dia: já sugere o primeiro horário livre;
  //  - depois disso (ou ao editar um marcado): mostra no campo "outro", sem apagar (sobreposto só avisa).
  const sugerido = useRef<string | null>(null);
  useEffect(() => {
    if (!ocupacao || !editavel) return;
    // Só na primeira carga de cada dia: agendamento novo com horário ocupado ganha o primeiro livre.
    // Depois disso, nunca troca o horário que a pessoa escolheu (bug: 9h30 virava 08:00).
    if (sugerido.current !== data) {
      sugerido.current = data;
      if (!ignorarId && !outro && !naLista && livres.length) return onHora(hhmmDeMinutos(proximoLivre));
    }
    if (!naLista && minHora != null) setOutro(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocupacao, naLista]);

  return (
    <div className="space-y-1.5">
      <input type="hidden" name="hora" value={hora} />
      {outro ? (
        <CampoHora id="hora" value={hora} onChange={onHora} required />
      ) : (
        <NativeSelect id="hora" value={naLista ? hora : ""} onChange={(e) => onHora(e.target.value)} required>
          <option value="">{carregando ? "Carregando…" : livres.length ? "Escolha" : "Sem horário livre"}</option>
          {livres.map((m) => (
            <option key={m} value={hhmmDeMinutos(m)}>
              {hhmmDeMinutos(m)}
              {minAgora != null && m + 15 <= minAgora ? " (já passou)" : ""}
            </option>
          ))}
        </NativeSelect>
      )}
      {editavel && (
        <button
          type="button"
          className="text-muted-foreground text-xs underline"
          onClick={() => {
            setOutro(!outro);
            if (outro && !naLista) onHora("");
          }}
        >
          {outro ? "Ver só os horários livres" : "Outro horário (digitar)"}
        </button>
      )}
      {falhou && (
        <p className="text-muted-foreground text-xs">
          Não consegui conferir os horários ocupados agora: digite o horário.
        </p>
      )}
      {choque && (
        <p className="text-destructive text-xs font-medium">
          ⚠ Horário sobreposto com {choque.quem} ({hhmmDeMinutos(choque.de)}–{hhmmDeMinutos(choque.ate)}). Dá
          para marcar mesmo assim.
        </p>
      )}
      {!outro && !carregando && ocupacao && livres.length === 0 && (
        <p className="text-xs text-amber-800">
          {ocupacao.abre == null ? "O studio não abre neste dia." : "Nenhum horário livre neste dia para esses serviços."}
        </p>
      )}
    </div>
  );
}
