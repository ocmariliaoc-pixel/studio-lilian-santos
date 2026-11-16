-- Brow Lamination passa a R$ 120,00 (era R$ 110,00). Pode rodar de novo.
-- Muda a tabela e os agendamentos ainda não concluídos; vendas e atendimentos concluídos ficam como foram.
update public.servicos set preco = 120 where lower(nome) = 'brow lamination' and preco <> 120;

update public.agendamento_itens i set valor = 120
  from public.servicos s, public.agendamentos a
 where i.servico_id = s.id and lower(s.nome) = 'brow lamination' and i.valor = 110
   and a.id = i.agendamento_id and a.status in ('agendado', 'confirmado');

update public.agendamentos a
   set valor_total = (select coalesce(sum(i.valor), 0) from public.agendamento_itens i where i.agendamento_id = a.id)
 where a.status in ('agendado', 'confirmado')
   and exists (select 1 from public.agendamento_itens i join public.servicos s on s.id = i.servico_id
                where i.agendamento_id = a.id and lower(s.nome) = 'brow lamination');

-- Conferência
select 'tabela' as onde, nome as detalhe, preco as valor from public.servicos where lower(nome) = 'brow lamination'
union all
select 'agendamento', c.nome || ' · ' || to_char(a.inicio at time zone 'America/Fortaleza', 'DD/MM HH24:MI'), a.valor_total
  from public.agendamentos a
  join public.clientes c on c.id = a.cliente_id
 where a.status in ('agendado', 'confirmado')
   and exists (select 1 from public.agendamento_itens i join public.servicos s on s.id = i.servico_id
                where i.agendamento_id = a.id and lower(s.nome) = 'brow lamination')
 order by 1 desc, 2;
