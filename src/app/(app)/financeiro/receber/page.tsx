import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getPerfil, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoeda } from "@/lib/format";
import { hojeISO, dataBR } from "@/lib/financeiro";
import { inicioSemana, OFFSET, somarDias, dataLocal, hhmmDeMinutos, minutosLocal } from "@/lib/agenda";
import { ehRepasseCartao } from "@/lib/extrato-ton";
import { ErroMigracao } from "@/components/erro-migracao";
import { ListaExtrato, UploadExtrato, type Movimento } from "./receber-tela";

export const metadata: Metadata = { title: "Contas a receber" };

type Previsao = "semana" | "mes" | "prox" | "tudo";

export default async function ContasReceberPage({
  searchParams,
}: {
  searchParams: Promise<{ prev?: string; ext?: string }>;
}) {
  const sp = await searchParams;
  const prevAberta = (["semana", "mes", "prox", "tudo"] as const).find((x) => x === sp.prev) ?? null;
  const extFiltro = (["banco", "caixa", "cartao", "faltam"] as const).find((x) => x === sp.ext) ?? null;
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
      .select("id, inicio, valor_total, status, cliente:clientes(nome), itens:agendamento_itens(nome, ordem)")
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
  const futuros = (ags.data ?? []).map((a) => ({
    id: a.id as string,
    data: dataLocal(a.inicio),
    hora: hhmmDeMinutos(minutosLocal(a.inicio)),
    valor: Number(a.valor_total),
    status: a.status as string,
    cliente: (a.cliente as unknown as { nome: string } | null)?.nome ?? "—",
    servicos: ((a.itens ?? []) as { nome: string; ordem: number }[])
      .sort((x, y) => x.ordem - y.ordem)
      .map((i) => i.nome)
      .join(" + "),
  }));
  const semanaFim = somarDias(inicioSemana(hoje), 6);
  const mesFim = `${hoje.slice(0, 7)}-31`;
  const prox = new Date(Date.UTC(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)), 1)).toISOString().slice(0, 7);
  const soma = (f: (d: string) => boolean) => futuros.filter((x) => f(x.data)).reduce((s, x) => s + x.valor, 0);
  const qtd = (f: (d: string) => boolean) => futuros.filter((x) => f(x.data)).length;
  const previsoes: { id: Previsao; titulo: string; f: (d: string) => boolean }[] = [
    { id: "semana", titulo: "Esta semana", f: (d: string) => d <= semanaFim },
    { id: "mes", titulo: "Até o fim do mês", f: (d: string) => d <= mesFim },
    { id: "prox", titulo: "Próximo mês", f: (d: string) => d.startsWith(prox) },
    { id: "tudo", titulo: "Tudo marcado", f: () => true },
  ];
  const href = (prev: string | null, ext: string | null) => {
    const q = [prev && `prev=${prev}`, ext && `ext=${ext}`].filter(Boolean).join("&");
    return `/financeiro/receber${q ? `?${q}` : ""}`;
  };
  const previsaoAberta = previsoes.find((p) => p.id === prevAberta);
  const listaPrevisao = previsaoAberta ? futuros.filter((x) => previsaoAberta.f(x.data)) : [];

  const entradasBanco = movimentos.filter((m) => m.tipo === "entrada" && !m.ignorado);
  const noCaixa = entradasBanco.filter((m) => m.lancamento_id);
  const cartao = entradasBanco.filter((m) => !m.lancamento_id && ehRepasseCartao(m));
  const faltam = entradasBanco.filter((m) => !m.lancamento_id && !ehRepasseCartao(m));
  const listaExtrato =
    extFiltro === "banco" ? entradasBanco : extFiltro === "caixa" ? noCaixa : extFiltro === "cartao" ? cartao : extFiltro === "faltam" ? faltam : movimentos;
  const periodo = movimentos.length ? `${dataBR(movimentos[movimentos.length - 1].data)} a ${dataBR(movimentos[0].data)}` : null;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-1 text-lg font-semibold">Previsão de entradas</h2>
        <p className="text-muted-foreground mb-3 text-xs">Soma dos atendimentos agendados e confirmados (valor de cada agendamento).</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {previsoes.map((p) => (
            <Link
              key={p.titulo}
              href={href(prevAberta === p.id ? null : p.id, extFiltro)}
              scroll={false}
              className={cn(
                "bg-card hover:border-gold rounded-xl border p-4 transition-colors",
                prevAberta === p.id && "border-gold ring-gold/40 ring-2"
              )}
            >
              <p className="text-muted-foreground text-xs font-medium">{p.titulo}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{formatMoeda(soma(p.f))}</p>
              <p className="text-muted-foreground text-xs">{qtd(p.f)} atendimentos · ver</p>
            </Link>
          ))}
        </div>
        {previsaoAberta && (
          <div className="mt-3 space-y-2">
            <p className="bg-secondary/60 flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-sm">
              <span>
                {previsaoAberta.titulo}: {listaPrevisao.length} atendimentos ·{" "}
                <b>{formatMoeda(listaPrevisao.reduce((s, x) => s + x.valor, 0))}</b>
              </span>
              <Link href={href(null, extFiltro)} scroll={false} className="font-medium underline">
                fechar
              </Link>
            </p>
            {listaPrevisao.length > 0 && (
              <ul className="bg-card divide-y overflow-hidden rounded-xl border">
                {listaPrevisao.map((x) => (
                  <li key={x.id}>
                    <Link href={`/agenda?v=dia&d=${x.data}&a=${x.id}`} className="hover:bg-secondary/40 flex items-center gap-3 px-4 py-3">
                      <span className="w-16 shrink-0 text-sm tabular-nums">
                        <b>{dataBR(x.data).slice(0, 5)}</b>
                        <span className="text-muted-foreground block text-xs">{x.hora}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{x.cliente}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {x.servicos || "—"} · {x.status === "confirmado" ? "confirmado" : "agendado"}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums">{formatMoeda(x.valor)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Extrato da maquininha</h2>
        {admin && <UploadExtrato />}
        {periodo && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(
              [
                ["banco", "Entrou no banco", entradasBanco, periodo],
                ["caixa", "Conferido com o caixa", noCaixa, `${noCaixa.length} movimentos`],
                ["cartao", "Repasses do cartão", cartao, `${cartao.length} repasses`],
                ["faltam", "Só no banco", faltam, `${faltam.length} para lançar`],
              ] as const
            ).map(([id, titulo, lista, detalhe]) => (
              <Caixa
                key={id}
                titulo={titulo}
                valor={lista.reduce((s, m) => s + m.valor, 0)}
                detalhe={`${detalhe} · ver`}
                destaque={id === "faltam" && faltam.length > 0}
                ativo={extFiltro === id}
                href={href(prevAberta, extFiltro === id ? null : id)}
              />
            ))}
          </div>
        )}
        <Legenda
          itens={[
            ["✅ no caixa", "a entrada do banco já está lançada no caixa (conferida por valor, data e nome)."],
            ["💳 repasse do cartão", "dinheiro das vendas no crédito/débito que a Ton repassou; as vendas já estão no caixa."],
            ["Lançar no caixa", "entrada que só está no banco: vira uma venda por Pix como “serviço a confirmar” — depois abra no Caixa e escreva o serviço."],
            ["Ignorar", "não é venda (ex.: transferência entre contas); sai da conta e pode ser reaberto."],
          ]}
        />
        {extFiltro && (
          <p className="bg-secondary/60 flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-sm">
            <span>
              Mostrando só: {{ banco: "o que entrou no banco", caixa: "o que já está no caixa", cartao: "repasses do cartão", faltam: "o que está só no banco" }[extFiltro]} ·{" "}
              {listaExtrato.length} movimentos
            </span>
            <Link href={href(prevAberta, null)} scroll={false} className="font-medium underline">
              ver tudo
            </Link>
          </p>
        )}
        <ListaExtrato movimentos={listaExtrato} admin={admin} />
      </section>
    </div>
  );
}

function Legenda({ itens }: { itens: [string, string][] }) {
  return (
    <details className="bg-card rounded-xl border px-4 py-3 text-sm" open>
      <summary className="cursor-pointer text-xs font-semibold tracking-widest text-muted-foreground uppercase">Legenda</summary>
      <dl className="mt-2 space-y-1.5">
        {itens.map(([t, d]) => (
          <div key={t} className="grid grid-cols-[9.5rem_1fr] gap-2">
            <dt className="font-medium">{t}</dt>
            <dd className="text-muted-foreground">{d}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function Caixa({
  titulo,
  valor,
  detalhe,
  destaque,
  ativo,
  href,
}: {
  titulo: string;
  valor: number;
  detalhe?: string;
  destaque?: boolean;
  ativo?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "bg-card hover:border-gold rounded-xl border p-4 transition-colors",
        destaque && "border-amber-300 bg-amber-50",
        ativo && "border-gold ring-gold/40 ring-2"
      )}
    >
      <p className="text-muted-foreground text-xs font-medium">{titulo}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{formatMoeda(valor)}</p>
      {detalhe && <p className="text-muted-foreground text-xs">{detalhe}</p>}
    </Link>
  );
}
