-- Retornos sem custo (R$ 0,00, 15 min) e agendamento da Cismária em 13/12 às 09:30. Pode rodar de novo.

-- 1) Serviços de retorno
insert into public.servicos (nome, categoria, duracao_min, preco, retorno_dias, ativo)
select v.nome, v.categoria, 15, 0, null, true
  from (values
    ('Retorno micro sobrancelha',              'Micropigmentação · Sobrancelha'),
    ('Retorno micro labial',                   'Micropigmentação · Lábios'),
    ('Retorno remoção de micro sobrancelha',   'Remoção a laser')
  ) v(nome, categoria)
 where not exists (select 1 from public.servicos s where lower(s.nome) = lower(v.nome));

-- 2) Cismária: retorno da remoção (ela fez a remoção a laser no Laser Day, 15/11) — 13/12 (domingo) às 09:30
select c.nome,
       public.salvar_agendamento(
         null, c.id, timestamptz '2026-12-13 09:30-03',
         jsonb_build_array(jsonb_build_object('servico_id', s.id, 'nome', s.nome, 'duracao_min', s.duracao_min, 'valor', 0)),
         0, 'Já é cliente', 'Retorno da remoção de micro sobrancelha'
       ) is not null as agendado
  from public.clientes c, public.servicos s
 where lower(c.nome) like 'cism%ria%'
   and lower(s.nome) = 'retorno remoção de micro sobrancelha'
   and not exists (select 1 from public.agendamentos a
                    where a.cliente_id = c.id and a.inicio = timestamptz '2026-12-13 09:30-03');

-- Conferência
select 'serviço' as o_que, nome as detalhe, to_char(duracao_min, 'FM999') || ' min' as quando, preco as valor
  from public.servicos where nome ilike 'retorno%' and ativo
union all
select 'agendamento', c.nome || ' · ' || string_agg(i.nome, ' + '),
       to_char(a.inicio at time zone 'America/Fortaleza', 'DD/MM/YYYY HH24:MI') || '–' || to_char(a.fim at time zone 'America/Fortaleza', 'HH24:MI'),
       a.valor_total
  from public.agendamentos a
  join public.clientes c on c.id = a.cliente_id
  join public.agendamento_itens i on i.agendamento_id = a.id
 where lower(c.nome) like 'cism%ria%' and a.inicio >= timestamptz '2026-12-13 00:00-03' and a.inicio < timestamptz '2026-12-14 00:00-03'
 group by c.nome, a.inicio, a.fim, a.valor_total
order by 1 desc, 2;
