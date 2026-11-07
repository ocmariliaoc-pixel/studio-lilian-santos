-- Agenda (v0 da Fase 4). Rodar DEPOIS da 0006. Pode ser rodada de novo.

do $$ begin
  create type public.status_agendamento as enum
    ('agendado', 'confirmado', 'realizado', 'faltou', 'cancelado');
exception when duplicate_object then null; end $$;

create table if not exists public.agendamentos (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes (id),
  inicio        timestamptz not null,
  fim           timestamptz not null,               -- fim do atendimento (soma das durações)
  -- fim + intervalo entre atendimentos: é o que ocupa a agenda (regra de conflito)
  fim_ocupado   timestamptz not null,
  status        public.status_agendamento not null default 'agendado',
  valor_total   numeric(10, 2) not null default 0 check (valor_total >= 0),
  marcado_por   text,                                -- quem marcou (cliente, Monica, Instagram...)
  observacoes   text,
  confirmado_em timestamptz,
  criado_por    uuid references public.perfis (id) default auth.uid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (fim > inicio),
  check (fim_ocupado >= fim)
);

create index if not exists agendamentos_inicio_idx on public.agendamentos (inicio);

-- Sem conflito de horário: dois agendamentos ativos não podem se sobrepor (uma profissional).
do $$ begin
  alter table public.agendamentos
    add constraint agendamentos_sem_conflito
    exclude using gist (tstzrange(inicio, fim_ocupado, '[)') with &&)
    where (status in ('agendado', 'confirmado', 'realizado'));
exception when duplicate_object or duplicate_table then null; end $$;

drop trigger if exists agendamentos_atualizado_em on public.agendamentos;
create trigger agendamentos_atualizado_em
  before update on public.agendamentos
  for each row execute function public.set_atualizado_em();

-- Itens: um atendimento pode ter vários serviços (design + buço). Valor e duração por item.
create table if not exists public.agendamento_itens (
  id             uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references public.agendamentos (id) on delete cascade,
  servico_id     uuid references public.servicos (id),
  nome           text not null,                     -- cópia do nome do serviço (histórico)
  duracao_min    integer not null check (duracao_min between 1 and 600),
  valor          numeric(10, 2) not null default 0 check (valor >= 0),
  ordem          smallint not null default 0
);

create index if not exists agendamento_itens_ag_idx on public.agendamento_itens (agendamento_id);

-- Atendimento realizado gera lançamento no caixa ligado a ele
alter table public.lancamentos
  add column if not exists agendamento_id uuid references public.agendamentos (id);

-- RLS: todas as usuárias ativas usam a agenda; sem exclusão de agendamento (cancelar).
alter table public.agendamentos enable row level security;
alter table public.agendamento_itens enable row level security;

drop policy if exists "agendamentos: usuárias ativas leem" on public.agendamentos;
create policy "agendamentos: usuárias ativas leem"
  on public.agendamentos for select to authenticated using (public.is_usuaria_ativa());
drop policy if exists "agendamentos: usuárias ativas marcam" on public.agendamentos;
create policy "agendamentos: usuárias ativas marcam"
  on public.agendamentos for insert to authenticated with check (public.is_usuaria_ativa());
drop policy if exists "agendamentos: usuárias ativas alteram" on public.agendamentos;
create policy "agendamentos: usuárias ativas alteram"
  on public.agendamentos for update to authenticated
  using (public.is_usuaria_ativa()) with check (public.is_usuaria_ativa());

drop policy if exists "agendamento_itens: usuárias ativas leem" on public.agendamento_itens;
create policy "agendamento_itens: usuárias ativas leem"
  on public.agendamento_itens for select to authenticated using (public.is_usuaria_ativa());
drop policy if exists "agendamento_itens: usuárias ativas gravam" on public.agendamento_itens;
create policy "agendamento_itens: usuárias ativas gravam"
  on public.agendamento_itens for insert to authenticated with check (public.is_usuaria_ativa());
-- Itens podem ser trocados ao editar o atendimento
drop policy if exists "agendamento_itens: usuárias ativas removem" on public.agendamento_itens;
create policy "agendamento_itens: usuárias ativas removem"
  on public.agendamento_itens for delete to authenticated using (public.is_usuaria_ativa());

revoke all on public.agendamentos, public.agendamento_itens from anon;
revoke delete on public.agendamentos from authenticated;

-- Cliente vira "ativa" no primeiro atendimento realizado
create or replace function public.agendamento_ativar_cliente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'realizado' then
    update public.clientes set status = 'ativa' where id = new.cliente_id and status <> 'ativa';
  end if;
  return new;
end $$;

drop trigger if exists agendamentos_ativar_cliente on public.agendamentos;
create trigger agendamentos_ativar_cliente
  after insert or update of status on public.agendamentos
  for each row execute function public.agendamento_ativar_cliente();

-- Salva atendimento + itens numa única operação (evita agendamento sem itens).
-- itens: [{"servico_id": "...", "nome": "...", "duracao_min": 30, "valor": 55}]
create or replace function public.salvar_agendamento(
  p_id uuid, p_cliente_id uuid, p_inicio timestamptz, p_itens jsonb,
  p_valor_total numeric, p_marcado_por text, p_observacoes text
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := p_id;
  v_duracao int;
  v_intervalo int;
begin
  select coalesce(sum((i ->> 'duracao_min')::int), 0) into v_duracao from jsonb_array_elements(p_itens) i;
  if v_duracao <= 0 then raise exception 'Escolha pelo menos um serviço.' using errcode = 'P0001'; end if;
  select intervalo_min into v_intervalo from public.configuracoes where id = 1;

  if v_id is null then
    insert into public.agendamentos (cliente_id, inicio, fim, fim_ocupado, valor_total, marcado_por, observacoes)
    values (p_cliente_id, p_inicio, p_inicio + make_interval(mins => v_duracao),
            p_inicio + make_interval(mins => v_duracao + coalesce(v_intervalo, 0)),
            p_valor_total, nullif(trim(p_marcado_por), ''), nullif(trim(p_observacoes), ''))
    returning id into v_id;
  else
    update public.agendamentos set
      cliente_id = p_cliente_id, inicio = p_inicio,
      fim = p_inicio + make_interval(mins => v_duracao),
      fim_ocupado = p_inicio + make_interval(mins => v_duracao + coalesce(v_intervalo, 0)),
      valor_total = p_valor_total,
      marcado_por = nullif(trim(p_marcado_por), ''), observacoes = nullif(trim(p_observacoes), '')
    where id = v_id;
    delete from public.agendamento_itens where agendamento_id = v_id;
  end if;

  insert into public.agendamento_itens (agendamento_id, servico_id, nome, duracao_min, valor, ordem)
  select v_id, nullif(i ->> 'servico_id', '')::uuid, i ->> 'nome', (i ->> 'duracao_min')::int,
         coalesce((i ->> 'valor')::numeric, 0), (row_number() over ())::smallint
    from jsonb_array_elements(p_itens) i;

  return v_id;
end $$;

grant execute on function public.salvar_agendamento(uuid, uuid, timestamptz, jsonb, numeric, text, text) to authenticated;
revoke all on function public.salvar_agendamento(uuid, uuid, timestamptz, jsonb, numeric, text, text) from anon, public;
