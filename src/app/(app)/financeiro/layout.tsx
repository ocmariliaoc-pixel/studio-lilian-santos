import { PageHeader } from "@/components/page-header";
import { AbasFinanceiro } from "./abas";

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader titulo="Financeiro" descricao="Caixa, contas a pagar e a receber." />
      <AbasFinanceiro />
      <div className="mt-5">{children}</div>
    </>
  );
}
