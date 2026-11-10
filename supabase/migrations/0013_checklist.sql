-- Checklist de tarefas entre a equipe (Ana Jessica pede para Lilian e vice-versa). Rodar DEPOIS da 0012.
-- Pode ser rodada de novo.
--   etiqueta: clientes_ativos (atividade para clientes ativas) · novos_clientes (atividade para novas) · geral
--   recorrencia: unica (com prazo) · diaria · semanal (dia_semana 0 = domingo … 6 = sábado)
create table if not exists public.tarefas (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null check (char_length(titulo) between 1 and 140),
  detalhes       text,
  responsavel_id uuid not null references public.perfis (id),
  criado_por     uuid not null references public.perfis (id) default auth.uid(),
  etiqueta       text not null default 'geral' check (etiqueta in ('clientes_ativos', 'novos_clientes', 'geral')),
  recorrencia    text not null default 'unica' check (recorrencia in ('unica', 'diaria', 'semanal')),
  dia_semana     smallint check (dia_semana between 0 and 6),
  prazo          date,                                   -- única: até quando; recorrente: a partir de quando
  cliente_id     uuid references public.clientes (id),   -- opcional (ex.: "mandar boas-vindas para Fulana")
  ativa          boolean not null default true,          -- desativar em vez de excluir
  criado_em      timestamptz not null default now(),
  check (recorrencia <> 'semanal' or dia_semana is not null)
);

create index if not exists tarefas_responsavel_idx on public.tarefas (responsavel_id) where ativa;

-- Cada vez que a tarefa foi feita (uma por dia; a única fica feita de vez)
create table if not exists public.tarefa_conclusoes (
  tarefa_id  uuid not null references public.tarefas (id),
  data       date not null,
  feito_por  uuid references public.perfis (id) default auth.uid(),
  feito_em   timestamptz not null default now(),
  primary key (tarefa_id, data)
);

alter table public.tarefas enable row level security;
drop policy if exists "tarefas: usuárias ativas leem" on public.tarefas;
create policy "tarefas: usuárias ativas leem"
  on public.tarefas for select to authenticated using (public.is_usuaria_ativa());
drop policy if exists "tarefas: usuárias ativas criam" on public.tarefas;
create policy "tarefas: usuárias ativas criam"
  on public.tarefas for insert to authenticated
  with check (public.is_usuaria_ativa() and criado_por = auth.uid());
drop policy if exists "tarefas: quem pediu, quem faz ou admin altera" on public.tarefas;
create policy "tarefas: quem pediu, quem faz ou admin altera"
  on public.tarefas for update to authenticated
  using (public.is_usuaria_ativa() and (public.is_admin() or criado_por = auth.uid() or responsavel_id = auth.uid()))
  with check (public.is_usuaria_ativa());
revoke all on public.tarefas from anon;
revoke delete on public.tarefas from authenticated;

alter table public.tarefa_conclusoes enable row level security;
drop policy if exists "conclusões: usuárias ativas leem" on public.tarefa_conclusoes;
create policy "conclusões: usuárias ativas leem"
  on public.tarefa_conclusoes for select to authenticated using (public.is_usuaria_ativa());
drop policy if exists "conclusões: usuárias ativas marcam" on public.tarefa_conclusoes;
create policy "conclusões: usuárias ativas marcam"
  on public.tarefa_conclusoes for insert to authenticated with check (public.is_usuaria_ativa());
drop policy if exists "conclusões: usuárias ativas desmarcam" on public.tarefa_conclusoes;
create policy "conclusões: usuárias ativas desmarcam"
  on public.tarefa_conclusoes for delete to authenticated using (public.is_usuaria_ativa());
revoke all on public.tarefa_conclusoes from anon;
