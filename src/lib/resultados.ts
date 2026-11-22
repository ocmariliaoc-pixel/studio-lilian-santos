// Cálculos da tela Resultados (antiga Metas): atendimentos por mês/semana × esperado,
// rankings (serviços, produtos, cursos) e leads por origem. Funções puras (sem banco).
import { DIA_DE_CURSO, ehSinal, inicioSemana, somarDias } from "@/lib/agenda";
import { nomeMes } from "@/lib/financeiro";
import { diasAbertos, ultimoDiaDoMes } from "@/lib/metas";

export type Barra = {
  chave: string; // AAAA-MM (mês) ou AAAA-MM-DD (início da semana)
  rotulo: string;
  feito: number;
  esperado: number;
  de: string;
  ate: string;
};

/** Lançamento que conta como atendimento: serviço (mesmo com desconto) ou brinde/modelo R$ 0. */
export function contaComoAtendimento(l: { categoria: string | null; descricao: string }) {
  return (l.categoria === "Serviço" || l.categoria === "Brinde") && !ehSinal(l.descricao);
}

/** Meses entre duas datas (AAAA-MM-01). */
export function mesesEntre(de: string, ate: string) {
  const meses: string[] = [];
  let [a, m] = de.split("-").map(Number);
  const [af, mf] = ate.split("-").map(Number);
  while (a < af || (a === af && m <= mf)) {
    meses.push(`${a}-${String(m).padStart(2, "0")}-01`);
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
  }
  return meses;
}

const abrev = (m: number) => nomeMes(m).slice(0, 3);

/**
 * Atendimentos feitos por mês × esperado pela meta (atendimentos do mês na meta,
 * proporcional aos dias de atendimento que caem dentro do período).
 */
export function atendimentosPorMes(
  datas: string[],
  de: string,
  ate: string,
  esperadoMes: number,
  abertos: boolean[]
): Barra[] {
  return mesesEntre(de, ate).map((mes) => {
    const fimMes = ultimoDiaDoMes(mes);
    const ini = mes < de ? de : mes;
    const fim = fimMes > ate ? ate : fimMes;
    const total = diasAbertos(mes, fimMes, abertos);
    const dentro = diasAbertos(ini, fim, abertos);
    const [a, m] = mes.split("-").map(Number);
    return {
      chave: mes.slice(0, 7),
      rotulo: `${abrev(m)}/${String(a).slice(2)}`,
      feito: datas.filter((d) => d >= ini && d <= fim).length,
      esperado: total ? Math.round((esperadoMes * dentro) / total) : 0,
      de: ini,
      ate: fim,
    };
  });
}

/** Semanas (segunda a domingo) de um mês, cortadas no mês e no período. */
export function atendimentosPorSemana(
  datas: string[],
  mes: string,
  de: string,
  ate: string,
  esperadoMes: number,
  abertos: boolean[]
): Barra[] {
  const fimMes = ultimoDiaDoMes(mes);
  const total = diasAbertos(mes, fimMes, abertos);
  const barras: Barra[] = [];
  for (let seg = inicioSemana(mes); seg <= fimMes; seg = somarDias(seg, 7)) {
    const dom = somarDias(seg, 6);
    const ini = [seg, mes, de].sort().at(-1)!;
    const fim = [dom, fimMes, ate].sort()[0];
    if (ini > fim) continue;
    barras.push({
      chave: seg,
      rotulo: `${ini.slice(8, 10)}/${ini.slice(5, 7)}–${fim.slice(8, 10)}/${fim.slice(5, 7)}`,
      feito: datas.filter((d) => d >= ini && d <= fim).length,
      esperado: total ? Math.round(((esperadoMes * diasAbertos(ini, fim, abertos)) / total) * 10) / 10 : 0,
      de: ini,
      ate: fim,
    });
  }
  return barras;
}

export type ItemRanking = { nome: string; qtd: number; valor: number };

/** Agrupa e ordena do maior para o menor (empate: maior valor, depois nome). */
export function ranking(itens: { nome: string; qtd?: number; valor?: number }[], limite = 8): ItemRanking[] {
  const m = new Map<string, ItemRanking>();
  for (const i of itens) {
    const nome = i.nome.trim();
    if (!nome) continue;
    const atual = m.get(nome.toLowerCase()) ?? { nome, qtd: 0, valor: 0 };
    atual.qtd += i.qtd ?? 1;
    atual.valor += i.valor ?? 0;
    m.set(nome.toLowerCase(), atual);
  }
  return [...m.values()]
    .sort((a, b) => b.qtd - a.qtd || b.valor - a.valor || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, limite);
}

/** Itens de agendamento que são serviço (não curso, não dia seguinte de turma). */
export function ehItemServico(nome: string) {
  return !/^curso\b/i.test(nome) && !DIA_DE_CURSO.test(nome);
}

/** Nome do curso sem "— dia k de N" e sem "Sinal — ". */
export function nomeCurso(nome: string) {
  return nome.replace(/^sinal\s*—\s*/i, "").replace(DIA_DE_CURSO, "").trim();
}

export type OrigemLeads = { origem: string; ganhos: number; abertos: number; perdidos: number };

export function leadsPorOrigem(clientes: { origem: string | null; status: string }[]): OrigemLeads[] {
  const m = new Map<string, OrigemLeads>();
  for (const c of clientes) {
    const origem = c.origem?.trim() || "Não informado";
    const o = m.get(origem) ?? { origem, ganhos: 0, abertos: 0, perdidos: 0 };
    if (c.status === "ativa" || c.status === "inativa") o.ganhos++;
    else if (c.status === "perdido") o.perdidos++;
    else o.abertos++;
    m.set(origem, o);
  }
  return [...m.values()].sort(
    (a, b) =>
      b.ganhos + b.abertos + b.perdidos - (a.ganhos + a.abertos + a.perdidos) ||
      (a.origem === "Não informado" ? 1 : b.origem === "Não informado" ? -1 : a.origem.localeCompare(b.origem, "pt-BR"))
  );
}
