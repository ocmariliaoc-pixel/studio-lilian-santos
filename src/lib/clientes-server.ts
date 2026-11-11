import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizarTelefone } from "@/lib/clientes";
import { normalizarNome, parecenca } from "@/lib/nomes";

type ClienteBase = { id: string; nome: string; whatsapp: string | null };

export type ResultadoCliente =
  | { ok: true; id: string; nome: string; nova: boolean }
  | { ok: false; erro: string; parecidas: string[] };

/**
 * Liga a venda/agendamento a uma cliente pelo nome, sem duplicar cadastro:
 *  - mesmo nome (sem acento/maiúsculas) → usa a cliente que já existe (e o nome como está no cadastro);
 *  - WhatsApp de outra cliente → avisa;
 *  - nome parecido ("Jade" × "Jade Lima", "Gabriela" × "Gabrielle") → avisa e pede para escolher,
 *    a não ser que a usuária tenha marcado "É outra pessoa" (confirmarNova);
 *  - senão, cadastra como lead (com o WhatsApp, se veio).
 */
export async function resolverCliente(
  supabase: SupabaseClient,
  nome: string,
  opcoes: { confirmarNova?: boolean; whatsapp?: string | null } = {}
): Promise<ResultadoCliente> {
  const limpo = nome.trim().replace(/\s+/g, " ");
  if (!limpo) return { ok: false, erro: "Informe o nome da cliente.", parecidas: [] };

  const { data, error } = await supabase.from("clientes").select("id, nome, whatsapp");
  if (error) return { ok: false, erro: "Não foi possível ler as clientes. Confira se a migração 0006 foi rodada.", parecidas: [] };
  const todas = (data ?? []) as ClienteBase[];

  const igual = todas.find((c) => normalizarNome(c.nome) === normalizarNome(limpo));
  if (igual) return { ok: true, id: igual.id, nome: igual.nome, nova: false };

  const tel = opcoes.whatsapp ? normalizarTelefone(opcoes.whatsapp) : "";
  const donaDoTelefone = tel ? todas.find((c) => c.whatsapp && normalizarTelefone(c.whatsapp) === tel) : undefined;
  if (donaDoTelefone && !opcoes.confirmarNova)
    return {
      ok: false,
      erro: `Esse WhatsApp já está no cadastro de ${donaDoTelefone.nome}. Se for ela, escolha o nome dela na lista.`,
      parecidas: [donaDoTelefone.nome],
    };

  if (!opcoes.confirmarNova) {
    const parecidas = todas
      .map((c) => ({ c, p: parecenca(limpo, c.nome) }))
      .filter((x) => x.p > 0)
      .sort((a, b) => b.p - a.p)
      .slice(0, 4)
      .map((x) => x.c.nome);
    if (parecidas.length)
      return {
        ok: false,
        erro: `Já existe cadastro parecido: ${parecidas.join(", ")}. Se for a mesma pessoa, escolha o nome da lista; se não for, marque “É outra pessoa”.`,
        parecidas,
      };
  }

  const nova = await supabase
    .from("clientes")
    .insert({ nome: limpo, status: "lead", whatsapp: tel && !donaDoTelefone ? tel : null })
    .select("id, nome")
    .single();
  if (nova.error || !nova.data) {
    // Nome idêntico cadastrado ao mesmo tempo (índice único): usa o que já existe
    const de = await supabase.from("clientes").select("id, nome").ilike("nome", limpo.replace(/[\\%_]/g, (c) => `\\${c}`)).maybeSingle();
    if (de.data) return { ok: true, id: de.data.id, nome: de.data.nome, nova: false };
    return { ok: false, erro: "Não foi possível cadastrar a cliente.", parecidas: [] };
  }
  return { ok: true, id: nova.data.id, nome: nova.data.nome, nova: true };
}

/**
 * Para importações automáticas (ex.: nome do extrato do banco): usa a cliente com o mesmo nome
 * ou, se houver uma só bem parecida, ela; senão cadastra. Retorna null se a tabela não existir.
 */
export async function acharOuCriarCliente(supabase: SupabaseClient, nome: string) {
  const limpo = nome.trim();
  if (!limpo) return null;
  const { data, error } = await supabase.from("clientes").select("id, nome");
  if (error) return null;
  const todas = (data ?? []) as { id: string; nome: string }[];
  const igual = todas.find((c) => normalizarNome(c.nome) === normalizarNome(limpo));
  if (igual) return igual.id;
  const fortes = todas.filter((c) => parecenca(limpo, c.nome) >= 2);
  if (fortes.length === 1) return fortes[0].id;
  const nova = await supabase.from("clientes").insert({ nome: limpo, status: "lead" }).select("id").single();
  return (nova.data?.id as string | undefined) ?? null;
}
