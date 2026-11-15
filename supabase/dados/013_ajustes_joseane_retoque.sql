-- Ajustes de 15/11/2026. Pode rodar de novo.

-- 1) Joseane: turma de design marcada em 4 períodos (16/11 e 17/11, manhã e tarde), cada um com R$ 850.
--    A venda fica só no 1º período (16/11 08:30); os outros viram continuação da turma (R$ 0,
--    não geram venda ao concluir — nome "… — dia X de 2").
update public.agendamento_itens i
   set valor = 0,
       nome = 'Curso de design de sobrancelha — dia '
              || case when (a.inicio at time zone 'America/Fortaleza')::date = date '2026-11-16' then '1' else '2' end
              || ' de 2'
  from public.agendamentos a, public.clientes c
 where a.id = i.agendamento_id and c.id = a.cliente_id
   and c.nome ilike 'joseane francalino%'
   and i.nome ilike 'curso de design de sobrancelha%'
   and a.status in ('agendado', 'confirmado')
   and a.inicio in (timestamptz '2026-11-16 13:30-03', timestamptz '2026-11-17 08:30-03', timestamptz '2026-11-17 13:30-03');

update public.agendamentos a
   set valor_total = (select coalesce(sum(i.valor), 0) from public.agendamento_itens i where i.agendamento_id = a.id)
  from public.clientes c
 where c.id = a.cliente_id and c.nome ilike 'joseane francalino%'
   and a.status in ('agendado', 'confirmado')
   and a.inicio >= timestamptz '2026-11-16 00:00-03' and a.inicio < timestamptz '2026-11-18 00:00-03';

-- 2) Avaliação e retoque já concluídos com centavos (Kelly R$ 1,00 e Iracilda R$ 0,10) → R$ 0,00
update public.agendamento_itens i set valor = 0
  from public.servicos s
 where i.servico_id = s.id and (s.nome ilike 'retoque%' or s.nome ilike 'avalia%') and i.valor > 0 and i.valor < 1.5;

update public.agendamentos a
   set valor_total = (select coalesce(sum(i.valor), 0) from public.agendamento_itens i where i.agendamento_id = a.id)
 where a.valor_total > 0 and a.valor_total < 1.5
   and exists (select 1 from public.agendamento_itens i join public.servicos s on s.id = i.servico_id
                where i.agendamento_id = a.id and (s.nome ilike 'retoque%' or s.nome ilike 'avalia%'));

-- se a venda desses atendimentos entrou no caixa com centavos, vira R$ 0 (brinde)
update public.lancamentos l set valor = 0, forma_pagamento = null, categoria = 'Brinde'
  from public.agendamentos a
 where l.agendamento_id = a.id and l.valor > 0 and l.valor < 1.5
   and exists (select 1 from public.agendamento_itens i join public.servicos s on s.id = i.servico_id
                where i.agendamento_id = a.id and (s.nome ilike 'retoque%' or s.nome ilike 'avalia%'));

-- Conferência
select c.nome as cliente, to_char(a.inicio at time zone 'America/Fortaleza', 'DD/MM HH24:MI') as quando,
       a.status::text as situacao, i.nome as item, i.valor, a.valor_total
  from public.agendamento_itens i
  join public.agendamentos a on a.id = i.agendamento_id
  join public.clientes c on c.id = a.cliente_id
 where c.nome ilike 'joseane francalino%' or c.nome ilike 'kelly ara%' or c.nome ilike 'iracilda%'
 order by a.inicio;
