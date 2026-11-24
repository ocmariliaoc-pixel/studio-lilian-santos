import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { CONHECIMENTO_SISTEMA } from "@/lib/ajuda-conhecimento";
import { executarFerramenta, FERRAMENTAS_LIS, ROTULO_FERRAMENTA } from "@/lib/lis-ferramentas";
import { dataExtensoISO, hojeISO } from "@/lib/financeiro";

// Lis — IA da administradora: tira dúvidas sobre regras do sistema, CONSULTA os dados do studio
// (ferramentas só de leitura, com o login de quem pergunta) e propõe soluções.
// A chave fica no servidor (ANTHROPIC_API_KEY na Vercel). De clientes só vão nomes e números, nunca contatos.

export const runtime = "nodejs";
export const maxDuration = 120;

const INSTRUCOES = `Você é a Lis, assistente de gestão do Studio Lilian Santos (estúdio de estética em Fortaleza).
Quem conversa com você é a Ana Jessica, administradora do studio (ou outra administradora).

Você faz três coisas:
1. Tira dúvidas sobre as regras, definições e telas do sistema, usando o guia abaixo.
2. Consulta os dados reais do studio com as ferramentas (caixa, atendimentos, clientes, meta, produtos, contas a pagar, agenda) para responder com números.
3. Ajuda a decidir: analisa os números, aponta o que chama atenção e propõe soluções práticas.

Como trabalhar:
- Pergunta com número, comparação, "como estamos", "o que fazer", "vale a pena"? Consulte as ferramentas antes de responder; nunca invente números. Se precisar, use mais de uma ferramenta.
- Comece pela resposta direta (o número ou a conclusão), depois explique em poucas linhas o que os dados mostram.
- Quando fizer sentido, termine com "**O que eu sugiro**": 2 a 4 ações concretas, possíveis de fazer no próprio sistema ou no dia a dia do studio (ex.: quem abordar primeiro no WhatsApp, fechar um horário pouco usado, rever um preço, cobrar a confirmação). Diga onde fazer no sistema (ex.: Resultados › Prioridade de abordagem).
- Seja honesta sobre limites: o studio abriu em out/2026 e tem pouco histórico; diga quando a amostra é pequena para concluir algo, e separe fato (dado) de opinião (sugestão).
- Decisões grandes (preço, contratação, investimento, mudar metas) são da Ana e da Lilian: traga os números, os prós e contras e uma recomendação, sem decidir por elas.
- Português do Brasil, tom acolhedor e objetivo, frases curtas (ela usa muito pelo celular). Valores em R$ com vírgula (R$ 1.750,00), datas dd/mm/aaaa. Use listas curtas e **negrito** só no que importa; sem tabelas.
- Dados de clientes são sensíveis (LGPD): cite nomes só quando ajudar a agir (ex.: quem abordar) e nunca peça ou repita telefone, e-mail ou outros dados pessoais.
- Mudança no sistema (tela, regra, relatório novo) é pedido para a Marilia; diga isso e sugira como descrever o pedido.
- Se não souber ou a ferramenta der erro, diga com franqueza e indique onde ver no sistema.

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
    return Response.json({ erro: "A Lis é só para administradoras." }, { status: 403 });

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
  const hoje = hojeISO();
  // Conversa da vez: histórico em texto + a data de hoje como instrução de sistema no fim (não quebra o cache do guia)
  const conversa: Anthropic.Beta.BetaMessageParam[] = [
    ...mensagens,
    { role: "system", content: `Hoje é ${dataExtensoISO(hoje)} (${hoje}), horário de Fortaleza.` },
  ] as Anthropic.Beta.BetaMessageParam[];

  const encoder = new TextEncoder();
  let parar = false;
  const corpo = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enviar = (t: string) => controller.enqueue(encoder.encode(t));
      // marcador de status (o navegador mostra "Olhando o caixa…" enquanto a Lis consulta)
      const status = (t: string) => enviar(`\u001e${t}\u001e`);
      try {
        for (let volta = 0; volta < 6 && !parar; volta++) {
          const stream = client.beta.messages.stream({
            // Haiku 5.5: barato (≈ R$ 0,01–0,02 por pergunta) e ainda consulta os dados e sugere.
            // Se um dia precisar de análises mais profundas, trocar por "claude-sonnet-5-5" ou "claude-opus-5-5".
            model: "claude-haiku-5-5",
            max_tokens: 8000,
            output_config: { effort: "medium" },
            system: [{ type: "text", text: INSTRUCOES, cache_control: { type: "ephemeral" } }],
            tools: FERRAMENTAS_LIS,
            messages: conversa,
          });
          for await (const ev of stream) {
            if (parar) break;
            if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") enviar(ev.delta.text);
          }
          const final = await stream.finalMessage();
          if (final.stop_reason === "refusal") {
            enviar("\n\nNão consegui responder essa. Tente perguntar de outro jeito.");
            break;
          }
          if (final.stop_reason === "max_tokens") {
            enviar("\n\n(A resposta ficou longa e foi cortada. Peça para continuar.)");
            break;
          }
          if (final.stop_reason !== "tool_use") break;
          // A Lis pediu dados: consulta (só leitura, com o login de quem pergunta) e devolve os resultados
          conversa.push({ role: "assistant", content: final.content });
          const usos = final.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
          const resultados = await Promise.all(
            usos.map(async (u) => {
              status(ROTULO_FERRAMENTA[u.name] ?? "Consultando os dados");
              const r = await executarFerramenta(supabase, u.name, u.input);
              return {
                type: "tool_result" as const,
                tool_use_id: u.id,
                content: JSON.stringify(r),
                ...(r && typeof r === "object" && "erro" in r ? { is_error: true } : {}),
              };
            })
          );
          conversa.push({ role: "user", content: resultados });
          status("");
        }
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
        enviar(`\n\n⚠ ${msg}`);
      } finally {
        controller.close();
      }
    },
    cancel() {
      parar = true;
    },
  });

  return new Response(corpo, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
