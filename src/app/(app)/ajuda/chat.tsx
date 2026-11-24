"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buscarFaq, FAQ, parecidas, precisaDosDados } from "@/lib/ajuda-faq";

/*
 * Lis — tira-dúvidas do sistema, 100% grátis: respostas prontas (src/lib/ajuda-faq.ts) encontradas
 * por busca aqui mesmo no navegador. Sem IA, sem chave, sem custo.
 */

type Mensagem = {
  role: "user" | "assistant";
  content: string;
  /** perguntas prontas parecidas (quando não achou uma resposta certeira) */
  parecidas?: string[];
};

const SUGESTOES = [
  "Como a meta do mês é calculada?",
  "O que é o valor líquido?",
  "Como fecho um dia ou um turno na agenda?",
  "Como subo o extrato da Ton e resolvo as pendências?",
  "Como junto cadastros repetidos?",
  "O que eu posso ajustar sozinha e o que preciso pedir à Marilia?",
];

/** Negrito (**texto**), listas (- / 1.) e parágrafos. */
function Texto({ texto }: { texto: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>
    );
  return (
    <div className="space-y-1.5">
      {texto.split("\n").map((l, i) => {
        const t = l.trim();
        if (!t) return null;
        const bullet = t.match(/^[-•*]\s+(.*)/);
        const num = t.match(/^(\d+)[.)]\s+(.*)/);
        if (bullet)
          return (
            <p key={i} className="flex gap-2 pl-1">
              <span className="text-gold-dark">•</span>
              <span>{inline(bullet[1])}</span>
            </p>
          );
        if (num)
          return (
            <p key={i} className="flex gap-2 pl-1">
              <span className="text-gold-dark font-semibold tabular-nums">{num[1]}.</span>
              <span>{inline(num[2])}</span>
            </p>
          );
        return <p key={i}>{inline(t)}</p>;
      })}
    </div>
  );
}

const ONDE_VER_NUMEROS =
  "Eu não olho os números do studio, mas eles estão aqui:\n- **Resultados**: arrecadado, gasto, atendimentos, meta, o que mais vende, leads e quem abordar primeiro.\n- **Financeiro**: o caixa por dia, semana, mês ou ano, contas a pagar e a receber.\n- **Clientes**: a ficha de cada cliente e os filtros.";

export function Chat({ nome }: { nome: string }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [mensagens]);

  function perguntar(pergunta: string) {
    const p = pergunta.trim();
    if (!p) return;
    setTexto("");
    const achada = buscarFaq(p);
    const numeros = precisaDosDados(p);
    let resposta: Mensagem;
    if (achada && !numeros) resposta = { role: "assistant", content: achada.faq.resposta };
    else if (numeros) resposta = { role: "assistant", content: ONDE_VER_NUMEROS, parecidas: achada ? [achada.faq.pergunta] : [] };
    else {
      const sugestoes = parecidas(p).map((f) => f.pergunta);
      resposta = {
        role: "assistant",
        content: sugestoes.length
          ? "Não achei uma resposta certinha. Veja se é uma destas:"
          : "Não achei essa no meu guia. Tente com outras palavras (ex.: \"como fecho um dia na agenda?\") ou pergunte à Marilia.",
        parecidas: sugestoes,
      };
    }
    setMensagens((m) => [...m, { role: "user", content: p }, resposta]);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {mensagens.length === 0 ? (
        <div className="bg-card rounded-xl border p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Sparkles className="text-gold size-5" /> Oi, {nome}! Eu sou a Lis. Qual a sua dúvida sobre o sistema?
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Eu explico as regras, o que cada número significa, como fazer cada coisa e o que você mesma pode ajustar.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGESTOES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => perguntar(q)}
                className="bg-secondary/60 hover:border-gold/60 min-h-10 rounded-full border px-3.5 text-left text-sm"
              >
                {q}
              </button>
            ))}
          </div>
          <details className="mt-3">
            <summary className="text-muted-foreground cursor-pointer text-xs underline">Ver todas as {FAQ.length} dúvidas</summary>
            <ul className="mt-2 space-y-1.5">
              {FAQ.map((f) => (
                <li key={f.pergunta}>
                  <button type="button" onClick={() => perguntar(f.pergunta)} className="hover:text-gold-dark text-left text-sm underline-offset-2 hover:underline">
                    {f.pergunta}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : (
        <div className="space-y-3">
          {mensagens.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                  m.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card rounded-bl-md border"
                )}
              >
                {m.role === "assistant" ? (
                  <>
                    <Texto texto={m.content} />
                    {m.parecidas && m.parecidas.length > 0 && (
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        {m.parecidas.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => perguntar(q)}
                            className="bg-secondary/60 hover:border-gold/60 min-h-9 rounded-full border px-3 text-left text-sm"
                          >
                            {q}
                          </button>
                        ))}
                      </span>
                    )}
                  </>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          <div ref={fimRef} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          perguntar(texto);
        }}
        className="bg-card sticky bottom-20 flex items-end gap-2 rounded-2xl border p-2 shadow-sm md:bottom-4"
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              perguntar(texto);
            }
          }}
          rows={1}
          maxLength={500}
          placeholder="Pergunte para a Lis…"
          aria-label="Sua dúvida"
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-base outline-none"
        />
        <Button type="submit" size="icon" className="size-11 shrink-0 rounded-xl" disabled={!texto.trim()} aria-label="Enviar">
          <ArrowUp />
        </Button>
      </form>
      {mensagens.length > 0 && (
        <button
          type="button"
          onClick={() => setMensagens([])}
          className="text-muted-foreground mx-auto flex items-center gap-1.5 text-xs underline"
        >
          <RotateCcw className="size-3.5" /> Nova conversa
        </button>
      )}
    </div>
  );
}
