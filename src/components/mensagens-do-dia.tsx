import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cupomValido, pendenteAgora, type Acompanhamento, type Cupom } from "@/lib/acompanhamentos";
import { AcompanhamentoItem } from "@/components/acompanhamento-itens";
import { dataBR } from "@/lib/financeiro";

/** Painel do Início: pós-atendimento de hoje/atrasado e descontos ainda não lembrados. */
export async function MensagensDoDia({ hoje }: { hoje: string }) {
  const supabase = await createClient();
  const [acomp, cupons] = await Promise.all([
    supabase.from("acompanhamentos").select("*").lte("mensagem_em", hoje).eq("mensagem_enviada", false),
    supabase.from("cupons").select("*, cliente:clientes(nome, whatsapp)").is("usado_em", null).is("lembrado_em", null),
  ]);
  if (acomp.error) return null;

  const pendentes = ((acomp.data ?? []) as Acompanhamento[])
    .filter((a) => pendenteAgora(a, hoje))
    .sort((a, b) => a.mensagem_em.localeCompare(b.mensagem_em));
  const lembrar = ((cupons.data ?? []) as (Cupom & { cliente: { nome: string; whatsapp: string | null } | null })[])
    .map((c) => ({ ...c, percentual: Number(c.percentual) }))
    .filter((c) => cupomValido(c, hoje));

  if (pendentes.length === 0 && lembrar.length === 0) return null;
  const MAX = 4;
  const primeiroVencimento = lembrar.map((c) => c.valido_ate).filter(Boolean).sort()[0] ?? null;

  return (
    <section className="bg-card space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <MessageCircle className="size-4 text-emerald-700" />
          Mensagens para mandar ({pendentes.length + lembrar.length})
        </h2>
        <Link href="/clientes" className="text-muted-foreground text-xs underline">
          ver clientes
        </Link>
      </div>
      {pendentes.slice(0, MAX).map((a) => (
        <AcompanhamentoItem key={`${a.cliente_id}-${a.regra}`} a={a} hoje={hoje} mostrarNome />
      ))}
      {pendentes.length > MAX && (
        <Link href="/clientes?f=mensagens" className="text-primary block text-sm font-medium underline">
          + {pendentes.length - MAX} mensagens — ver todas
        </Link>
      )}
      {lembrar.length > 0 && (
        <Link
          href="/clientes?f=desconto"
          className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-sm"
        >
          <span>
            <b>{lembrar.length} descontos</b> da inauguração para lembrar
            {primeiroVencimento ? ` · vencem em ${dataBR(primeiroVencimento).slice(0, 5)}` : ""}
          </span>
          <span className="font-medium whitespace-nowrap">Ver →</span>
        </Link>
      )}
    </section>
  );
}
