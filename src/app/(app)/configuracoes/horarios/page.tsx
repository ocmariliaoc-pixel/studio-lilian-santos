import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Configuracoes, HorarioDia } from "@/lib/configuracoes";
import { ErroMigracao } from "@/components/erro-migracao";
import { HorariosForm } from "./horarios-form";

export const metadata: Metadata = { title: "Horários" };

export default async function HorariosPage() {
  const supabase = await createClient();
  const [horarios, config] = await Promise.all([
    supabase
      .from("horarios_funcionamento")
      .select("dia_semana, aberto, abre, fecha, pausa_inicio, pausa_fim")
      .order("dia_semana"),
    supabase.from("configuracoes").select("intervalo_min, dias_cliente_inativa").eq("id", 1).single(),
  ]);

  if (horarios.error || config.error || !config.data || horarios.data?.length !== 7)
    return <ErroMigracao />;

  return (
    <HorariosForm
      horarios={horarios.data as HorarioDia[]}
      config={config.data as Configuracoes}
    />
  );
}
