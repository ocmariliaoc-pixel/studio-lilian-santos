-- Produtos, estoque e inventário quinzenal. Rodar DEPOIS da 0003. Pode ser rodada de novo.

-- ---------------------------------------------------------------------------
-- Produtos
-- ---------------------------------------------------------------------------
create table if not exists public.produtos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (length(trim(nome)) > 0),
  categoria     text not null default 'Outros',
  preco         numeric(10, 2) not null default 0 check (preco >= 0),
  -- Pode ficar negativo se uma venda for lançada sem estoque registrado: o inventário corrige.
  estoque       integer not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

drop trigger if exists produtos_atualizado_em on public.produtos;
create trigger produtos_atualizado_em
  before update on public.produtos
  for each row execute function public.set_atualizado_em();

alter table public.produtos enable row level security;

drop policy if exists "produtos: usuárias ativas leem" on public.produtos;
create policy "produtos: usuárias ativas leem"
  on public.produtos for select to authenticated using (public.is_usuaria_ativa());

drop policy if exists "produtos: admin cadastra" on public.produtos;
create policy "produtos: admin cadastra"
  on public.produtos for insert to authenticated with check (public.is_admin());

drop policy if exists "produtos: admin altera" on public.produtos;
create policy "produtos: admin altera"
  on public.produtos for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.produtos from anon;
revoke delete on public.produtos from authenticated;

-- ---------------------------------------------------------------------------
-- Venda de produto no caixa: lançamento aponta para o produto e baixa o estoque
-- ---------------------------------------------------------------------------
alter table public.lancamentos
  add column if not exists produto_id uuid references public.produtos (id),
  add column if not exists quantidade integer not null default 1 check (quantidade between 1 and 999);

create or replace function public.lancamento_baixar_estoque()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  conta_antes boolean := tg_op = 'UPDATE' and old.produto_id is not null and not old.cancelado and old.tipo = 'entrada';
  conta_agora boolean := new.produto_id is not null and not new.cancelado and new.tipo = 'entrada';
begin
  if conta_antes then
    update public.produtos set estoque = estoque + old.quantidade where id = old.produto_id;
  end if;
  if conta_agora then
    update public.produtos set estoque = estoque - new.quantidade where id = new.produto_id;
  end if;
  return new;
end $$;

drop trigger if exists lancamentos_estoque on public.lancamentos;
create trigger lancamentos_estoque
  after insert or update on public.lancamentos
  for each row execute function public.lancamento_baixar_estoque();

-- ---------------------------------------------------------------------------
-- Inventário (contagem física) — qualquer usuária ativa pode registrar
-- ---------------------------------------------------------------------------
create table if not exists public.inventarios (
  id        uuid primary key default gen_random_uuid(),
  feito_em  timestamptz not null default now(),
  feito_por uuid references public.perfis (id) default auth.uid(),
  -- [{produto_id, nome, sistema, contado}]
  itens     jsonb not null default '[]'
);

alter table public.inventarios enable row level security;

drop policy if exists "inventarios: usuárias ativas leem" on public.inventarios;
create policy "inventarios: usuárias ativas leem"
  on public.inventarios for select to authenticated using (public.is_usuaria_ativa());

revoke all on public.inventarios from anon;
revoke insert, update, delete on public.inventarios from authenticated;

-- Registra a contagem e ajusta o estoque de cada produto contado.
-- contagens: [{"produto_id": "...", "contado": 3}, ...]
create or replace function public.registrar_inventario(contagens jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  novo_id uuid;
  itens jsonb;
begin
  if not public.is_usuaria_ativa() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'produto_id', p.id, 'nome', p.nome,
           'sistema', p.estoque, 'contado', (c ->> 'contado')::int)), '[]')
    into itens
    from jsonb_array_elements(contagens) c
    join public.produtos p on p.id = (c ->> 'produto_id')::uuid
   where (c ->> 'contado') ~ '^\d+$';

  update public.produtos p set estoque = (c ->> 'contado')::int
    from jsonb_array_elements(contagens) c
   where p.id = (c ->> 'produto_id')::uuid and (c ->> 'contado') ~ '^\d+$';

  insert into public.inventarios (feito_por, itens) values (auth.uid(), itens)
  returning id into novo_id;
  return novo_id;
end $$;

revoke all on function public.registrar_inventario(jsonb) from anon, public;
grant execute on function public.registrar_inventario(jsonb) to authenticated;

-- Frequência do alerta de inventário (dias)
alter table public.configuracoes
  add column if not exists inventario_intervalo_dias integer not null default 15
  check (inventario_intervalo_dias between 1 and 90);
