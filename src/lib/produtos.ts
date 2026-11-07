export type Produto = {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
  ativo: boolean;
};

export const CATEGORIAS_PRODUTO = ["Brincos", "Acessórios", "Cuidados com a pele", "Outros"];

export type StatusInventario = {
  ultimoEm: string | null;
  ultimoPor: string | null;
  intervalo: number;
  /** Dias até o próximo inventário (negativo = atrasado). */
  diasRestantes: number;
  pendente: boolean;
};

const DIA = 24 * 60 * 60 * 1000;

export function calcularStatusInventario(
  ultimoEm: string | null,
  intervalo: number,
  agora = new Date()
): Omit<StatusInventario, "ultimoPor"> {
  if (!ultimoEm) return { ultimoEm, intervalo, diasRestantes: 0, pendente: true };
  const dias = Math.floor((agora.getTime() - new Date(ultimoEm).getTime()) / DIA);
  const diasRestantes = intervalo - dias;
  return { ultimoEm, intervalo, diasRestantes, pendente: diasRestantes <= 0 };
}

/** "vence em 3 dias", "vence hoje", "atrasado há 2 dias" */
export function textoPrazoInventario(s: Pick<StatusInventario, "diasRestantes" | "ultimoEm">) {
  if (!s.ultimoEm) return "nenhum inventário registrado";
  if (s.diasRestantes > 1) return `próximo em ${s.diasRestantes} dias`;
  if (s.diasRestantes === 1) return "próximo amanhã";
  if (s.diasRestantes === 0) return "vence hoje";
  const atraso = -s.diasRestantes;
  return `atrasado há ${atraso} ${atraso === 1 ? "dia" : "dias"}`;
}
