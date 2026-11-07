-- Fase 2 — Configurações e serviços
-- Serviços, horário de funcionamento, regras gerais, taxas da maquininha e e-mail no perfil.
-- Pode ser rodada mais de uma vez sem duplicar nada.

-- ---------------------------------------------------------------------------
-- Perfis: guardar o e-mail para a tela de usuárias
-- ---------------------------------------------------------------------------
alter table public.perfis add column if not exists email text;

update public.perfis p set email = u.email
  from auth.users u where u.id = p.id and p.email is distinct from u.email;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, papel, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'papel')::public.papel_usuaria, 'profissional'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Mantém o e-mail do perfil igual ao do login quando ele mudar
create or replace function public.sync_email_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.perfis set email = new.email where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_email_perfil();

-- ---------------------------------------------------------------------------
-- Serviços
-- ---------------------------------------------------------------------------
create table if not exists public.servicos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (length(trim(nome)) > 0),
  categoria     text not null default 'Outros',
  duracao_min   integer not null check (duracao_min between 5 and 600),
  preco         numeric(10, 2) not null default 0 check (preco >= 0),
  retorno_dias  integer check (retorno_dias is null or retorno_dias between 1 and 730),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on column public.servicos.retorno_dias is 'Intervalo de retorno recomendado (dias). Nulo = sem retorno sugerido.';

drop trigger if exists servicos_atualizado_em on public.servicos;
create trigger servicos_atualizado_em
  before update on public.servicos
  for each row execute function public.set_atualizado_em();

-- ---------------------------------------------------------------------------
-- Configurações gerais (linha única)
-- ---------------------------------------------------------------------------
create table if not exists public.configuracoes (
  id                  smallint primary key default 1 check (id = 1),
  intervalo_min       integer not null default 10 check (intervalo_min between 0 and 120),
  dias_cliente_inativa integer not null default 60 check (dias_cliente_inativa between 7 and 730),
  atualizado_em       timestamptz not null default now()
);

insert into public.configuracoes (id) values (1) on conflict (id) do nothing;

drop trigger if exists configuracoes_atualizado_em on public.configuracoes;
create trigger configuracoes_atualizado_em
  before update on public.configuracoes
  for each row execute function public.set_atualizado_em();

-- ---------------------------------------------------------------------------
-- Horário de funcionamento (0 = domingo ... 6 = sábado)
-- ---------------------------------------------------------------------------
create table if not exists public.horarios_funcionamento (
  dia_semana    smallint primary key check (dia_semana between 0 and 6),
  aberto        boolean not null default false,
  abre          time not null default '09:00',
  fecha         time not null default '18:00',
  pausa_inicio  time,
  pausa_fim     time,
  atualizado_em timestamptz not null default now(),
  check (fecha > abre),
  check ((pausa_inicio is null) = (pausa_fim is null)),
  check (pausa_inicio is null or (pausa_inicio >= abre and pausa_fim <= fecha and pausa_fim > pausa_inicio))
);

insert into public.horarios_funcionamento (dia_semana, aberto) values
  (0, false), (1, true), (2, true), (3, true), (4, true), (5, true), (6, true)
on conflict (dia_semana) do nothing;

drop trigger if exists horarios_atualizado_em on public.horarios_funcionamento;
create trigger horarios_atualizado_em
  before update on public.horarios_funcionamento
  for each row execute function public.set_atualizado_em();

-- ---------------------------------------------------------------------------
-- Taxas da maquininha por forma de pagamento (e por nº de parcelas no crédito parcelado)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.forma_pagamento as enum
    ('pix', 'dinheiro', 'debito', 'credito_vista', 'credito_parcelado');
exception when duplicate_object then null; end $$;

create table if not exists public.taxas_pagamento (
  forma           public.forma_pagamento not null,
  parcelas        smallint not null default 1 check (parcelas between 1 and 12),
  taxa_percentual numeric(5, 2) not null default 0 check (taxa_percentual between 0 and 100),
  ativo           boolean not null default true,
  atualizado_em   timestamptz not null default now(),
  primary key (forma, parcelas),
  check ((forma = 'credito_parcelado') = (parcelas >= 2))
);

insert into public.taxas_pagamento (forma, parcelas) values
  ('pix', 1), ('dinheiro', 1), ('debito', 1), ('credito_vista', 1)
on conflict do nothing;

insert into public.taxas_pagamento (forma, parcelas)
  select 'credito_parcelado', n from generate_series(2, 12) n
on conflict do nothing;

drop trigger if exists taxas_atualizado_em on public.taxas_pagamento;
create trigger taxas_atualizado_em
  before update on public.taxas_pagamento
  for each row execute function public.set_atualizado_em();

-- ---------------------------------------------------------------------------
-- RLS: usuárias ativas leem; só admin altera. Sem exclusão (desativar em vez de apagar).
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['servicos', 'configuracoes', 'horarios_funcionamento', 'taxas_pagamento'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "%s: usuárias ativas leem" on public.%I', t, t);
    execute format(
      'create policy "%s: usuárias ativas leem" on public.%I for select to authenticated using (public.is_usuaria_ativa())',
      t, t);

    execute format('drop policy if exists "%s: admin altera" on public.%I', t, t);
    execute format(
      'create policy "%s: admin altera" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())',
      t, t);

    execute format('revoke all on public.%I from anon', t);
    execute format('revoke delete on public.%I from authenticated', t);
  end loop;
end $$;

-- Apenas serviços aceitam novos registros pela tela (as demais tabelas já vêm preenchidas)
drop policy if exists "servicos: admin cadastra" on public.servicos;
create policy "servicos: admin cadastra"
  on public.servicos for insert to authenticated
  with check (public.is_admin());

revoke insert on public.configuracoes, public.horarios_funcionamento, public.taxas_pagamento
  from authenticated;

-- ---------------------------------------------------------------------------
-- Perfis: nunca deixar o sistema sem nenhuma admin ativa
-- ---------------------------------------------------------------------------
create or replace function public.garantir_admin_ativa()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.papel = 'admin' and old.ativo and (new.papel <> 'admin' or not new.ativo) then
    if not exists (
      select 1 from public.perfis where id <> old.id and papel = 'admin' and ativo
    ) then
      raise exception 'É preciso manter pelo menos uma administradora ativa.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists perfis_garantir_admin on public.perfis;
create trigger perfis_garantir_admin
  before update on public.perfis
  for each row execute function public.garantir_admin_ativa();
