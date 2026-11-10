-- Metas (v0 da Fase 6). Rodar DEPOIS da 0008. Pode ser rodada de novo.
-- A meta de faturamento é calculada a partir do que o studio precisa pagar:
--   meta bruta = (custos fixos + pessoas + lucro desejado) ÷ (1 − taxa média da maquininha − % de insumos)

create table if not exists public.metas (
  mes             date primary key check (extract(day from mes) = 1),  -- 1º dia do mês
  custos          jsonb not null default '[]',   -- [{"nome": "Aluguel", "valor": 1750}]
  pessoas         jsonb not null default '[]',   -- [{"nome": "Lilian (fixo)", "valor": 1000}]
  lucro_desejado  numeric(10, 2) not null default 0 check (lucro_desejado >= 0),
  insumos_pct     numeric(5, 2) not null default 0 check (insumos_pct between 0 and 80),
  ticket_alvo     numeric(10, 2) check (ticket_alvo is null or ticket_alvo > 0),  -- vazio = usa o real
  atualizado_em   timestamptz not null default now()
);

drop trigger if exists metas_atualizado_em on public.metas;
create trigger metas_atualizado_em
  before update on public.metas
  for each row execute function public.set_atualizado_em();

alter table public.metas enable row level security;

drop policy if exists "metas: usuárias ativas leem" on public.metas;
create policy "metas: usuárias ativas leem"
  on public.metas for select to authenticated using (public.is_usuaria_ativa());
drop policy if exists "metas: admin cria" on public.metas;
create policy "metas: admin cria"
  on public.metas for insert to authenticated with check (public.is_admin());
drop policy if exists "metas: admin altera" on public.metas;
create policy "metas: admin altera"
  on public.metas for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.metas from anon;
revoke delete on public.metas from authenticated;

-- Ponto de partida (novembro/2026), com os números já informados. A admin ajusta na tela.
insert into public.metas (mes, custos, pessoas, lucro_desejado, insumos_pct)
values (
  date '2026-11-01',
  '[{"nome": "Aluguel", "valor": 1750}, {"nome": "Luz", "valor": 300}, {"nome": "Contador/MEI", "valor": 200}]',
  '[{"nome": "Lilian (fixo, a confirmar)", "valor": 1000}, {"nome": "Jocélia", "valor": 650}]',
  0, 0
)
on conflict (mes) do nothing;
