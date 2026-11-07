import type { Metadata } from "next";
import { getPerfil, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatData } from "@/lib/format";
import { type Produto } from "@/lib/produtos";
import { lerStatusInventario } from "@/lib/produtos-server";
import { PageHeader } from "@/components/page-header";
import { ErroMigracao } from "@/components/erro-migracao";
import { AlertaInventario } from "@/components/alerta-inventario";
import { ProdutosTela } from "./produtos-tela";

export const metadata: Metadata = { title: "Produtos" };

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ inventario?: string }>;
}) {
  const { inventario } = await searchParams;
  const perfil = await getPerfil();
  const supabase = await createClient();
  const [{ data, error }, status] = await Promise.all([
    supabase
      .from("produtos")
      .select("id, nome, categoria, preco, estoque, ativo, controla_estoque, duracao_dias")
      .order("categoria")
      .order("preco"),
    lerStatusInventario(),
  ]);

  if (error) {
    return (
      <>
        <PageHeader titulo="Produtos" />
        <ErroMigracao arquivo="0004_produtos_estoque.sql" />
      </>
    );
  }

  const produtos: Produto[] = (data ?? []).map((p) => ({
    ...p,
    preco: Number(p.preco),
    controla_estoque: p.controla_estoque !== false,
    duracao_dias: p.duracao_dias == null ? null : Number(p.duracao_dias),
  }));

  return (
    <>
      <PageHeader titulo="Produtos" descricao="Estoque e inventário quinzenal." />
      <div className="mb-6 space-y-2">
        <AlertaInventario status={status} sempre />
        {status?.ultimoEm && (
          <p className="text-muted-foreground px-1 text-xs">
            Último inventário em {formatData(status.ultimoEm)}
            {status.ultimoPor ? ` por ${status.ultimoPor}` : ""}.
          </p>
        )}
      </div>
      <ProdutosTela produtos={produtos} admin={isAdmin(perfil)} iniciarInventario={inventario === "1"} />
    </>
  );
}
