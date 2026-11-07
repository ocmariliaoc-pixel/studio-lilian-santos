-- Clientes (v0 da Fase 3). Rodar DEPOIS da 0005. Pode ser rodada de novo.
-- Já com os campos do briefing; as telas de cadastro/ficha/anamnese chegam na Fase 3.

do $$ begin
  create type public.status_cliente as enum ('lead', 'ativa', 'inativa');
exception when duplicate_object then null; end $$;

create table if not exists public.clientes (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null check (length(trim(nome)) > 0),
  whatsapp        text,
  email           text,
  data_nascimento date,
  origem          text,            -- Instagram, Indicação, Google, Passou na frente, Outro
  indicada_por    uuid references public.clientes (id),
  status          public.status_cliente not null default 'lead',
  observacoes     text,
  aceite_lgpd     boolean not null default false,
  aceite_lgpd_em  timestamptz,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create unique index if not exists clientes_nome_unico on public.clientes (lower(trim(nome)));

drop trigger if exists clientes_atualizado_em on public.clientes;
create trigger clientes_atualizado_em
  before update on public.clientes
  for each row execute function public.set_atualizado_em();

alter table public.clientes enable row level security;

drop policy if exists "clientes: usuárias ativas leem" on public.clientes;
create policy "clientes: usuárias ativas leem"
  on public.clientes for select to authenticated using (public.is_usuaria_ativa());

drop policy if exists "clientes: usuárias ativas cadastram" on public.clientes;
create policy "clientes: usuárias ativas cadastram"
  on public.clientes for insert to authenticated with check (public.is_usuaria_ativa());

drop policy if exists "clientes: usuárias ativas alteram" on public.clientes;
create policy "clientes: usuárias ativas alteram"
  on public.clientes for update to authenticated
  using (public.is_usuaria_ativa()) with check (public.is_usuaria_ativa());

-- Dados sensíveis (LGPD): nada para anônimos; sem exclusão.
revoke all on public.clientes from anon;
revoke delete on public.clientes from authenticated;

-- Lançamento do caixa ligado à cliente
alter table public.lancamentos
  add column if not exists cliente_id uuid references public.clientes (id);
create index if not exists lancamentos_cliente_idx on public.lancamentos (cliente_id);

-- Liga lançamentos antigos (só com nome) às clientes de mesmo nome
update public.lancamentos l set cliente_id = c.id
  from public.clientes c
 where l.cliente_id is null and l.cliente_nome is not null
   and lower(trim(l.cliente_nome)) = lower(trim(c.nome));

-- Resumo por cliente: visitas, última visita, último pagamento, total gasto.
-- security_invoker: a view respeita o RLS de quem consulta.
create or replace view public.clientes_resumo
with (security_invoker = true) as
select
  c.id, c.nome, c.whatsapp, c.status, c.criado_em,
  u.data          as ultima_visita,
  u.servicos      as servicos_ultima_visita,
  p.data          as ultimo_pagamento_em,
  p.valor         as ultimo_pagamento_valor,
  p.forma_pagamento as ultimo_pagamento_forma,
  p.parcelas      as ultimo_pagamento_parcelas,
  coalesce(t.visitas, 0)     as visitas,
  coalesce(t.total_gasto, 0) as total_gasto
from public.clientes c
left join lateral (
  select l.data, string_agg(l.descricao, ' + ' order by l.criado_em) as servicos
    from public.lancamentos l
   where l.cliente_id = c.id and l.tipo = 'entrada' and not l.cancelado
     and l.data = (select max(l2.data) from public.lancamentos l2
                    where l2.cliente_id = c.id and l2.tipo = 'entrada' and not l2.cancelado)
   group by l.data
) u on true
left join lateral (
  select l.data, l.valor, l.forma_pagamento, l.parcelas
    from public.lancamentos l
   where l.cliente_id = c.id and l.tipo = 'entrada' and not l.cancelado and l.valor > 0
   order by l.data desc, l.criado_em desc
   limit 1
) p on true
left join lateral (
  select count(distinct l.data) as visitas, sum(l.valor) as total_gasto
    from public.lancamentos l
   where l.cliente_id = c.id and l.tipo = 'entrada' and not l.cancelado
) t on true;

grant select on public.clientes_resumo to authenticated;
revoke all on public.clientes_resumo from anon;
