-- Fase 5 (adiantada) — Caixa: lançamentos de entrada e saída.
-- Substitui o formulário "LS | Controle Financeiro". Rodar DEPOIS da 0002.
-- Pode ser rodada mais de uma vez.

do $$ begin
  create type public.tipo_lancamento as enum ('entrada', 'saida');
exception when duplicate_object then null; end $$;

create table if not exists public.lancamentos (
  id               uuid primary key default gen_random_uuid(),
  data             date not null default (now() at time zone 'America/Fortaleza')::date,
  tipo             public.tipo_lancamento not null,
  descricao        text not null check (length(trim(descricao)) > 0),
  -- Até a Fase 3 (Clientes) o nome da cliente é texto livre.
  cliente_nome     text,
  -- Entrada: Serviço, Produto, Curso, Brinde, Outro. Saída: categorias de despesa.
  categoria        text,
  valor            numeric(10, 2) not null check (valor >= 0),
  forma_pagamento  public.forma_pagamento,
  parcelas         smallint not null default 1 check (parcelas between 1 and 12),
  -- Copiada de taxas_pagamento no momento do lançamento (histórico não muda se a Ton mudar).
  taxa_percentual  numeric(5, 2) not null default 0 check (taxa_percentual between 0 and 100),
  valor_liquido    numeric(10, 2) generated always as (
                     case when tipo = 'entrada'
                       then round(valor * (1 - taxa_percentual / 100), 2)
                       else valor end
                   ) stored,
  cancelado        boolean not null default false,
  criado_por       uuid references public.perfis (id) default auth.uid(),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  check ((forma_pagamento = 'credito_parcelado') = (parcelas >= 2)),
  -- Entrada paga precisa de forma de pagamento (brinde = valor 0 dispensa)
  check (tipo = 'saida' or valor = 0 or forma_pagamento is not null)
);

create index if not exists lancamentos_data_idx on public.lancamentos (data);

drop trigger if exists lancamentos_atualizado_em on public.lancamentos;
create trigger lancamentos_atualizado_em
  before update on public.lancamentos
  for each row execute function public.set_atualizado_em();

-- Taxa da maquininha: preenchida pelo banco a partir de taxas_pagamento.
create or replace function public.lancamento_aplicar_taxa()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tipo = 'saida' or new.forma_pagamento is null then
    new.taxa_percentual := 0;
  elsif tg_op = 'INSERT'
     or new.forma_pagamento is distinct from old.forma_pagamento
     or new.parcelas is distinct from old.parcelas
     or new.tipo is distinct from old.tipo then
    select coalesce(t.taxa_percentual, 0) into new.taxa_percentual
      from public.taxas_pagamento t
     where t.forma = new.forma_pagamento and t.parcelas = new.parcelas;
    new.taxa_percentual := coalesce(new.taxa_percentual, 0);
  else
    new.taxa_percentual := old.taxa_percentual;
  end if;
  if tg_op = 'UPDATE' then
    new.criado_por := old.criado_por;  -- autoria não muda
    new.criado_em := old.criado_em;
  end if;
  return new;
end $$;

drop trigger if exists lancamentos_taxa on public.lancamentos;
create trigger lancamentos_taxa
  before insert or update on public.lancamentos
  for each row execute function public.lancamento_aplicar_taxa();

-- RLS: todas as usuárias ativas veem e lançam; cada uma corrige/cancela o que lançou;
-- admin corrige tudo. Sem exclusão: cancelar mantém o histórico.
alter table public.lancamentos enable row level security;

drop policy if exists "lancamentos: usuárias ativas leem" on public.lancamentos;
create policy "lancamentos: usuárias ativas leem"
  on public.lancamentos for select to authenticated
  using (public.is_usuaria_ativa());

drop policy if exists "lancamentos: usuárias ativas lançam" on public.lancamentos;
create policy "lancamentos: usuárias ativas lançam"
  on public.lancamentos for insert to authenticated
  with check (public.is_usuaria_ativa() and criado_por = auth.uid());

drop policy if exists "lancamentos: autora ou admin corrige" on public.lancamentos;
create policy "lancamentos: autora ou admin corrige"
  on public.lancamentos for update to authenticated
  using (public.is_admin() or (public.is_usuaria_ativa() and criado_por = auth.uid()))
  with check (public.is_admin() or (public.is_usuaria_ativa() and criado_por = auth.uid()));

revoke all on public.lancamentos from anon;
revoke delete on public.lancamentos from authenticated;
