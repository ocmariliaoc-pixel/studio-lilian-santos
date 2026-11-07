/** Mostrado quando a tabela ainda não existe no Supabase (migração não rodada). */
export function ErroMigracao({ arquivo = "0002_configuracoes_servicos.sql" }: { arquivo?: string }) {
  return (
    <p className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
      Não foi possível carregar os dados. Confira se a migração
      <code className="mx-1 font-semibold">{arquivo}</code>
      já foi rodada no SQL Editor do Supabase.
    </p>
  );
}
