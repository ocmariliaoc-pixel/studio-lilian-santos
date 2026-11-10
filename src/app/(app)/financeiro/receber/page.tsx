import type { Metadata } from "next";
import { getPerfil, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoeda } from "@/lib/format";
import { hojeISO, dataBR } from "@/lib/financeiro";
import { inicioSemana, OFFSET, somarDias, dataLocal } from "@/lib/agenda";
import { ehRepasseCartao } from "@/lib/extrato-ton";
import { ErroMigracao } from "@/components/erro-migracao";
import { ListaExtrato, UploadExtrato, type Movimento } from "./receber-tela";

export const metadata: Metadata = { title: "Contas a receber" };

export default async function ContasReceberPage() {
  const perfil = await getPerfil();
  const admin = isAdmin(perfil);
  const hoje = hojeISO();
  const supabase = await createClient();

  const [ext, ags] = await Promise.all([
    supabase
      .from("extrato_movimentos")
      .select("id, data, tipo, descricao, meio, valor, lancamento_id, ignorado, lancamento:lancamentos(descricao, cliente_nome)")
      .order("data", { ascending: false })
      .order("saldo", { ascending: false })
      .limit(300),
    supabase
      .from("agendamentos")
      .select("inicio, valor_total, status")
      .in("status", ["agendado", "confirmado"])
      .gte("inicio", `${hoje}T00:00:00${OFFSET}`)
      .order("inicio"),
  ]);
  if (ext.error) return <ErroMigracao arquivo="0012_contas_extrato.sql" />;

  const movimentos = (ext.data ?? []).map((m) => ({
    ...m,
    valor: Number(m.valor),
    lancamento: m.lancamento as unknown as Movimento["lancamento"],
  })) as Movimento[];

  // Previsão: agendamentos marcados (agendado/confirmado) a partir de hoje
  const futuros = (ags.data ?? []).map((a) => ({ data: dataLocal(a.inicio), valor: Number(a.valor_total) }));
  const semanaFim = somarDias(inicioSemana(hoje), 6);
  const mesFim = `${hoje.slice(0, 7)}-31`;
  const prox = new Date(Date.UTC(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)), 1)).toISOString().slice(0, 7);
  const soma = (f: (d: string) => boolean) => futuros.filter((x) => f(x.data)).reduce((s, x) => s + x.valor, 0);
  const qtd = (f: (d: string) => boolean) => futuros.filter((x) => f(x.data)).length;
  const previsoes = [
    { titulo: "Esta semana", f: (d: string) => d <= semanaFim },
    { titulo: "Até o fim do mês", f: (d: string) => d <= mesFim },
    { titulo: "Próximo mês", f: (d: string) => d.startsWith(prox) },
    { titulo: "Tudo marcado", f: () => true },
  ];

  const entradasBanco = movimentos.filter((m) => m.tipo === "entrada" && !m.ignorado);
  const noCaixa = entradasBanco.filter((m) => m.lancamento_id);
  const cartao = entradasBanco.filter((m) => !m.lancamento_id && ehRepasseCartao(m));
  const faltam = entradasBanco.filter((m) => !m.lancamento_id && !ehRepasseCartao(m));
  const periodo = movimentos.length ? `${dataBR(movimentos[movimentos.length - 1].data)} a ${dataBR(movimentos[0].data)}` : null;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-1 text-lg font-semibold">Previsão de entradas</h2>
        <p className="text-muted-foreground mb-3 text-xs">Soma dos atendimentos agendados e confirmados (valor de cada agendamento).</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {previsoes.map((p) => (
            <div key={p.titulo} className="bg-card rounded-xl border p-4">
              <p className="text-muted-foreground text-xs font-medium">{p.titulo}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{formatMoeda(soma(p.f))}</p>
              <p className="text-muted-foreground text-xs">{qtd(p.f)} atendimentos</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Extrato da maquininha</h2>
        {admin && <UploadExtrato />}
        {periodo && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Caixa titulo="Entrou no banco" valor={entradasBanco.reduce((s, m) => s + m.valor, 0)} detalhe={periodo} />
            <Caixa titulo="Conferido com o caixa" valor={noCaixa.reduce((s, m) => s + m.valor, 0)} detalhe={`${noCaixa.length} movimentos`} />
            <Caixa titulo="Repasses do cartão" valor={cartao.reduce((s, m) => s + m.valor, 0)} detalhe="vendas no crédito/débito" />
            <Caixa titulo="Só no banco" valor={faltam.reduce((s, m) => s + m.valor, 0)} detalhe={`${faltam.length} para lançar`} destaque={faltam.length > 0} />
          </div>
        )}
        <ListaExtrato movimentos={movimentos} admin={admin} />
      </section>
    </div>
  );
}

function Caixa({ titulo, valor, detalhe, destaque }: { titulo: string; valor: number; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={`bg-card rounded-xl border p-4 ${destaque ? "border-amber-300 bg-amber-50" : ""}`}>
      <p className="text-muted-foreground text-xs font-medium">{titulo}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{formatMoeda(valor)}</p>
      {detalhe && <p className="text-muted-foreground text-xs">{detalhe}</p>}
    </div>
  );
}
