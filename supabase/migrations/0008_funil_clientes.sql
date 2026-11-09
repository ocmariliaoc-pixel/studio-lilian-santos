-- Funil de clientes: lead → lead ganho (cliente) | lead perdido (com motivo).
-- Rodar DEPOIS da 0007. Pode ser rodada de novo.
-- Status: lead (interessada) · ativa (= lead ganho, já é cliente) · inativa (cliente sumida) · perdido.
alter type public.status_cliente add value if not exists 'perdido';

alter table public.clientes
  add column if not exists motivo_perda text,
  add column if not exists status_em timestamptz;   -- quando o status mudou por último

create or replace function public.cliente_status_em()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.status_em := now();
    if new.status::text <> 'perdido' then new.motivo_perda := null; end if;
  end if;
  return new;
end $$;

drop trigger if exists clientes_status_em on public.clientes;
create trigger clientes_status_em
  before insert or update on public.clientes
  for each row execute function public.cliente_status_em();

-- Resumo por cliente agora traz nascimento, Instagram, status e motivo
drop view if exists public.clientes_resumo;
create view public.clientes_resumo
with (security_invoker = true) as
select
  c.id, c.nome, c.whatsapp, c.instagram, c.data_nascimento, c.status, c.motivo_perda,
  c.origem, c.observacoes, c.criado_em,
  u.data          as ultima_visita,
  u.servicos      as servicos_ultima_visita,
  p.data          as ultimo_pagamento_em,
  p.valor         as ultimo_pagamento_valor,
  p.forma_pagamento as ultimo_pagamento_forma,
  p.parcelas      as ultimo_pagamento_parcelas,
  coalesce(t.visitas, 0)     as visitas,
  coalesce(t.total_gasto, 0) as total_gasto,
  (select min(a.inicio) from public.agendamentos a
    where a.cliente_id = c.id and a.inicio >= now()
      and a.status in ('agendado', 'confirmado')) as proximo_agendamento
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
