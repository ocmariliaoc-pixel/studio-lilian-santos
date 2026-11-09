import { TIMEZONE } from "@/lib/format";
import { hojeISO } from "@/lib/financeiro";

export type StatusAgendamento = "agendado" | "confirmado" | "realizado" | "faltou" | "cancelado";

export type ItemAgendamento = {
  servico_id: string | null;
  nome: string;
  duracao_min: number;
  valor: number;
};

export type Agendamento = {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_whatsapp: string | null;
  inicio: string; // ISO
  fim: string;
  fim_ocupado: string;
  status: StatusAgendamento;
  valor_total: number;
  marcado_por: string | null;
  observacoes: string | null;
  itens: ItemAgendamento[];
  lancado: boolean; // já tem lançamento no caixa
};

export const STATUS: Record<StatusAgendamento, { rotulo: string; classe: string }> = {
  agendado: { rotulo: "Agendado", classe: "border-amber-300 bg-amber-50 text-amber-950" },
  confirmado: { rotulo: "Confirmado", classe: "border-sky-300 bg-sky-50 text-sky-950" },
  realizado: { rotulo: "Realizado", classe: "border-emerald-300 bg-emerald-50 text-emerald-950" },
  faltou: { rotulo: "Faltou", classe: "border-rose-200 bg-rose-50/60 text-rose-900 opacity-70" },
  cancelado: { rotulo: "Cancelado", classe: "border-border bg-muted text-muted-foreground opacity-60" },
};

export const OCUPA_AGENDA: StatusAgendamento[] = ["agendado", "confirmado", "realizado"];

/** Fortaleza não tem horário de verão: UTC−3 o ano todo. */
export const OFFSET = "-03:00";

/** "2026-11-11" + "10:00" → ISO com fuso de Fortaleza */
export function paraISO(data: string, hora: string) {
  return `${data}T${hora}:00${OFFSET}`;
}

/** Data (AAAA-MM-DD) de um instante, no fuso de Fortaleza */
export function dataLocal(iso: string) {
  return hojeISO(new Date(iso));
}

/** Minutos desde 00:00 em Fortaleza */
export function minutosLocal(iso: string) {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = Number(p.find((x) => x.type === "hour")?.value ?? 0) % 24;
  const m = Number(p.find((x) => x.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function hhmmDeMinutos(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function minutosDeHHMM(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

/** Soma dias a AAAA-MM-DD */
export function somarDias(data: string, n: number) {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 0 = domingo ... 6 = sábado */
export function diaDaSemana(data: string) {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** Segunda-feira da semana de `data` */
export function inicioSemana(data: string) {
  const dow = diaDaSemana(data);
  return somarDias(data, dow === 0 ? -6 : 1 - dow);
}

export function descricaoItens(itens: { nome: string }[]) {
  return itens.map((i) => i.nome).join(" + ");
}

/** Mensagem pronta de confirmação para o WhatsApp */
export function mensagemConfirmacao(a: Pick<Agendamento, "cliente_nome" | "inicio" | "itens">) {
  const primeiro = a.cliente_nome.split(" ")[0];
  const dia = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(a.inicio));
  const hora = hhmmDeMinutos(minutosLocal(a.inicio));
  return `Oi, ${primeiro}! Tudo bem? Passando para confirmar seu horário de ${descricaoItens(a.itens)} ${dia}, às ${hora}, no Studio Lilian Santos. Posso confirmar? 💛`;
}
