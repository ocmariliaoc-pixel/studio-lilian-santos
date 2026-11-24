import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { CONHECIMENTO_SISTEMA } from "@/lib/ajuda-conhecimento";

// Tira-dúvidas (IA) sobre regras, definições e ajustes do sistema — só para administradoras.
// A chave fica no servidor (variável ANTHROPIC_API_KEY na Vercel); nada de dados de clientes vai para a IA.

export const runtime = "nodejs";
export const maxDuration = 60;

const INSTRUCOES = `Você é o Tira-dúvidas do sistema administrativo do Studio Lilian Santos (estúdio de estética).
Quem pergunta é a Ana Jessica, administradora do studio (ou outra administradora).

Responda sobre regras, definições, como fazer cada coisa no sistema e o que dá para ajustar, usando SÓ o guia abaixo.
- Português do Brasil, tom simples e acolhedor, frases curtas. Ela usa muito pelo celular.
- Seja direta: comece pela resposta. Use passos numerados quando for "como fazer" e diga o caminho no menu (ex.: Financeiro › Contas a pagar).
- Valores em R$ com vírgula (R$ 1.750,00), datas dd/mm/aaaa.
- Se a resposta não está no guia, diga que não sabe com certeza e sugira perguntar à Marilia. Nunca invente telas, botões ou regras.
- Se for algo que ela mesma pode ajustar, diga onde. Se exigir mudança no sistema, diga que é um pedido para a Marilia e sugira como descrever o pedido.
- Você não vê os dados do studio (clientes, vendas, agenda). Se ela perguntar números ou sobre uma cliente específica, explique onde ver no sistema.
- Não peça nem repita dados pessoais de clientes.

<guia>
${CONHECIMENTO_SISTEMA}
</guia>`;

type Mensagem = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ erro: "Entre no sistema de novo." }, { status: 401 });
  const { data: perfil } = await supabase.from("perfis").select("papel, ativo").eq("id", user.id).maybeSingle();
  if (perfil?.papel !== "admin" || perfil?.ativo === false)
    return Response.json({ erro: "O Tira-dúvidas é só para administradoras." }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY)
    return Response.json(
      { erro: "Falta configurar a chave da IA (ANTHROPIC_API_KEY) na Vercel. Peça à Marilia." },
      { status: 503 }
    );

  let mensagens: Mensagem[];
  try {
    const corpo = await req.json();
    mensagens = (Array.isArray(corpo?.mensagens) ? corpo.mensagens : [])
      .filter(
        (m: Mensagem) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim()
      )
      .slice(-20)
      .map((m: Mensagem) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  } catch {
    return Response.json({ erro: "Pergunta inválida." }, { status: 400 });
  }
  // A conversa precisa começar com a pergunta dela
  while (mensagens.length && mensagens[0].role !== "user") mensagens.shift();
  if (!mensagens.length || mensagens[mensagens.length - 1].role !== "user")
    return Response.json({ erro: "Escreva sua pergunta." }, { status: 400 });

  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    // perguntas do dia a dia: esforço baixo responde rápido e bem
    output_config: { effort: "low" },
    // guia fixo e grande: em cache (fica mais barato a partir da 2ª pergunta)
    system: [{ type: "text", text: INSTRUCOES, cache_control: { type: "ephemeral" } }],
    messages: mensagens,
  });

  const encoder = new TextEncoder();
  const corpo = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta")
            controller.enqueue(encoder.encode(ev.delta.text));
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal")
          controller.enqueue(encoder.encode("\n\nNão consegui responder essa. Tente perguntar de outro jeito."));
        else if (final.stop_reason === "max_tokens")
          controller.enqueue(encoder.encode("\n\n(A resposta ficou longa e foi cortada. Peça para continuar.)"));
      } catch (e) {
        const msg =
          e instanceof Anthropic.AuthenticationError
            ? "A chave da IA na Vercel não está valendo. Peça à Marilia para conferir."
            : e instanceof Anthropic.RateLimitError
              ? "Muitas perguntas seguidas. Espere um minutinho e tente de novo."
              : e instanceof Anthropic.APIError && (e.status ?? 0) >= 500
                ? "A IA está fora do ar agora. Tente de novo em alguns minutos."
                : e instanceof Anthropic.APIConnectionError
                  ? "Sem conexão com a IA agora. Tente de novo."
                  : "Não consegui responder agora. Tente de novo.";
        controller.enqueue(encoder.encode(`\n\n⚠ ${msg}`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(corpo, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
