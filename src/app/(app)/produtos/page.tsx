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
import { ServicosCatalogo } from "./servicos-catalogo";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Servico } from "@/lib/configuracoes";

export const metadata: Metadata = { title: "Produtos" };

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ inventario?: string; aba?: string }>;
}) {
  const { inventario, aba } = await searchParams;
  const verServicos = aba === "servicos";
  const perfil = await getPerfil();
  const supabase = await createClient();
  const [{ data, error }, status, servicos] = await Promise.all([
    supabase
      .from("produtos")
      .select(
        "id, nome, categoria, preco, estoque, ativo, controla_estoque, duracao_dias",
      )
      .order("categoria")
      .order("preco"),
    lerStatusInventario(),
    supabase
      .from("servicos")
      .select("id, nome, categoria, duracao_min, preco, retorno_dias, ativo")
      .eq("ativo", true)
      .order("categoria")
      .order("preco"),
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
      <PageHeader
        titulo="Produtos e serviços"
        descricao="O que o studio vende: produtos com estoque e serviços."
      />
      <nav className="bg-secondary/60 mb-6 grid grid-cols-2 gap-1 rounded-xl p-1 sm:inline-grid sm:w-80">
        {[
          { href: "/produtos", rotulo: "Produtos", ativo: !verServicos },
          {
            href: "/produtos?aba=servicos",
            rotulo: "Serviços",
            ativo: verServicos,
          },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex h-10 items-center justify-center rounded-lg text-sm font-medium",
              t.ativo ? "bg-card shadow-sm" : "text-muted-foreground",
            )}
          >
            {t.rotulo}
          </Link>
        ))}
      </nav>
      {verServicos ? (
        <ServicosCatalogo
          servicos={
            (servicos.data ?? []).map((x) => ({
              ...x,
              preco: Number(x.preco),
            })) as Servico[]
          }
          admin={isAdmin(perfil)}
        />
      ) : (
        <>
          <div className="mb-6 space-y-2">
            <AlertaInventario status={status} sempre />
            {status?.ultimoEm && (
              <p className="text-muted-foreground px-1 text-xs">
                Último inventário em {formatData(status.ultimoEm)}
                {status.ultimoPor ? ` por ${status.ultimoPor}` : ""}.
              </p>
            )}
          </div>
          <ProdutosTela
            produtos={produtos}
            admin={isAdmin(perfil)}
            iniciarInventario={inventario === "1"}
          />
        </>
      )}
    </>
  );
}
