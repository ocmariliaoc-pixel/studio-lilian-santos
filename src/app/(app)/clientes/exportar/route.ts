import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatTelefone, STATUS_CLIENTE, type StatusCliente } from "@/lib/clientes";
import { FORMAS_PAGAMENTO, type FormaPagamento } from "@/lib/configuracoes";
import { dataLocal, hhmmDeMinutos, minutosLocal } from "@/lib/agenda";
import { hojeISO } from "@/lib/financeiro";

const MOEDA = '"R$" #,##0.00';

/** Data AAAA-MM-DD → data de verdade no Excel (meio-dia para não "voltar" um dia). */
function dia(iso: string | null) {
  if (!iso) return null;
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, 12));
}

/** Planilha .xlsx com todas as clientes. Exige login (middleware + getPerfil). Dados sensíveis (LGPD). */
export async function GET() {
  await getPerfil();
  const supabase = await createClient();
  const { data, error } = await supabase.from("clientes_resumo").select("*").order("nome");
  if (error) return NextResponse.json({ erro: "Não foi possível exportar." }, { status: 500 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Studio Lilian Santos";
  const ws = wb.addWorksheet("Clientes", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Nome", key: "nome", width: 30 },
    { header: "WhatsApp", key: "whatsapp", width: 17 },
    { header: "Instagram", key: "instagram", width: 18 },
    { header: "Nascimento", key: "nascimento", width: 12, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Status", key: "status", width: 15 },
    { header: "Motivo da perda", key: "motivo", width: 20 },
    { header: "Origem", key: "origem", width: 15 },
    { header: "Visitas", key: "visitas", width: 9, style: { numFmt: "0" } },
    { header: "Total gasto", key: "total", width: 13, style: { numFmt: MOEDA } },
    { header: "Ticket médio", key: "ticket", width: 13, style: { numFmt: MOEDA } },
    { header: "Última visita", key: "ultima", width: 13, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Serviços da última visita", key: "servicos", width: 34 },
    { header: "Último pagamento", key: "ult_pag", width: 13, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Valor do último pagamento", key: "ult_valor", width: 13, style: { numFmt: MOEDA } },
    { header: "Forma do último pagamento", key: "ult_forma", width: 18 },
    { header: "Próximo agendamento", key: "proximo", width: 18 },
    { header: "Cadastrada em", key: "cadastro", width: 13, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Observações", key: "obs", width: 30 },
  ];
  const cab = ws.getRow(1);
  cab.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cab.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7F6630" } };
  cab.alignment = { vertical: "middle", wrapText: true };
  cab.height = 30;

  for (const c of data ?? []) {
    const visitas = Number(c.visitas ?? 0);
    const total = Number(c.total_gasto ?? 0);
    ws.addRow({
      nome: c.nome,
      whatsapp: formatTelefone(c.whatsapp),
      instagram: c.instagram ? `@${c.instagram}` : "",
      nascimento: c.data_nascimento?.startsWith("1900-") ? `${c.data_nascimento.slice(8, 10)}/${c.data_nascimento.slice(5, 7)}` : dia(c.data_nascimento),
      status: STATUS_CLIENTE[c.status as StatusCliente] ?? c.status,
      motivo: c.motivo_perda ?? "",
      origem: c.origem ?? "",
      visitas,
      total,
      ticket: visitas ? Math.round((total / visitas) * 100) / 100 : null,
      ultima: dia(c.ultima_visita),
      servicos: c.servicos_ultima_visita ?? "",
      ult_pag: dia(c.ultimo_pagamento_em),
      ult_valor: c.ultimo_pagamento_valor == null ? null : Number(c.ultimo_pagamento_valor),
      ult_forma: c.ultimo_pagamento_forma ? (FORMAS_PAGAMENTO[c.ultimo_pagamento_forma as FormaPagamento] ?? "") : "",
      proximo: c.proximo_agendamento
        ? `${dataLocal(c.proximo_agendamento).split("-").reverse().join("/")} ${hhmmDeMinutos(minutosLocal(c.proximo_agendamento))}`
        : "",
      cadastro: dia(c.criado_em ? dataLocal(c.criado_em) : null),
      obs: c.observacoes ?? "",
    });
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="clientes-${hojeISO()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
