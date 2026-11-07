-- Fase 1 — Base: perfis das usuárias internas e funções de permissão.
-- As tabelas de negócio (servicos, clientes, agenda...) entram nas próximas fases.

create extension if not exists "pgcrypto";

-- Papéis do sistema
do $$ begin
  create type public.papel_usuaria as enum ('admin', 'profissional');
exception when duplicate_object then null; end $$;

-- Perfil de cada usuária (1:1 com auth.users)
create table if not exists public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null,
  papel       public.papel_usuaria not null default 'profissional',
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.perfis is 'Usuárias internas do studio (admin / profissional).';

-- Mantém atualizado_em em dia (reutilizável pelas próximas tabelas)
create or replace function public.set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists perfis_atualizado_em on public.perfis;
create trigger perfis_atualizado_em
  before update on public.perfis
  for each row execute function public.set_atualizado_em();

-- Cria o perfil automaticamente quando uma conta é criada no Supabase Auth.
-- Nome e papel podem vir de user_metadata ({"nome": "...", "papel": "admin"});
-- sem papel informado, a conta nasce como 'profissional' (menor privilégio).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'papel')::public.papel_usuaria, 'profissional')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers de permissão para as políticas RLS de todas as fases
create or replace function public.is_usuaria_ativa()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and ativo);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and ativo and papel = 'admin');
$$;

-- RLS: só usuárias autenticadas e ativas leem; só admin altera.
alter table public.perfis enable row level security;

drop policy if exists "perfis: usuárias ativas leem" on public.perfis;
create policy "perfis: usuárias ativas leem"
  on public.perfis for select to authenticated
  using (public.is_usuaria_ativa() or id = auth.uid());

drop policy if exists "perfis: admin altera" on public.perfis;
create policy "perfis: admin altera"
  on public.perfis for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Inserção é feita pelo trigger (security definer); exclusão só via auth.users.
revoke insert, delete on public.perfis from authenticated, anon;
revoke all on public.perfis from anon;
