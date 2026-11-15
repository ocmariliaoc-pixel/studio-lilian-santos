-- Conferência dos retornos marcados (só leitura: não muda nada).
-- Mostra cada agendamento futuro que parece retorno, o último atendimento da cliente e um aviso.
with futuros as (
  select a.id, a.cliente_id, a.inicio, a.fim, a.status, a.valor_total, coalesce(a.observacoes, '') as obs,
         string_agg(i.nome || ' (R$ ' || to_char(i.valor, 'FM999990D00') || ')', ' + ' order by i.ordem) as itens,
         bool_or(i.nome ilike 'retorno%') as usa_servico_retorno,
         bool_or(i.nome ilike '%retorno%') or coalesce(a.observacoes, '') ilike '%retorno%' as parece_retorno
    from public.agendamentos a
    join public.agendamento_itens i on i.agendamento_id = a.id
   where a.inicio >= now() - interval '1 day' and a.status in ('agendado', 'confirmado')
   group by a.id
),
ultimo as (
  select distinct on (l.cliente_id) l.cliente_id, l.data, l.descricao, l.valor
    from public.lancamentos l
   where l.tipo = 'entrada' and not l.cancelado and l.cliente_id is not null
   order by l.cliente_id, l.data desc, l.criado_em desc
)
select c.nome as cliente,
       to_char(f.inicio at time zone 'America/Fortaleza', 'DD/MM HH24:MI') as quando,
       f.itens,
       f.valor_total as total,
       coalesce(to_char(u.data, 'DD/MM') || ' · ' || u.descricao, '— nenhum no caixa') as ultimo_atendimento,
       concat_ws(' · ',
         case when f.valor_total > 0 then 'retorno com valor (deveria ser R$ 0?)' end,
         case when not f.usa_servico_retorno then 'trocar pelo serviço "Retorno …"' end,
         case when u.data is null then 'cliente sem atendimento anterior no caixa' end,
         case when u.data is not null and (f.inicio at time zone 'America/Fortaleza')::date - u.data > 90
              then 'último atendimento há mais de 90 dias' end
       ) as aviso
  from futuros f
  join public.clientes c on c.id = f.cliente_id
  left join ultimo u on u.cliente_id = f.cliente_id
 where f.parece_retorno
 order by f.inicio;
