import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ConfigTabs } from "./tabs";

export default async function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <>
      <PageHeader titulo="Configurações" descricao="Serviços, horários, taxas e usuárias." />
      <ConfigTabs />
      <div className="mt-6">{children}</div>
    </>
  );
}
