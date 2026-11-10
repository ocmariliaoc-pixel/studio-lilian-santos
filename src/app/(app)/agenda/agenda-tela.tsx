"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, ChevronLeft, ChevronRight, MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoeda } from "@/lib/format";
import { hhmm, type HorarioDia, type Servico, type TaxaPagamento } from "@/lib/configuracoes";
import { dataExtensoISO, nomeMes } from "@/lib/financeiro";
import { ultimoDiaDoMes } from "@/lib/metas";
import { linkWhatsApp } from "@/lib/clientes";
import {
  dataLocal,
  descricaoItens,
  diaDaSemana,
  hhmmDeMinutos,
  mensagemConfirmacao,
  minutosDeHHMM,
  minutosLocal,
  somarDias,
  STATUS,
  type Agendamento,
} from "@/lib/agenda";
import { cn } from "@/lib/utils";
import { AgendamentoDialog } from "./agendamento-dialog";

const PX_POR_MIN = 1.6; // 30 min = 48px: dá para tocar com o dedo
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export type DadosAgenda = {
  hoje: string;
  data: string;
  visao: "dia" | "semana" | "mes";
  de: string;
  agendamentos: Agendamento[];
  horarios: HorarioDia[];
  intervalo: number;
  servicos: Servico[];
  clientes: string[];
  taxas: TaxaPagamento[];
};

export function AgendaTela(props: DadosAgenda) {
  const { hoje, data, visao, de, agendamentos, horarios } = props;
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState<Agendamento | null>(null);
  const [novoEm, setNovoEm] = useState<{ data: string; hora: string }>({ data, hora: "09:00" });

  function novo(dataNova: string, hora: string) {
    setAtual(null);
    setNovoEm({ data: dataNova, hora });
    setAberto(true);
  }
  function abrir(a: Agendamento) {
    setAtual(a);
    setAberto(true);
  }

  const href = (d: string, v = visao) => `/agenda?v=${v}&d=${d}`;
  const passo = visao === "semana" ? 7 : 1;
  const mesVizinho = (delta: number) => {
    const [a, m] = data.split("-").map(Number);
    return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 10);
  };
  const anterior = visao === "mes" ? mesVizinho(-1) : somarDias(data, -passo);
  const proximo = visao === "mes" ? mesVizinho(1) : somarDias(data, passo);

  // Confirmar 2 dias antes: agendados (não confirmados) de hoje até depois de amanhã
  const paraConfirmar = agendamentos.filter((a) => {
    const d = dataLocal(a.inicio);
    return a.status === "agendado" && d >= hoje && d <= somarDias(hoje, 2) && new Date(a.inicio) > new Date();
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Agenda</h1>
          <div className="bg-gold mt-2 h-0.5 w-8 rounded-full" aria-hidden />
        </div>
        <div className="bg-secondary/60 grid grid-cols-3 gap-1 rounded-xl p-1">
          {(["dia", "semana", "mes"] as const).map((v) => (
            <Link
              key={v}
              href={href(data, v)}
              className={cn(
                "flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium",
                visao === v ? "bg-card shadow-sm" : "text-muted-foreground"
              )}
            >
              {v === "dia" ? "Dia" : v === "semana" ? "Semana" : "Mês"}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Anterior">
          <Link href={href(anterior)}>
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div className="text-center">
          <p className="font-serif text-xl font-semibold first-letter:uppercase sm:text-2xl">
            {visao === "dia"
              ? dataExtensoISO(data, false)
              : visao === "mes"
                ? `${nomeMes(Number(data.slice(5, 7)))} de ${data.slice(0, 4)}`
                : `${dataExtensoISO(de, false).split(", ")[1]} a ${dataExtensoISO(somarDias(de, 6), false).split(", ")[1]}`}
          </p>
          {data !== hoje && (
            <Link href={href(hoje)} className="text-primary text-xs font-medium">
              ir para hoje
            </Link>
          )}
        </div>
        <Button asChild variant="ghost" size="icon" aria-label="Próximo">
          <Link href={href(proximo)}>
            <ChevronRight className="size-5" />
          </Link>
        </Button>
      </div>

      {paraConfirmar.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <BellRing className="size-4" />
            Confirmar ({paraConfirmar.length}) — próximos 2 dias
          </p>
          <ul className="mt-2 space-y-1.5">
            {paraConfirmar.map((a) => {
              const wa = linkWhatsApp(a.cliente_whatsapp, mensagemConfirmacao(a));
              return (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <button type="button" onClick={() => abrir(a)} className="min-w-0 flex-1 truncate text-left">
                    <b>{a.cliente_nome}</b> · {DIAS_CURTOS[diaDaSemana(dataLocal(a.inicio))]}{" "}
                    {hhmmDeMinutos(minutosLocal(a.inicio))} · {descricaoItens(a.itens)}
                  </button>
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white"
                    >
                      <MessageCircle className="size-3.5" /> WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs opacity-70">sem telefone</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {visao === "dia" ? (
        <VisaoDia
          agendamentos={agendamentos.filter((a) => dataLocal(a.inicio) === data)}
          horario={horarios.find((h) => h.dia_semana === diaDaSemana(data))}
          onNovo={(hora) => novo(data, hora)}
          onAbrir={abrir}
        />
      ) : visao === "mes" ? (
        <VisaoMes mes={`${data.slice(0, 7)}-01`} hoje={hoje} agendamentos={agendamentos} horarios={horarios} />
      ) : (
        <VisaoSemana
          de={de}
          hoje={hoje}
          agendamentos={agendamentos}
          horarios={horarios}
          onAbrir={abrir}
        />
      )}

      <Button
        size="lg"
        onClick={() => novo(data, "09:00")}
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 h-14 rounded-full px-5 shadow-lg md:right-10 md:bottom-8"
      >
        <Plus className="size-5" />
        Agendar
      </Button>

      <AgendamentoDialog
        open={aberto}
        onOpenChange={setAberto}
        agendamento={atual}
        novoEm={novoEm}
        servicos={props.servicos}
        clientes={props.clientes}
        taxas={props.taxas}
        intervalo={props.intervalo}
      />
    </div>
  );
}

function VisaoDia({
  agendamentos,
  horario,
  onNovo,
  onAbrir,
}: {
  agendamentos: Agendamento[];
  horario: HorarioDia | undefined;
  onNovo: (hora: string) => void;
  onAbrir: (a: Agendamento) => void;
}) {
  const aberto = horario?.aberto ?? false;
  const abre = aberto && horario ? minutosDeHHMM(horario.abre) : 9 * 60;
  const fecha = aberto && horario ? minutosDeHHMM(horario.fecha) : 18 * 60;

  // A grade vai da abertura ao fechamento, esticando se houver atendimento fora disso
  const { ini, fim } = useMemo(() => {
    let i = abre;
    let f = fecha;
    for (const a of agendamentos) {
      i = Math.min(i, minutosLocal(a.inicio));
      f = Math.max(f, minutosLocal(a.fim_ocupado) || 24 * 60);
    }
    return { ini: Math.floor(i / 60) * 60, fim: Math.ceil(f / 60) * 60 };
  }, [abre, fecha, agendamentos]);

  const altura = (fim - ini) * PX_POR_MIN;
  const horas = Array.from({ length: (fim - ini) / 60 + 1 }, (_, i) => ini + i * 60);
  const pausa =
    aberto && horario?.pausa_inicio && horario.pausa_fim
      ? { de: minutosDeHHMM(horario.pausa_inicio), ate: minutosDeHHMM(horario.pausa_fim) }
      : null;

  function tocar(e: React.MouseEvent<HTMLDivElement>) {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const min = ini + Math.floor(y / PX_POR_MIN / 15) * 15;
    onNovo(hhmmDeMinutos(Math.max(ini, Math.min(min, fim - 15))));
  }

  const ativos = agendamentos.filter((a) => a.status !== "cancelado");
  const cancelados = agendamentos.filter((a) => a.status === "cancelado");
  const previsto = ativos.filter((a) => a.status !== "faltou").reduce((s, a) => s + a.valor_total, 0);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        {aberto && horario
          ? `Aberto das ${hhmm(horario.abre)} às ${hhmm(horario.fecha)}`
          : "Studio fechado neste dia (dá para agendar mesmo assim)"}{" "}
        · {ativos.length} {ativos.length === 1 ? "atendimento" : "atendimentos"} · {formatMoeda(previsto)}
      </p>

      <div className="bg-card relative overflow-hidden rounded-xl border">
        <div className="relative ml-12" style={{ height: altura }}>
          {/* linhas de hora */}
          {horas.map((h) => (
            <div key={h} className="absolute inset-x-0 border-t" style={{ top: (h - ini) * PX_POR_MIN }}>
              <span className="text-muted-foreground absolute -top-2 -left-11 w-10 bg-transparent text-right text-[11px] tabular-nums">
                {hhmmDeMinutos(h)}
              </span>
            </div>
          ))}
          {/* fora do horário e pausa */}
          {[
            { de: ini, ate: aberto ? abre : fim },
            { de: aberto ? fecha : fim, ate: fim },
            ...(pausa ? [pausa] : []),
          ]
            .filter((f) => f.ate > f.de)
            .map((f, i) => (
              <div
                key={i}
                className="bg-muted/70 absolute inset-x-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(0,0,0,0.03)_6px,rgba(0,0,0,0.03)_12px)]"
                style={{ top: (f.de - ini) * PX_POR_MIN, height: (f.ate - f.de) * PX_POR_MIN }}
              />
            ))}

          {/* toque num horário livre */}
          <div className="absolute inset-0 cursor-pointer" onClick={tocar} aria-label="Tocar para agendar" />

          {ativos.map((a) => {
            const top = (minutosLocal(a.inicio) - ini) * PX_POR_MIN;
            const h = (minutosLocal(a.fim) - minutosLocal(a.inicio)) * PX_POR_MIN;
            const hIntervalo = (minutosLocal(a.fim_ocupado) - minutosLocal(a.fim)) * PX_POR_MIN;
            const st = STATUS[a.status];
            return (
              <div key={a.id} className="absolute right-1 left-1" style={{ top }}>
                <button
                  type="button"
                  onClick={() => onAbrir(a)}
                  className={cn(
                    "flex w-full flex-col overflow-hidden rounded-md border px-2 py-1 text-left shadow-xs",
                    st.classe
                  )}
                  style={{ height: Math.max(h, 22) }}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <span className="tabular-nums">{hhmmDeMinutos(minutosLocal(a.inicio))}</span>
                    <span className="truncate">{a.cliente_nome}</span>
                    <span className="ml-auto shrink-0 text-[10px] font-medium uppercase opacity-80">{st.rotulo}</span>
                  </span>
                  {h >= 36 && <span className="truncate text-xs opacity-80">{descricaoItens(a.itens)}</span>}
                </button>
                {hIntervalo > 0 && (
                  <div
                    className="mx-1 rounded-b-sm bg-[repeating-linear-gradient(90deg,var(--border),var(--border)_4px,transparent_4px,transparent_8px)] opacity-80"
                    style={{ height: hIntervalo }}
                    title="intervalo entre atendimentos"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        Toque num horário livre para agendar. A faixa tracejada embaixo de cada atendimento é o intervalo
        para arrumar a sala.
      </p>

      {cancelados.length > 0 && (
        <div className="text-sm">
          <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-widest uppercase">Cancelados</p>
          <ul className="space-y-1">
            {cancelados.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => onAbrir(a)} className="text-muted-foreground line-through">
                  {hhmmDeMinutos(minutosLocal(a.inicio))} {a.cliente_nome} · {descricaoItens(a.itens)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function VisaoSemana({
  de,
  hoje,
  agendamentos,
  horarios,
  onAbrir,
}: {
  de: string;
  hoje: string;
  agendamentos: Agendamento[];
  horarios: HorarioDia[];
  onAbrir: (a: Agendamento) => void;
}) {
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(de, i));
  return (
    <div className="grid gap-3 md:grid-cols-7 md:gap-2">
      {dias.map((d) => {
        const doDia = agendamentos.filter((a) => dataLocal(a.inicio) === d && a.status !== "cancelado");
        const h = horarios.find((x) => x.dia_semana === diaDaSemana(d));
        const fechado = !h?.aberto;
        return (
          <section
            key={d}
            className={cn("bg-card rounded-xl border p-3 md:min-h-40 md:p-2", fechado && "bg-muted/50", d === hoje && "border-primary")}
          >
            <Link href={`/agenda?v=dia&d=${d}`} className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold capitalize">
                {DIAS_CURTOS[diaDaSemana(d)]} {d.slice(8)}/{d.slice(5, 7)}
              </span>
              <span className="text-muted-foreground text-xs">{fechado ? "fechado" : `${doDia.length}`}</span>
            </Link>
            <ul className="space-y-1">
              {doDia.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onAbrir(a)}
                    className={cn("w-full rounded-md border px-2 py-1 text-left text-xs", STATUS[a.status].classe)}
                  >
                    <span className="font-semibold tabular-nums">{hhmmDeMinutos(minutosLocal(a.inicio))}</span>{" "}
                    {a.cliente_nome}
                    <span className="block truncate opacity-80">{descricaoItens(a.itens)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function VisaoMes({
  mes,
  hoje,
  agendamentos,
  horarios,
}: {
  mes: string;
  hoje: string;
  agendamentos: Agendamento[];
  horarios: HorarioDia[];
}) {
  const fim = ultimoDiaDoMes(mes);
  // grade começa na segunda-feira
  const dowInicio = diaDaSemana(mes);
  const vazios = dowInicio === 0 ? 6 : dowInicio - 1;
  const dias: string[] = [];
  for (let d = mes; d <= fim; d = somarDias(d, 1)) dias.push(d);

  const ativos = agendamentos.filter(
    (a) => a.status !== "cancelado" && a.status !== "faltou" && dataLocal(a.inicio) >= mes && dataLocal(a.inicio) <= fim
  );
  const porDia = new Map<string, Agendamento[]>();
  for (const a of ativos) porDia.set(dataLocal(a.inicio), [...(porDia.get(dataLocal(a.inicio)) ?? []), a]);
  const total = ativos.reduce((s, a) => s + a.valor_total, 0);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        {ativos.length} {ativos.length === 1 ? "atendimento" : "atendimentos"} no mês · {formatMoeda(total)} previsto
      </p>
      <div className="bg-card overflow-hidden rounded-xl border">
        <div className="text-muted-foreground grid grid-cols-7 border-b text-center text-[11px] font-medium uppercase">
          {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: vazios }, (_, i) => (
            <div key={`v${i}`} className="bg-muted/40 min-h-16 border-r border-b sm:min-h-24" />
          ))}
          {dias.map((d) => {
            const lista = porDia.get(d) ?? [];
            const fechado = !horarios.find((h) => h.dia_semana === diaDaSemana(d))?.aberto;
            const valor = lista.reduce((s, a) => s + a.valor_total, 0);
            return (
              <Link
                key={d}
                href={`/agenda?v=dia&d=${d}`}
                className={cn(
                  "hover:bg-secondary/60 flex min-h-16 flex-col gap-1 border-r border-b p-1.5 transition-colors sm:min-h-24 sm:p-2",
                  fechado && "bg-muted/50"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                    d === hoje ? "bg-primary text-primary-foreground" : fechado ? "text-muted-foreground" : ""
                  )}
                >
                  {Number(d.slice(8))}
                </span>
                {lista.length > 0 && (
                  <>
                    <span className="bg-accent text-accent-foreground w-fit rounded px-1 text-[11px] font-semibold tabular-nums">
                      {lista.length}
                    </span>
                    <span className="text-muted-foreground hidden truncate text-[11px] tabular-nums sm:block">
                      {formatMoeda(valor)}
                    </span>
                    <ul className="hidden space-y-0.5 lg:block">
                      {lista.slice(0, 3).map((a) => (
                        <li key={a.id} className="truncate text-[11px]">
                          {hhmmDeMinutos(minutosLocal(a.inicio))} {a.cliente_nome}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <p className="text-muted-foreground text-xs">Toque num dia para ver os horários e agendar.</p>
    </div>
  );
}
