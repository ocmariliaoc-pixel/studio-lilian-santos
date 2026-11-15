-- Agendamentos de curso feitos com o serviço provisório "Curso Design Intensy" (R$ 0,01):
-- passam a ser o curso de verdade (Curso de design de sobrancelha), com o preço da tabela de Produtos.
-- Só mexe no que ainda não foi concluído. Pode rodar de novo.
with curso as (
  select nome, preco from public.produtos
   where categoria = 'Cursos' and nome ilike 'curso de design%' and ativo
   order by nome limit 1
)
update public.agendamento_itens i
   set nome = curso.nome, valor = curso.preco, servico_id = null
  from curso, public.servicos s, public.agendamentos a
 where i.servico_id = s.id and s.nome ilike 'curso design intens%'
   and a.id = i.agendamento_id and a.status in ('agendado', 'confirmado');

update public.agendamentos a
   set valor_total = (select coalesce(sum(i.valor), 0) from public.agendamento_itens i where i.agendamento_id = a.id)
 where a.status in ('agendado', 'confirmado')
   and exists (select 1 from public.agendamento_itens i where i.agendamento_id = a.id and i.nome ilike 'curso%');

-- Conferência: cursos agendados daqui para frente
select c.nome as cliente,
       to_char(a.inicio at time zone 'America/Fortaleza', 'DD/MM/YYYY HH24:MI') as quando,
       to_char(a.fim at time zone 'America/Fortaleza', 'HH24:MI') as termina,
       a.status::text as situacao, i.nome as item, i.valor as valor_item, a.valor_total
  from public.agendamento_itens i
  join public.agendamentos a on a.id = i.agendamento_id
  join public.clientes c on c.id = a.cliente_id
 where i.nome ilike '%curso%' and a.inicio >= now() - interval '1 day'
 order by a.inicio;
