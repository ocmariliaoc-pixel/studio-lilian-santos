-- Vendas de serviço repetidas (mesma cliente, mesmo dia, mesmo valor) — ex.: a venda já estava no caixa
-- e entrou de novo pelo extrato do banco. Mantém UMA de cada grupo e CANCELA as outras (não apaga).
-- Fica a que está ligada a um agendamento; senão a que tem descrição de verdade (não "a confirmar");
-- senão a mais antiga. Se a cancelada estava ligada ao extrato, a ligação passa para a que ficou.
-- Pode rodar de novo.
with grupos as (
  select l.id, l.cliente_id, l.data, l.valor,
         row_number() over (
           partition by l.cliente_id, l.data, l.valor
           order by (l.agendamento_id is not null) desc,
                    (l.descricao ilike '%a confirmar%' or l.descricao ilike '%a identificar%') asc,
                    l.criado_em asc
         ) as ordem,
         first_value(l.id) over (
           partition by l.cliente_id, l.data, l.valor
           order by (l.agendamento_id is not null) desc,
                    (l.descricao ilike '%a confirmar%' or l.descricao ilike '%a identificar%') asc,
                    l.criado_em asc
         ) as fica
    from public.lancamentos l
   where l.tipo = 'entrada' and not l.cancelado and l.cliente_id is not null and l.valor > 0
     and coalesce(l.categoria, 'Serviço') = 'Serviço'
),
extras as (select id, fica from grupos where ordem > 1),
religa as (
  update public.extrato_movimentos e set lancamento_id = x.fica
    from extras x
   where e.lancamento_id = x.id
     and not exists (select 1 from public.extrato_movimentos e2 where e2.lancamento_id = x.fica)
  returning e.id
)
update public.lancamentos l set cancelado = true
  from extras x
 where l.id = x.id;

-- Conferência: o que ficou cancelado e o que continua valendo para essas clientes
select l.cliente_nome as cliente, to_char(l.data, 'DD/MM') as dia, l.descricao, l.valor,
       case when l.cancelado then 'CANCELADA (repetida)' else 'vale' end as situacao
  from public.lancamentos l
 where l.tipo = 'entrada' and l.cliente_id in (
         select cliente_id from public.lancamentos
          where tipo = 'entrada' and cliente_id is not null and valor > 0
          group by cliente_id, data, valor having count(*) > 1)
 order by l.cliente_nome, l.data, l.cancelado;
