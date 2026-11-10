"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Check, Loader2, Plus, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoData } from "@/components/ui/campo-data";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dataBR } from "@/lib/financeiro";
import {
  DIAS_SEMANA,
  ETIQUETAS,
  MODELOS,
  RECORRENCIAS,
  situacao,
  type Etiqueta,
  type Recorrencia,
  type Tarefa,
} from "@/lib/tarefas";
import type { AcaoState } from "@/lib/acoes";
import { cn } from "@/lib/utils";
import { arquivarTarefa, marcarTarefa, salvarTarefa } from "./actions";

type Pessoa = { id: string; nome: string };
type Visao = "minhas" | "pedi" | "todas";

export function ChecklistTela({
  tarefas,
  pessoas,
  meuId,
  admin,
  hoje,
}: {
  tarefas: Tarefa[];
  pessoas: Pessoa[];
  meuId: string;
  admin: boolean;
  hoje: string;
}) {
  const [visao, setVisao] = useState<Visao>("minhas");
  const [etiqueta, setEtiqueta] = useState<Etiqueta | null>(null);
  const [editando, setEditando] = useState<Tarefa | "nova" | null>(null);

  const filtradas = tarefas.filter(
    (t) =>
      (visao === "todas" ||
        (visao === "minhas" ? t.responsavel_id === meuId : t.criado_por === meuId && t.responsavel_id !== meuId)) &&
      (!etiqueta || t.etiqueta === etiqueta)
  );
  const grupos = useMemo(() => {
    const comS = filtradas.map((t) => ({ t, s: situacao(t, hoje) }));
    return {
      atrasadas: comS.filter((x) => x.s.doDia && x.s.atrasada),
      hoje: comS.filter((x) => x.s.doDia && !x.s.feita && !x.s.atrasada),
      feitas: comS.filter((x) => x.s.doDia && x.s.feita),
      proximas: comS.filter((x) => !x.s.doDia && !x.s.feita),
    };
  }, [filtradas, hoje]);

  const contagem = (v: Visao) =>
    tarefas.filter(
      (t) =>
        (v === "todas" || (v === "minhas" ? t.responsavel_id === meuId : t.criado_por === meuId && t.responsavel_id !== meuId)) &&
        situacao(t, hoje).doDia &&
        !situacao(t, hoje).feita
    ).length;

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="bg-secondary/60 grid w-full grid-cols-3 gap-1 rounded-xl p-1 sm:w-auto sm:min-w-96">
          {(
            [
              ["minhas", "Minhas"],
              ["pedi", "Que pedi"],
              ["todas", "Todas"],
            ] as const
          ).map(([v, r]) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisao(v)}
              className={cn(
                "flex h-10 items-center justify-center gap-1 rounded-lg px-1 text-xs font-medium sm:text-sm",
                visao === v ? "bg-card shadow-sm" : "text-muted-foreground"
              )}
            >
              {r}
              {contagem(v) > 0 && <span className="text-gold-dark tabular-nums">({contagem(v)})</span>}
            </button>
          ))}
        </div>
        <Button size="lg" className="w-full sm:w-auto" onClick={() => setEditando("nova")}>
          <Plus /> Nova tarefa
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Chip ativo={!etiqueta} onClick={() => setEtiqueta(null)}>
          Todas as etiquetas
        </Chip>
        {(Object.keys(ETIQUETAS) as Etiqueta[]).map((e) => (
          <Chip key={e} ativo={etiqueta === e} onClick={() => setEtiqueta(etiqueta === e ? null : e)} classe={ETIQUETAS[e].classe}>
            {ETIQUETAS[e].rotulo}
          </Chip>
        ))}
      </div>

      <Secao titulo="Atrasadas" itens={grupos.atrasadas} hoje={hoje} meuId={meuId} abrir={setEditando} alerta />
      <Secao titulo="Para hoje" itens={grupos.hoje} hoje={hoje} meuId={meuId} abrir={setEditando} vazio="Nada pendente aqui. 🎉" />
      <Secao titulo="Feitas hoje" itens={grupos.feitas} hoje={hoje} meuId={meuId} abrir={setEditando} />
      <Secao titulo="Próximas" itens={grupos.proximas} hoje={hoje} meuId={meuId} abrir={setEditando} />

      <TarefaDialog
        tarefa={editando === "nova" ? null : editando}
        aberto={editando !== null}
        onFechar={() => setEditando(null)}
        pessoas={pessoas}
        meuId={meuId}
        podeEditar={
          editando === "nova" ||
          (!!editando && (admin || editando.criado_por === meuId || editando.responsavel_id === meuId))
        }
        hoje={hoje}
      />
    </>
  );
}

function Chip({
  ativo,
  onClick,
  classe,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  classe?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-9 rounded-full border px-3 text-xs font-medium transition-colors",
        ativo ? (classe ?? "bg-primary text-primary-foreground border-primary") + " ring-gold/50 ring-2" : "bg-card text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Secao({
  titulo,
  itens,
  hoje,
  meuId,
  abrir,
  alerta,
  vazio,
}: {
  titulo: string;
  itens: { t: Tarefa; s: ReturnType<typeof situacao> }[];
  hoje: string;
  meuId: string;
  abrir: (t: Tarefa) => void;
  alerta?: boolean;
  vazio?: string;
}) {
  if (itens.length === 0 && !vazio) return null;
  return (
    <section className="mt-6">
      <h2 className={cn("mb-2 text-sm font-semibold tracking-wide uppercase", alerta ? "text-rose-700" : "text-muted-foreground")}>
        {titulo} {itens.length > 0 && `(${itens.length})`}
      </h2>
      {itens.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border px-4 py-3 text-sm">{vazio}</p>
      ) : (
        <ul className="space-y-2">
          {itens.map(({ t, s }) => (
            <li key={t.id}>
              <TarefaLinha tarefa={t} sit={s} hoje={hoje} meuId={meuId} abrir={() => abrir(t)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Uma tarefa com o botão de marcar como feita (também usada no Início). */
export function TarefaLinha({
  tarefa: t,
  sit,
  hoje,
  meuId,
  abrir,
}: {
  tarefa: Tarefa;
  sit: ReturnType<typeof situacao>;
  hoje: string;
  meuId: string;
  abrir?: () => void;
}) {
  const [feita, setFeita] = useState(sit.feita);
  const [pendente, iniciar] = useTransition();
  useEffect(() => setFeita(sit.feita), [sit.feita]);

  function alternar() {
    const nova = !feita;
    setFeita(nova);
    iniciar(async () => {
      const r = await marcarTarefa(t.id, sit.dataConclusao, nova);
      if (!r.ok) {
        setFeita(!nova);
        toast.error(r.erro);
      } else if (nova) toast.success("Feito ✔");
    });
  }

  const quem =
    t.responsavel_id === meuId
      ? t.criado_por === meuId
        ? "para mim"
        : `pedido por ${t.criado_por_nome.split(" ")[0]}`
      : `para ${t.responsavel_nome.split(" ")[0]}`;
  const prazo =
    t.recorrencia === "unica" && t.prazo
      ? t.prazo === hoje
        ? "hoje"
        : t.prazo < hoje
          ? `venceu ${dataBR(t.prazo)}`
          : `até ${dataBR(t.prazo)}`
      : sit.quando;

  return (
    <div
      className={cn(
        "bg-card flex items-center gap-3 rounded-xl border px-3 py-2.5",
        sit.atrasada && !feita && "border-rose-300",
        feita && "opacity-70"
      )}
    >
      <button
        type="button"
        onClick={alternar}
        disabled={pendente}
        aria-label={feita ? "Desmarcar" : "Marcar como feita"}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          feita ? "border-emerald-600 bg-emerald-600 text-white" : "border-gold hover:bg-accent"
        )}
      >
        {pendente ? <Loader2 className="size-4 animate-spin" /> : feita && <Check className="size-5" />}
      </button>
      <button type="button" onClick={abrir} className="min-w-0 flex-1 text-left" disabled={!abrir}>
        <span className={cn("block text-sm font-medium", feita && "line-through")}>{t.titulo}</span>
        <span className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", ETIQUETAS[t.etiqueta].classe)}>
            {ETIQUETAS[t.etiqueta].curto}
          </span>
          <span>{quem}</span>
          <span className={cn("inline-flex items-center gap-1", sit.atrasada && !feita && "font-medium text-rose-700")}>
            {t.recorrencia !== "unica" && <Repeat className="size-3" />}
            {prazo}
          </span>
        </span>
      </button>
    </div>
  );
}

function TarefaDialog({
  tarefa,
  aberto,
  onFechar,
  pessoas,
  meuId,
  podeEditar,
  hoje,
}: {
  tarefa: Tarefa | null;
  aberto: boolean;
  onFechar: () => void;
  pessoas: Pessoa[];
  meuId: string;
  podeEditar: boolean;
  hoje: string;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tarefa ? "Tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>
            {tarefa ? `Pedida por ${tarefa.criado_por_nome}.` : "Escolha quem vai fazer: você ou outra pessoa da equipe."}
          </DialogDescription>
        </DialogHeader>
        <TarefaForm
          key={tarefa?.id ?? "nova"}
          tarefa={tarefa}
          pessoas={pessoas}
          meuId={meuId}
          podeEditar={podeEditar}
          hoje={hoje}
          onFechar={onFechar}
        />
      </DialogContent>
    </Dialog>
  );
}

function TarefaForm({
  tarefa,
  pessoas,
  meuId,
  podeEditar,
  hoje,
  onFechar,
}: {
  tarefa: Tarefa | null;
  pessoas: Pessoa[];
  meuId: string;
  podeEditar: boolean;
  hoje: string;
  onFechar: () => void;
}) {
  const [state, action, pending] = useActionState<AcaoState, FormData>(salvarTarefa, {});
  const [arquivando, iniciarArquivo] = useTransition();
  // Por padrão, a tarefa nova vai para a outra pessoa (Ana pede para Lilian e vice-versa)
  const outra = pessoas.find((p) => p.id !== meuId)?.id ?? meuId;
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "");
  const [responsavel, setResponsavel] = useState(tarefa?.responsavel_id ?? outra);
  const [etiqueta, setEtiqueta] = useState<Etiqueta>(tarefa?.etiqueta ?? "clientes_ativos");
  const [recorrencia, setRecorrencia] = useState<Recorrencia>(tarefa?.recorrencia ?? "unica");

  useEffect(() => {
    if (state.ok) {
      toast.success(tarefa ? "Tarefa atualizada" : "Tarefa criada");
      onFechar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.em]);

  function arquivar() {
    if (!tarefa) return;
    iniciarArquivo(async () => {
      const r = await arquivarTarefa(tarefa.id);
      if (r.ok) {
        toast.success("Tarefa tirada da lista");
        onFechar();
      } else toast.error(r.erro);
    });
  }

  const modelos = MODELOS.filter((m) => m.etiqueta === etiqueta);

  return (
    <form action={action} className="space-y-4">
      {tarefa && <input type="hidden" name="id" value={tarefa.id} />}
      <input type="hidden" name="etiqueta" value={etiqueta} />
      <input type="hidden" name="recorrencia" value={recorrencia} />
      <fieldset disabled={!podeEditar} className="min-w-0 space-y-4">
        <div className="space-y-2">
          <Label>Etiqueta</Label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ETIQUETAS) as Etiqueta[]).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEtiqueta(e)}
                className={cn(
                  "min-h-11 rounded-lg border px-2 text-xs font-medium sm:text-sm",
                  etiqueta === e ? `${ETIQUETAS[e].classe} ring-gold/50 ring-2` : "bg-card text-muted-foreground"
                )}
              >
                {ETIQUETAS[e].rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="titulo">O que fazer</Label>
          <Input
            id="titulo"
            name="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Confirmar os atendimentos de amanhã"
            maxLength={140}
            autoComplete="off"
            required
          />
          {!tarefa && (
            <div className="flex flex-wrap gap-1.5">
              {modelos.map((m) => (
                <button
                  key={m.titulo}
                  type="button"
                  onClick={() => {
                    setTitulo(m.titulo);
                    setRecorrencia(m.recorrencia);
                  }}
                  className="bg-secondary/60 hover:bg-secondary rounded-full px-2.5 py-1 text-left text-xs"
                >
                  {m.titulo}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="responsavel_id">Quem faz</Label>
          <NativeSelect id="responsavel_id" name="responsavel_id" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
                {p.id === meuId ? " (eu)" : ""}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label>Repetir</Label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(RECORRENCIAS) as Recorrencia[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRecorrencia(r)}
                className={cn(
                  "h-11 rounded-lg border text-sm font-medium",
                  recorrencia === r ? "border-primary bg-primary text-primary-foreground" : "bg-card"
                )}
              >
                {RECORRENCIAS[r]}
              </button>
            ))}
          </div>
          {recorrencia === "unica" && (
            <div className="flex items-center gap-3">
              <Label htmlFor="prazo" className="shrink-0 font-normal">
                Até
              </Label>
              <div className="flex-1"><CampoData id="prazo" name="prazo" defaultValue={tarefa?.prazo ?? hoje} /></div>
            </div>
          )}
          {recorrencia === "semanal" && (
            <NativeSelect name="dia_semana" aria-label="Dia da semana" defaultValue={String(tarefa?.dia_semana ?? 1)}>
              {DIAS_SEMANA.map((d, i) => (
                <option key={d} value={i}>
                  Toda {d}
                </option>
              ))}
            </NativeSelect>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="detalhes">Detalhes (opcional)</Label>
          <textarea
            id="detalhes"
            name="detalhes"
            defaultValue={tarefa?.detalhes ?? ""}
            rows={2}
            className="border-input bg-card w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Ex.: nomes das clientes, o que falar"
          />
        </div>
      </fieldset>

      {state.erro && (
        <p role="alert" className="text-destructive text-sm">
          {state.erro}
        </p>
      )}
      {!podeEditar && <p className="text-muted-foreground text-sm">Só quem pediu, quem faz ou a administração altera.</p>}

      {podeEditar && (
        <DialogFooter>
          {tarefa && (
            <Button type="button" variant="ghost" className="text-destructive" disabled={arquivando} onClick={arquivar}>
              Tirar da lista
            </Button>
          )}
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {tarefa ? "Salvar" : "Criar tarefa"}
          </Button>
        </DialogFooter>
      )}
    </form>
  );
}
