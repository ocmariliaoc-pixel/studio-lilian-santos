import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Acha a cliente pelo nome (sem diferenciar maiúsculas) ou cadastra uma nova.
 * Retorna null se a tabela ainda não existir (migração não rodada).
 */
export async function acharOuCriarCliente(supabase: SupabaseClient, nome: string) {
  const limpo = nome.trim();
  if (!limpo) return null;
  const busca = limpo.replace(/[\\%_]/g, (c) => `\\${c}`);
  const achada = await supabase.from("clientes").select("id").ilike("nome", busca).limit(1).maybeSingle();
  if (achada.data) return achada.data.id as string;
  if (achada.error) return null;
  const nova = await supabase.from("clientes").insert({ nome: limpo, status: "lead" }).select("id").single();
  return (nova.data?.id as string | undefined) ?? null;
}
