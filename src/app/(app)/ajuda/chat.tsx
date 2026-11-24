"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mensagem = { role: "user" | "assistant"; content: string };

const SUGESTOES = [
  "Como a meta do mês é calculada?",
  "O que é o valor líquido?",
  "Como fecho um dia na agenda?",
  "Como lanço uma venda com desconto?",
  "O que faço com as pendências do extrato da Ton?",
  "O que eu mesma posso ajustar e o que preciso pedir à Marilia?",
];

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
  const fimRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [mensagens]);

  async function perguntar(pergunta: string) {
    const p = pergunta.trim();
    if (!p || enviando) return;
    const historico: Mensagem[] = [...mensagens, { role: "user", content: p }];
    setMensagens([...historico, { role: "assistant", content: "" }]);
    setTexto("");
    setEnviando(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const escrever = (resposta: string) =>
      setMensagens((m) => [...m.slice(0, -1), { role: "assistant", content: resposta }]);
    try {
      const r = await fetch("/api/ajuda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico }),
        signal: ctrl.signal,
      });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => null);
        escrever(`⚠ ${j?.erro ?? "Não consegui responder agora. Tente de novo."}`);
        return;
      }
      const leitor = r.body.getReader();
      const dec = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        acumulado += dec.decode(value, { stream: true });
        escrever(acumulado);
      }
      if (!acumulado.trim()) escrever("⚠ Não consegui responder agora. Tente de novo.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") escrever("⚠ Sem conexão. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {mensagens.length === 0 ? (
        <div className="bg-card rounded-xl border p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Sparkles className="text-gold size-5" /> Oi, {nome}! Em que posso ajudar?
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Eu conheço as regras e as telas do sistema. Não vejo os dados das clientes nem os números do studio — para
            isso, eu te digo onde olhar.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => perguntar(s)}
                className="bg-secondary/60 hover:border-gold/60 min-h-10 rounded-full border px-3.5 text-left text-sm"
              >
                {s}
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
                    <Loader2 className="size-4 animate-spin" /> Pensando…
                  </span>
                ) : m.role === "assistant" ? (
                  <Texto texto={m.content} />
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
          placeholder="Escreva sua dúvida…"
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
