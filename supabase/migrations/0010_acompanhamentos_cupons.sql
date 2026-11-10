-- Pós-atendimento (mensagem de retorno por serviço) e cupons de desconto. Rodar DEPOIS da 0009.
-- Pode ser rodada de novo.

-- ---------------------------------------------------------------------------
-- Regras de pós-atendimento (uma linha por mensagem; editáveis no banco)
--   termos: nomes de serviço que aparecem na descrição do lançamento (ex.: 'Nanofios')
--   categoria: OU a categoria do lançamento (ex.: 'Curso')
--   mensagem: texto do WhatsApp; {nome}, {servico}, {retorno} são trocados na hora
-- ---------------------------------------------------------------------------
create table if not exists public.regras_acompanhamento (
  id            text primary key,
  nome          text not null,
  dias_mensagem integer not null check (dias_mensagem between 1 and 730),
  dias_retorno  integer check (dias_retorno is null or dias_retorno between 1 and 730),
  termos        text[] not null default '{}',
  categoria     text,
  mensagem      text not null,
  ativo         boolean not null default true,
  ordem         smallint not null default 0
);

alter table public.regras_acompanhamento enable row level security;
drop policy if exists "regras: usuárias ativas leem" on public.regras_acompanhamento;
create policy "regras: usuárias ativas leem"
  on public.regras_acompanhamento for select to authenticated using (public.is_usuaria_ativa());
drop policy if exists "regras: admin altera" on public.regras_acompanhamento;
create policy "regras: admin altera"
  on public.regras_acompanhamento for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.regras_acompanhamento from anon;
revoke insert, delete on public.regras_acompanhamento from authenticated;

-- Mensagens já enviadas (saem da lista de pendências)
create table if not exists public.acompanhamentos_feitos (
  cliente_id  uuid not null references public.clientes (id),
  regra       text not null,
  referencia  date not null,                 -- data do atendimento que gerou a mensagem
  feito_em    timestamptz not null default now(),
  feito_por   uuid references public.perfis (id) default auth.uid(),
  primary key (cliente_id, regra, referencia)
);

alter table public.acompanhamentos_feitos enable row level security;
drop policy if exists "acompanhamentos: usuárias ativas leem" on public.acompanhamentos_feitos;
create policy "acompanhamentos: usuárias ativas leem"
  on public.acompanhamentos_feitos for select to authenticated using (public.is_usuaria_ativa());
drop policy if exists "acompanhamentos: usuárias ativas marcam" on public.acompanhamentos_feitos;
create policy "acompanhamentos: usuárias ativas marcam"
  on public.acompanhamentos_feitos for insert to authenticated with check (public.is_usuaria_ativa());
drop policy if exists "acompanhamentos: usuárias ativas desfazem" on public.acompanhamentos_feitos;
create policy "acompanhamentos: usuárias ativas desfazem"
  on public.acompanhamentos_feitos for delete to authenticated using (public.is_usuaria_ativa());
revoke all on public.acompanhamentos_feitos from anon;

-- Último atendimento de cada regra por cliente, com a data da mensagem e do retorno.
drop view if exists public.acompanhamentos;
create view public.acompanhamentos
with (security_invoker = true) as
with casados as (
  select distinct on (l.cliente_id, r.id)
         l.cliente_id, r.id as regra, r.nome as regra_nome, r.mensagem, r.ordem,
         l.data as atendido_em,
         coalesce((select t from unnest(r.termos) t where l.descricao ilike '%' || t || '%' limit 1), l.descricao) as servico,
         r.dias_mensagem, r.dias_retorno
    from public.lancamentos l
    join public.regras_acompanhamento r
      on r.ativo and (
           (r.categoria is not null and l.categoria = r.categoria)
        or exists (select 1 from unnest(r.termos) t where l.descricao ilike '%' || t || '%'))
   where l.tipo = 'entrada' and not l.cancelado and l.cliente_id is not null
   order by l.cliente_id, r.id, l.data desc
)
select k.cliente_id, c.nome as cliente_nome, c.whatsapp, k.regra, k.regra_nome, k.mensagem, k.ordem,
       k.servico, k.atendido_em,
       k.atendido_em + k.dias_mensagem as mensagem_em,
       k.atendido_em + k.dias_retorno  as retorno_em,
       exists (select 1 from public.acompanhamentos_feitos a
                where a.cliente_id = k.cliente_id and a.regra = k.regra and a.referencia = k.atendido_em) as mensagem_enviada,
       (select min(ag.inicio) from public.agendamentos ag
         where ag.cliente_id = k.cliente_id and ag.inicio >= now()
           and ag.status in ('agendado', 'confirmado')) as proximo_agendamento
  from casados k
  join public.clientes c on c.id = k.cliente_id;

grant select on public.acompanhamentos to authenticated;
revoke all on public.acompanhamentos from anon;

-- ---------------------------------------------------------------------------
-- Cupons de desconto (ex.: ação do balão na inauguração)
-- ---------------------------------------------------------------------------
create table if not exists public.cupons (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes (id),
  descricao   text not null,                      -- em que vale (ex.: Design de sobrancelha)
  percentual  numeric(5, 2) not null check (percentual > 0 and percentual <= 100),
  valido_ate  date,
  origem      text,                               -- ex.: Inauguração — ação do balão
  lembrado_em timestamptz,                        -- quando mandaram o lembrete
  usado_em    date,
  observacao  text,
  criado_em   timestamptz not null default now()
);

create index if not exists cupons_cliente_idx on public.cupons (cliente_id);

alter table public.cupons enable row level security;
drop policy if exists "cupons: usuárias ativas leem" on public.cupons;
create policy "cupons: usuárias ativas leem"
  on public.cupons for select to authenticated using (public.is_usuaria_ativa());
drop policy if exists "cupons: usuárias ativas cadastram" on public.cupons;
create policy "cupons: usuárias ativas cadastram"
  on public.cupons for insert to authenticated with check (public.is_usuaria_ativa());
drop policy if exists "cupons: usuárias ativas alteram" on public.cupons;
create policy "cupons: usuárias ativas alteram"
  on public.cupons for update to authenticated using (public.is_usuaria_ativa()) with check (public.is_usuaria_ativa());
revoke all on public.cupons from anon;
revoke delete on public.cupons from authenticated;

