-- Fechar a agenda num dia ou turno (folga, feriado, compromisso, curso). Rodar DEPOIS da 0010.
-- Pode ser rodada de novo.
create table if not exists public.bloqueios_agenda (
  id         uuid primary key default gen_random_uuid(),
  inicio     timestamptz not null,
  fim        timestamptz not null,
  motivo     text not null default 'Fechado',
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em  timestamptz not null default now(),
  check (fim > inicio)
);

create index if not exists bloqueios_inicio_idx on public.bloqueios_agenda (inicio);

alter table public.bloqueios_agenda enable row level security;
drop policy if exists "bloqueios: usuárias ativas leem" on public.bloqueios_agenda;
create policy "bloqueios: usuárias ativas leem"
  on public.bloqueios_agenda for select to authenticated using (public.is_usuaria_ativa());
drop policy if exists "bloqueios: usuárias ativas fecham" on public.bloqueios_agenda;
create policy "bloqueios: usuárias ativas fecham"
  on public.bloqueios_agenda for insert to authenticated with check (public.is_usuaria_ativa());
-- Reabrir = apagar o bloqueio (não é histórico de cliente)
drop policy if exists "bloqueios: usuárias ativas reabrem" on public.bloqueios_agenda;
create policy "bloqueios: usuárias ativas reabrem"
  on public.bloqueios_agenda for delete to authenticated using (public.is_usuaria_ativa());
revoke all on public.bloqueios_agenda from anon;
