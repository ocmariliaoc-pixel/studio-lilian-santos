import "server-only";
import { createClient } from "@/lib/supabase/server";
import { calcularStatusInventario, type StatusInventario } from "@/lib/produtos";

/** Lê o último inventário e a frequência configurada. Retorna null se as tabelas não existirem. */
export async function lerStatusInventario(): Promise<StatusInventario | null> {
  const supabase = await createClient();
  const [ultimo, config] = await Promise.all([
    supabase
      .from("inventarios")
      .select("feito_em, autora:perfis!inventarios_feito_por_fkey(nome)")
      .order("feito_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("configuracoes").select("inventario_intervalo_dias").eq("id", 1).maybeSingle(),
  ]);
  if (ultimo.error || config.error) return null;
  const intervalo = config.data?.inventario_intervalo_dias ?? 15;
  const autora = ultimo.data?.autora as unknown as { nome: string } | null;
  return {
    ...calcularStatusInventario(ultimo.data?.feito_em ?? null, intervalo),
    ultimoPor: autora?.nome ?? null,
  };
}
