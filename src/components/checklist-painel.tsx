import { ETIQUETAS, type ResumoChecklist } from "@/lib/tarefas";
import { cn } from "@/lib/utils";

/** Mini painel do checklist: bater o olho e saber como está o dia. */
export function ChecklistPainel({ resumo, compacto }: { resumo: ResumoChecklist; compacto?: boolean }) {
  const pct = resumo.total ? Math.round((resumo.feitas / resumo.total) * 100) : 0;
  return (
    <section className="bg-card rounded-xl border p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">Hoje</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {resumo.feitas}
            <span className="text-muted-foreground text-lg font-medium"> de {resumo.total} feitas</span>
          </p>
        </div>
        <p className={cn("text-2xl font-semibold tabular-nums", pct === 100 ? "text-emerald-700" : "text-gold-dark")}>
          {resumo.total ? `${pct}%` : "—"}
        </p>
      </div>
      <Barra feitas={resumo.feitas} total={resumo.total} grossa />

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Numero rotulo="Pendentes" valor={resumo.pendentes} />
        <Numero rotulo="Atrasadas" valor={resumo.atrasadas} alerta={resumo.atrasadas > 0} />
        <Numero rotulo="Feitas" valor={resumo.feitas} ok={resumo.feitas > 0} />
      </div>

      {!compacto && resumo.porPessoa.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">Por pessoa</p>
          {resumo.porPessoa.map((p) => (
            <div key={p.id} className="grid grid-cols-[6rem_1fr_auto] items-center gap-3 text-sm">
              <span className="truncate font-medium">{p.nome.split(" ")[0]}</span>
              <Barra feitas={p.feitas} total={p.total} />
              <span className="text-muted-foreground w-10 text-right tabular-nums">
                {p.feitas}/{p.total}
              </span>
            </div>
          ))}
        </div>
      )}

      {!compacto && resumo.porEtiqueta.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {resumo.porEtiqueta.map((e) => (
            <span key={e.etiqueta} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", ETIQUETAS[e.etiqueta].classe)}>
              {ETIQUETAS[e.etiqueta].rotulo} · {e.feitas}/{e.total}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function Barra({ feitas, total, grossa }: { feitas: number; total: number; grossa?: boolean }) {
  const pct = total ? Math.min(100, (feitas / total) * 100) : 0;
  return (
    <div
      className={cn("bg-secondary w-full overflow-hidden rounded-full", grossa ? "mt-3 h-3" : "h-2")}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={feitas}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#d9c48f] via-[#ad8f47] to-[#7f6630] transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Numero({ rotulo, valor, alerta, ok }: { rotulo: string; valor: number; alerta?: boolean; ok?: boolean }) {
  return (
    <div className={cn("rounded-lg border px-2 py-2", alerta && "border-rose-300 bg-rose-50", ok && "border-emerald-200 bg-emerald-50/60")}>
      <p className={cn("text-xl font-semibold tabular-nums", alerta && "text-rose-700", ok && "text-emerald-700")}>{valor}</p>
      <p className="text-muted-foreground text-[11px] font-medium">{rotulo}</p>
    </div>
  );
}
