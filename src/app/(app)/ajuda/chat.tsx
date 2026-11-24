"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buscarFaq, FAQ, parecidas, precisaDosDados } from "@/lib/ajuda-faq";

type Mensagem = {
  role: "user" | "assistant";
  content: string;
  /** "guia" = resposta pronta (grátis, sem IA); "ia" = Lis com IA */
  fonte?: "guia" | "ia";
  /** pergunta que gerou a resposta do guia (para "Perguntar à Lis") */
  pergunta?: string;
  /** perguntas prontas parecidas (quando a IA não está ligada) */
  parecidas?: string[];
};

// Análises com a IA (olham os números do studio)
const SUGESTOES_IA = [
  "Como estamos em relação à meta deste mês? O que fazer para bater?",
  "Quanto entrou e quanto saiu desde a abertura? Estamos no caminho certo?",
  "Quais clientes devo abordar primeiro esta semana?",
  "Quais dias e horários estão mais vazios? Vale fechar algum?",
  "Quais serviços e produtos vendem mais? O que vale divulgar?",
  "Tem conta atrasada ou vencendo este mês?",
];
// Dúvidas do sistema com resposta pronta (grátis)
const SUGESTOES_GUIA = [
  "Como a meta do mês é calculada?",
  "O que é o valor líquido?",
  "Como fecho um dia ou um turno na agenda?",
  "Como subo o extrato da Ton e resolvo as pendências?",
  "O que eu posso ajustar sozinha e o que preciso pedir à Marilia?",
];

// Marcador de status enviado pelo servidor enquanto a Lis consulta os dados: \u001e texto \u001e
const MARCADOR = /\u001e([^\u001e]*)\u001e/g;

/** Negrito (**texto**), listas (- / 1.) e parágrafos — o suficiente para as respostas. */
function Texto({ texto }: { texto: string }) {
  const linhas = texto.split("\n");
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>
    );
  return (
    <div className="space-y-1.5">
      {linhas.map((l, i) => {
        const t = l.trim();
        if (!t) return null;
        const bullet = t.match(/^[-•*]\s+(.*)/);
        const num = t.match(/^(\d+)[.)]\s+(.*)/);
        const titulo = t.match(/^#{1,4}\s+(.*)/);
        if (titulo) return <p key={i} className="pt-1 font-semibold">{inline(titulo[1])}</p>;
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

export function Chat({ nome }: { nome: string }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [statusLis, setStatusLis] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [mensagens]);

  async function perguntar(pergunta: string, forcarIA = false) {
    const p = pergunta.trim();
    if (!p || enviando) return;
    // 1) Dúvida do sistema com resposta pronta: responde de graça, sem IA
    const achada = !forcarIA && !precisaDosDados(p) ? buscarFaq(p) : null;
    if (achada) {
      setMensagens((m) => [
        ...m,
        { role: "user", content: p },
        { role: "assistant", content: achada.faq.resposta, fonte: "guia", pergunta: p },
      ]);
      setTexto("");
      return;
    }
    // 2) Números, decisões ou algo fora do guia: Lis com IA
    const base = forcarIA && mensagens.at(-1)?.fonte === "guia" ? mensagens.slice(0, -2) : mensagens;
    const historico: Mensagem[] = [...base, { role: "user", content: p }];
    setMensagens([...historico, { role: "assistant", content: "", fonte: "ia" }]);
    setTexto("");
    setEnviando(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const escrever = (resposta: string, extra: Partial<Mensagem> = {}) =>
      setMensagens((m) => [...m.slice(0, -1), { role: "assistant", content: resposta, fonte: "ia", ...extra }]);
    try {
      const r = await fetch("/api/ajuda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico.map(({ role, content }) => ({ role, content })) }),
        signal: ctrl.signal,
      });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => null);
        const sugestoes = parecidas(p).map((f) => f.pergunta);
        escrever(
          r.status === 503
            ? `A parte com IA (que olha os números e sugere) ainda não está ligada. Os números estão em **Resultados** e no **Financeiro**.${sugestoes.length ? " Veja se uma destas responde:" : " Tente perguntar de outro jeito, ex.: \"Como fecho um dia na agenda?\""}`
            : `⚠ ${j?.erro ?? "Não consegui responder agora. Tente de novo."}`,
          r.status === 503 ? { parecidas: sugestoes } : {}
        );
        return;
      }
      const leitor = r.body.getReader();
      const dec = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        acumulado += dec.decode(value, { stream: true });
        // separa os avisos de status ("Olhando o caixa") do texto da resposta
        let ultimo: string | null = null;
        for (const m of acumulado.matchAll(MARCADOR)) ultimo = m[1];
        if (ultimo !== null) setStatusLis(ultimo);
        escrever(acumulado.replace(MARCADOR, "").replace(/\u001e[^\u001e]*$/, ""));
      }
      if (!acumulado.replace(MARCADOR, "").trim()) escrever("⚠ Não consegui responder agora. Tente de novo.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") escrever("⚠ Sem conexão. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
      setStatusLis("");
      abortRef.current = null;
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {mensagens.length === 0 ? (
        <div className="bg-card rounded-xl border p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Sparkles className="text-gold size-5" /> Oi, {nome}! Eu sou a Lis. Em que posso ajudar?
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Dúvidas sobre o sistema eu respondo na hora, de graça. Para olhar os números do studio (caixa,
            atendimentos, clientes, meta, produtos, contas e agenda) e sugerir o que fazer, eu uso a IA. Não altero
            nada — só olho e sugiro.
          </p>
          <p className="mt-4 text-xs font-semibold tracking-widest text-emerald-800 uppercase">Dúvidas do sistema · grátis</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGESTOES_GUIA.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => perguntar(q)}
                className="min-h-10 rounded-full border border-emerald-200 bg-emerald-50/60 px-3.5 text-left text-sm hover:border-emerald-400"
              >
                {q}
              </button>
            ))}
          </div>
          <details className="mt-2">
            <summary className="text-muted-foreground cursor-pointer text-xs underline">Ver todas as {FAQ.length} dúvidas prontas</summary>
            <ul className="mt-2 space-y-1">
              {FAQ.map((f) => (
                <li key={f.pergunta}>
                  <button type="button" onClick={() => perguntar(f.pergunta)} className="hover:text-gold-dark text-left text-sm underline-offset-2 hover:underline">
                    {f.pergunta}
                  </button>
                </li>
              ))}
            </ul>
          </details>
          <p className="text-gold-dark mt-5 text-xs font-semibold tracking-widest uppercase">Análises com IA · olham os números</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGESTOES_IA.map((q) => (
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
                {m.role === "assistant" && !m.content ? (
                  <span className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="size-4 animate-spin" /> {statusLis ? `${statusLis}…` : "Pensando…"}
                  </span>
                ) : m.role === "assistant" ? (
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
                    {m.fonte === "guia" && (
                      <span className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-xs">
                        <span>Resposta do guia · grátis</span>
                        {i === mensagens.length - 1 && m.pergunta && (
                          <button type="button" onClick={() => perguntar(m.pergunta!, true)} className="text-gold-dark font-medium underline">
                            Não era isso? Perguntar à Lis (IA)
                          </button>
                        )}
                      </span>
                    )}
                    {enviando && i === mensagens.length - 1 && statusLis && (
                      <span className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
                        <Loader2 className="size-4 animate-spin" /> {statusLis}…
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
          maxLength={2000}
          placeholder="Pergunte para a Lis…"
          aria-label="Sua dúvida"
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-base outline-none"
        />
        <Button type="submit" size="icon" className="size-11 shrink-0 rounded-xl" disabled={enviando || !texto.trim()} aria-label="Enviar">
          {enviando ? <Loader2 className="animate-spin" /> : <ArrowUp />}
        </Button>
      </form>
      {mensagens.length > 0 && !enviando && (
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
