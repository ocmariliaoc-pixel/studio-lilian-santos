-- Contas a pagar (contas fixas com vencimento) e extrato da maquininha (contas a receber).
-- Rodar DEPOIS da 0011. Pode ser rodada de novo.

-- ---------------------------------------------------------------------------
-- Contas fixas: geram as contas a pagar de cada mês
-- ---------------------------------------------------------------------------
create table if not exists public.contas_fixas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  categoria   text not null default 'Outros',
  valor       numeric(10, 2) not null check (valor >= 0),        -- valor de CADA vencimento
  dias        smallint[] not null check (array_length(dias, 1) >= 1),  -- dias do mês (ex.: {15,30})
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

alter table public.contas_fixas enable row level security;
drop policy if exists "contas_fixas: usuárias ativas leem" on public.contas_fixas;
create policy "contas_fixas: usuárias ativas leem"
  on public.contas_fixas for select to authenticated using (public.is_usuaria_ativa());
drop policy if exists "contas_fixas: admin cadastra" on public.contas_fixas;
create policy "contas_fixas: admin cadastra"
  on public.contas_fixas for insert to authenticated with check (public.is_admin());
drop policy if exists "contas_fixas: admin altera" on public.contas_fixas;
create policy "contas_fixas: admin altera"
  on public.contas_fixas for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.contas_fixas from anon;
revoke delete on public.contas_fixas from authenticated;

-- Pagamento de uma conta fixa = saída no caixa ligada à conta e ao vencimento
alter table public.lancamentos
  add column if not exists conta_fixa_id uuid references public.contas_fixas (id),
  add column if not exists vencimento date;

create unique index if not exists lancamentos_conta_vencimento_unico
  on public.lancamentos (conta_fixa_id, vencimento) where conta_fixa_id is not null and not cancelado;

-- ---------------------------------------------------------------------------
-- Extrato da maquininha (Ton): movimentos importados do PDF
-- ---------------------------------------------------------------------------
create table if not exists public.extrato_movimentos (
  id            uuid primary key default gen_random_uuid(),
  chave         text not null unique,             -- data|tipo|valor|saldo (não importa 2x)
  data          date not null,
  tipo          public.tipo_lancamento not null,
  descricao     text not null,
  meio          text,
  valor         numeric(10, 2) not null,
  saldo         numeric(12, 2),
  contraparte   text,
  lancamento_id uuid references public.lancamentos (id),   -- conciliado com o caixa
  ignorado      boolean not null default false,          -- ex.: repasse de cartão já coberto
  importado_em  timestamptz not null default now(),
  importado_por uuid references public.perfis (id) default auth.uid()
);

create index if not exists extrato_data_idx on public.extrato_movimentos (data);

alter table public.extrato_movimentos enable row level security;
drop policy if exists "extrato: usuárias ativas leem" on public.extrato_movimentos;
create policy "extrato: usuárias ativas leem"
  on public.extrato_movimentos for select to authenticated using (public.is_usuaria_ativa());
drop policy if exists "extrato: admin importa" on public.extrato_movimentos;
create policy "extrato: admin importa"
  on public.extrato_movimentos for insert to authenticated with check (public.is_admin());
drop policy if exists "extrato: admin concilia" on public.extrato_movimentos;
create policy "extrato: admin concilia"
  on public.extrato_movimentos for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.extrato_movimentos from anon;
revoke delete on public.extrato_movimentos from authenticated;
