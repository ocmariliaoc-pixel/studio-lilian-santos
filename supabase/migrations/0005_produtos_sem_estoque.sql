-- Produtos sem controle de estoque (cursos, e-book, voucher). Rodar DEPOIS da 0004.
alter table public.produtos
  add column if not exists controla_estoque boolean not null default true;

create or replace function public.lancamento_baixar_estoque()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  conta_antes boolean := tg_op = 'UPDATE' and old.produto_id is not null and not old.cancelado and old.tipo = 'entrada';
  conta_agora boolean := new.produto_id is not null and not new.cancelado and new.tipo = 'entrada';
begin
  if conta_antes then
    update public.produtos set estoque = estoque + old.quantidade
     where id = old.produto_id and controla_estoque;
  end if;
  if conta_agora then
    update public.produtos set estoque = estoque - new.quantidade
     where id = new.produto_id and controla_estoque;
  end if;
  return new;
end $$;

-- Cursos: duração em dias (0,5 = meio período). Na Fase 4, marcar uma turma bloqueia a agenda.
alter table public.produtos
  add column if not exists duracao_dias numeric(3, 1)
  check (duracao_dias is null or duracao_dias between 0.5 and 30);
