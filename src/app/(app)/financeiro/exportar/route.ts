import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORMAS_PAGAMENTO } from "@/lib/configuracoes";
import {
  calcularPeriodo,
  hojeISO,
  isDataISO,
  lancamentoDaLinha,
  nomeForma,
  resumir,
  type TipoPeriodo,
} from "@/lib/financeiro";

const MOEDA = '"R$" #,##0.00;[Red]-"R$" #,##0.00';

/** Planilha .xlsx do período (Lançamentos + Resumo). Exige login (middleware + getPerfil). */
export async function GET(request: NextRequest) {
  await getPerfil();
  const sp = request.nextUrl.searchParams;
  const p = sp.get("p");
  const tipo: TipoPeriodo = p === "dia" || p === "semana" || p === "ano" || p === "total" ? p : "mes";
  const f = sp.get("f");
  const filtro = f === "entradas" ? "entrada" : f === "saidas" ? "saida" : null;
  const d = sp.get("d");
  const periodo = calcularPeriodo(tipo, isDataISO(d) ? d : hojeISO());

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lancamentos")
    .select("*, autora:perfis!lancamentos_criado_por_fkey(nome)")
    .gte("data", periodo.de)
    .lte("data", periodo.ate)
    .order("data")
    .order("criado_em");

  if (error) return NextResponse.json({ erro: "Não foi possível exportar." }, { status: 500 });

  const lancamentos = (data ?? []).map(lancamentoDaLinha).filter((l) => !filtro || l.tipo === filtro);
  const resumo = resumir(lancamentos);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Studio Lilian Santos";

  // --- Lançamentos
  const ws = wb.addWorksheet("Lançamentos", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Data", key: "data", width: 12 },
    { header: "Tipo", key: "tipo", width: 9 },
    { header: "Descrição", key: "descricao", width: 34 },
    { header: "Cliente", key: "cliente", width: 20 },
    { header: "Categoria", key: "categoria", width: 14 },
    { header: "Forma de pagamento", key: "forma", width: 18 },
    { header: "Valor bruto", key: "valor", width: 14, style: { numFmt: MOEDA } },
    { header: "Taxa (%)", key: "taxa", width: 9, style: { numFmt: "0.00" } },
    { header: "Valor líquido", key: "liquido", width: 14, style: { numFmt: MOEDA } },
    { header: "Situação", key: "situacao", width: 11 },
    { header: "Lançado por", key: "autora", width: 16 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA86A5A" } };

  for (const l of lancamentos) {
    const [a, m, dd] = l.data.split("-").map(Number);
    const sinal = l.tipo === "saida" ? -1 : 1;
    ws.addRow({
      data: new Date(Date.UTC(a, m - 1, dd, 12)),
      tipo: l.tipo === "entrada" ? "Entrada" : "Saída",
      descricao: l.descricao,
      cliente: l.cliente_nome ?? "",
      categoria: l.tipo === "entrada" && l.valor === 0 ? "Brinde" : (l.categoria ?? ""),
      forma: l.tipo === "entrada" ? nomeForma(l.forma_pagamento, l.parcelas, FORMAS_PAGAMENTO) : "",
      valor: sinal * l.valor,
      taxa: l.taxa_percentual,
      liquido: sinal * l.valor_liquido,
      situacao: l.cancelado ? "Cancelado" : "OK",
      autora: l.autora ?? "",
    });
  }
  ws.getColumn("data").numFmt = "dd/mm/yyyy";
  ws.autoFilter = { from: "A1", to: "K1" };

  // --- Resumo
  const rs = wb.addWorksheet("Resumo");
  rs.columns = [
    { key: "a", width: 30 },
    { key: "b", width: 16, style: { numFmt: MOEDA } },
  ];
  rs.addRow({ a: `Período: ${periodo.titulo}` }).font = { bold: true, size: 13 };
  rs.addRow({ a: "(lançamentos cancelados não entram nos totais)" }).font = { italic: true, size: 9 };
  rs.addRow({});
  const linhas: [string, number][] = [
    ["Entradas (bruto)", resumo.entradasBruto],
    ["Taxas da maquininha", -resumo.taxas],
    ["Entradas (líquido)", resumo.entradasLiquido],
    ["Saídas", -resumo.saidas],
    ["Saldo", resumo.saldo],
  ];
  for (const [a, b] of linhas) rs.addRow({ a, b });
  rs.getRow(rs.rowCount).font = { bold: true };
  rs.addRow({ a: "Brindes (quantidade)", b: resumo.brindes }).getCell("b").numFmt = "0";
  rs.addRow({});
  rs.addRow({ a: "Por forma de pagamento", b: "Bruto" }).font = { bold: true };
  for (const f of resumo.porForma) rs.addRow({ a: FORMAS_PAGAMENTO[f.forma], b: f.bruto });

  const buffer = await wb.xlsx.writeBuffer();
  const nome = `${filtro === "entrada" ? "entradas" : filtro === "saida" ? "saidas" : "financeiro"}-${tipo === "total" ? "total" : `${tipo}-${periodo.de}`}.xlsx`;
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
