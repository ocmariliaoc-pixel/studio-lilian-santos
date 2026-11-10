"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Gift, MessageCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { linkWhatsApp } from "@/lib/clientes";
import { dataBR } from "@/lib/financeiro";
import {
  mensagemCupom,
  preencherMensagem,
  situacao,
  type Acompanhamento,
  type Cupom,
} from "@/lib/acompanhamentos";
import { atualizarCupom, marcarAcompanhamento } from "@/app/(app)/clientes/acompanhamento-actions";
import { cn } from "@/lib/utils";

const ROTULO: Record<ReturnType<typeof situacao>, { texto: string; classe: string }> = {
  atrasada: { texto: "atrasada", classe: "bg-rose-50 text-rose-900 border-rose-200" },
  hoje: { texto: "hoje", classe: "bg-amber-50 text-amber-900 border-amber-200" },
  em_breve: { texto: "em breve", classe: "bg-secondary text-secondary-foreground" },
  futura: { texto: "programada", classe: "bg-secondary text-muted-foreground" },
  agendada: { texto: "já tem horário", classe: "bg-sky-50 text-sky-900 border-sky-200" },
  enviada: { texto: "enviada", classe: "bg-emerald-50 text-emerald-900 border-emerald-200" },
};

function BotaoWhats({ href, rotulo }: { href: string | null; rotulo: string }) {
  if (!href) return <span className="text-muted-foreground text-[11px]">sem telefone</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={rotulo}
      className="flex h-8 shrink-0 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white"
    >
      <MessageCircle className="size-3.5" /> WhatsApp
    </a>
  );
}

/** Mensagem sugerida visível, com botão de copiar. */
function MensagemSugerida({ texto }: { texto: string }) {
  return (
    <details className="bg-secondary/50 mt-2 rounded-md px-2.5 py-2 text-xs leading-relaxed">
      <summary className="text-muted-foreground cursor-pointer font-semibold">Ver o que falar</summary>
      <p className="mt-1 whitespace-pre-line">{texto}</p>
      <button
        type="button"
        className="text-muted-foreground mt-1.5 flex items-center gap-1 underline"
        onClick={() => navigator.clipboard?.writeText(texto).then(() => toast.success("Mensagem copiada"))}
      >
        <Copy className="size-3" /> Copiar
      </button>
    </details>
  );
}

/** Uma mensagem de pós-atendimento: datas escritas, WhatsApp pronto e "feito". */
export function AcompanhamentoItem({
  a,
  hoje,
  mostrarNome = false,
}: {
  a: Acompanhamento;
  hoje: string;
  mostrarNome?: boolean;
}) {
  const [enviada, setEnviada] = useState(a.mensagem_enviada);
  const [pendente, iniciar] = useTransition();
  const sit = situacao({ ...a, mensagem_enviada: enviada }, hoje);
  const r = ROTULO[sit];

  function marcar(feito: boolean) {
    setEnviada(feito);
    iniciar(async () => {
      const res = await marcarAcompanhamento(a.cliente_id, a.regra, a.atendido_em, feito);
      if (!res.ok) {
        setEnviada(!feito);
        toast.error(res.erro);
      }
    });
  }

  return (
    <div className={cn("rounded-lg border px-3 py-2", sit === "enviada" && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {mostrarNome && <span className="font-medium">{a.cliente_nome}</span>}
        <span className="text-muted-foreground">{a.regra_nome}</span>
        <span className={cn("rounded border px-1.5 py-0.5 text-[11px] font-medium", r.classe)}>{r.texto}</span>
      </div>
      <p className="text-muted-foreground mt-1 text-xs">
        {a.servico} em {dataBR(a.atendido_em).slice(0, 5)} · mensagem em <b className="text-foreground">{dataBR(a.mensagem_em)}</b>
        {a.retorno_em && (
          <>
            {" "}
            · retorno a partir de <b className="text-foreground">{dataBR(a.retorno_em)}</b>
          </>
        )}
      </p>
      {!enviada && sit !== "agendada" && <MensagemSugerida texto={preencherMensagem(a)} />}
      {sit !== "agendada" && (
        <div className="mt-2 flex items-center gap-2">
          {!enviada && <BotaoWhats href={linkWhatsApp(a.whatsapp, preencherMensagem(a))} rotulo={`Mandar mensagem para ${a.cliente_nome}`} />}
          <button
            type="button"
            disabled={pendente}
            onClick={() => marcar(!enviada)}
            className="hover:bg-secondary flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium"
          >
            {enviada ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
            {enviada ? "Desfazer" : "Mensagem enviada"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Desconto ganho (ex.: balão da inauguração): lembrete no WhatsApp e "usado". */
export function CupomItem({
  c,
  nome,
  whatsapp,
  hoje,
  mostrarNome = false,
}: {
  c: Cupom;
  nome: string;
  whatsapp: string | null;
  hoje: string;
  mostrarNome?: boolean;
}) {
  const [usado, setUsado] = useState(!!c.usado_em);
  const [lembrado, setLembrado] = useState(!!c.lembrado_em);
  const [pendente, iniciar] = useTransition();
  const vencido = !!c.valido_ate && c.valido_ate < hoje;

  function acao(tipo: "lembrado" | "usado" | "desfazer_uso") {
    if (tipo === "lembrado") setLembrado(true);
    else setUsado(tipo === "usado");
    iniciar(async () => {
      const r = await atualizarCupom(c.id, tipo);
      if (!r.ok) toast.error(r.erro);
    });
  }

  const pct = Number(c.percentual) === 100 ? "grátis" : `${String(Number(c.percentual)).replace(".", ",")}%`;
  return (
    <div className={cn("rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2", (usado || vencido) && "opacity-60")}>
      <p className="flex flex-wrap items-center gap-x-2 text-sm">
        <Gift className="size-4 text-amber-700" />
        {mostrarNome && <span className="font-medium">{nome}</span>}
        <span>
          <b>{pct}</b> em {c.descricao}
        </span>
        {c.valido_ate && <span className="text-muted-foreground text-xs">até {dataBR(c.valido_ate).slice(0, 5)}</span>}
        {usado && <span className="text-xs font-medium text-emerald-800">usado</span>}
        {!usado && vencido && <span className="text-xs font-medium text-rose-800">vencido</span>}
        {!usado && !vencido && lembrado && <span className="text-xs text-amber-800">lembrete enviado</span>}
      </p>
      {!usado && !vencido && !lembrado && <MensagemSugerida texto={mensagemCupom(nome, c)} />}
      {!usado && !vencido && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span onClick={() => acao("lembrado")}>
            <BotaoWhats href={linkWhatsApp(whatsapp, mensagemCupom(nome, c))} rotulo={`Lembrar ${nome} do desconto`} />
          </span>
          <button
            type="button"
            disabled={pendente}
            onClick={() => acao("usado")}
            className="hover:bg-secondary flex h-8 items-center gap-1 rounded-md border bg-white px-2.5 text-xs font-medium"
          >
            <Check className="size-3.5" /> Usou o desconto
          </button>
        </div>
      )}
      {usado && (
        <button type="button" onClick={() => acao("desfazer_uso")} className="text-muted-foreground mt-1 text-xs underline">
          desfazer
        </button>
      )}
    </div>
  );
}
