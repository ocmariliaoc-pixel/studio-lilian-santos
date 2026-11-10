import { STATUS_CLIENTE, type ClienteResumo } from "@/lib/clientes";

/*
 * Funil de leads.
 * Forma: barra segmentada (um todo em 3 partes) + barras ordenadas dos motivos de perda.
 * Cores: 3 primeiros slots categóricos da paleta de referência (validados: CVD ΔE 9,2;
 * visão normal ΔE 24). O verde-água fica abaixo de 3:1 no fundo branco, então todas as
 * partes levam rótulo e número visíveis (regra de alívio).
 */
const COR = {
  lead: "#2a78d6", // azul — slot 1
  perdido: "#eb6834", // laranja — slot 2
  ganho: "#1baf7a", // verde-água — slot 3
};

export function FunilGrafico({ clientes }: { clientes: ClienteResumo[] }) {
  const leads = clientes.filter((c) => c.status === "lead").length;
  const ganhos = clientes.filter((c) => c.status === "ativa" || c.status === "inativa").length;
  const perdidos = clientes.filter((c) => c.status === "perdido").length;
  const total = leads + ganhos + perdidos;
  if (total === 0) return null;

  const decididos = ganhos + perdidos;
  const conversao = decididos ? Math.round((ganhos / decididos) * 100) : null;

  const partes = [
    { chave: "ganho", rotulo: STATUS_CLIENTE.ativa, n: ganhos, cor: COR.ganho },
    { chave: "lead", rotulo: "Em aberto", n: leads, cor: COR.lead },
    { chave: "perdido", rotulo: STATUS_CLIENTE.perdido, n: perdidos, cor: COR.perdido },
  ].filter((p) => p.n > 0);

  const motivos = new Map<string, number>();
  for (const c of clientes)
    if (c.status === "perdido") motivos.set(c.motivo_perda || "Sem motivo", (motivos.get(c.motivo_perda || "Sem motivo") ?? 0) + 1);
  const rankMotivos = [...motivos.entries()].sort((a, b) => b[1] - a[1]);
  const maxMotivo = Math.max(...rankMotivos.map(([, n]) => n), 1);

  return (
    <section className="bg-card space-y-4 rounded-xl border p-4" aria-labelledby="funil-titulo">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="funil-titulo" className="font-sans text-sm font-semibold">
            Funil de leads
          </h2>
          <p className="text-muted-foreground text-xs">{total} contatos no total</p>
        </div>
        {conversao !== null && (
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{conversao}%</p>
            <p className="text-muted-foreground text-xs">viraram clientes (ganhos ÷ decididos)</p>
          </div>
        )}
      </div>

      {/* Barra segmentada: 2px de respiro entre as partes, pontas arredondadas */}
      <div className="flex h-10 gap-0.5 overflow-hidden rounded-md" role="img" aria-label={partes.map((p) => `${p.rotulo}: ${p.n}`).join(", ")}>
        {partes.map((p) => {
          const pct = (p.n / total) * 100;
          return (
            <div
              key={p.chave}
              title={`${p.rotulo}: ${p.n} (${Math.round(pct)}%)`}
              className="flex min-w-6 items-center justify-center text-xs font-semibold text-white transition-opacity first:rounded-l-md last:rounded-r-md hover:opacity-85"
              style={{ width: `${pct}%`, background: p.cor }}
            >
              {pct >= 12 ? p.n : ""}
            </div>
          );
        })}
      </div>

      {/* Legenda = tabela: nome, número e % (cor nunca sozinha) */}
      <ul className="grid grid-cols-3 gap-2 text-xs">
        {partes.map((p) => (
          <li key={p.chave} className="flex items-start gap-1.5">
            <span className="mt-0.5 size-2.5 shrink-0 rounded-sm" style={{ background: p.cor }} aria-hidden />
            <span>
              <span className="text-foreground block font-medium">{p.rotulo}</span>
              <span className="text-muted-foreground tabular-nums">
                {p.n} · {Math.round((p.n / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>

      {rankMotivos.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">Por que perdemos</p>
          <ul className="space-y-1.5">
            {rankMotivos.map(([motivo, n]) => (
              <li key={motivo} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-xs" title={`${motivo}: ${n}`}>
                <span className="truncate">{motivo}</span>
                <span className="bg-secondary h-2 overflow-hidden rounded-full">
                  <span className="block h-full rounded-full" style={{ width: `${(n / maxMotivo) * 100}%`, background: COR.perdido }} />
                </span>
                <span className="text-muted-foreground w-5 text-right tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
