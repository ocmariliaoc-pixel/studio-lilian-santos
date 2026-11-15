-- Retoque e avaliação valem R$ 0,00 (estavam R$ 0,10 e R$ 1,00) + conferência de cursos/valores estranhos.
-- Pode rodar de novo.

-- 1) Preço da tabela
update public.servicos set preco = 0
 where (nome ilike 'retoque%' or nome ilike 'avalia%') and preco <> 0;

-- 2) Agendamentos ainda NÃO concluídos com esses serviços: item vira R$ 0 e o total é recalculado
update public.agendamento_itens i set valor = 0
  from public.servicos s, public.agendamentos a
 where i.servico_id = s.id and (s.nome ilike 'retoque%' or s.nome ilike 'avalia%') and i.valor <> 0
   and a.id = i.agendamento_id and a.status in ('agendado', 'confirmado');

update public.agendamentos a
   set valor_total = (select coalesce(sum(i.valor), 0) from public.agendamento_itens i where i.agendamento_id = a.id)
 where a.status in ('agendado', 'confirmado')
   and exists (select 1 from public.agendamento_itens i join public.servicos s on s.id = i.servico_id
                where i.agendamento_id = a.id and (s.nome ilike 'retoque%' or s.nome ilike 'avalia%'));

-- 3) Conferência (só leitura): itens com valor de centavos, cursos marcados como serviço e vendas de curso
--    fora da categoria "Curso". Mande o resultado para revisar.
select 'agendamento' as onde, c.nome as cliente,
       to_char(a.inicio at time zone 'America/Fortaleza', 'DD/MM HH24:MI') as quando,
       a.status::text as situacao, i.nome as item, i.valor
  from public.agendamento_itens i
  join public.agendamentos a on a.id = i.agendamento_id
  join public.clientes c on c.id = a.cliente_id
 where (i.valor > 0 and i.valor < 1.5) or i.nome ilike '%curso%'
union all
select 'caixa', l.cliente_nome, to_char(l.data, 'DD/MM'),
       case when l.cancelado then 'cancelado' else coalesce(l.categoria, '') end, l.descricao, l.valor
  from public.lancamentos l
 where l.tipo = 'entrada'
   and ((l.valor > 0 and l.valor < 1.5) or (l.descricao ilike '%curso%' and coalesce(l.categoria, '') <> 'Curso'))
union all
select 'serviço cadastrado', null, null, case when ativo then 'ativo' else 'inativo' end, nome, preco
  from public.servicos
 where nome ilike '%curso%' or (preco > 0 and preco < 1.5)
order by 1, 3;
