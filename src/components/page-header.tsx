export function PageHeader({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{titulo}</h1>
        <div className="bg-gold mt-2 h-0.5 w-8 rounded-full" aria-hidden />
        {descricao && <p className="text-muted-foreground mt-2 text-sm">{descricao}</p>}
      </div>
      {children}
    </div>
  );
}
