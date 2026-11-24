-- Black LS (28, 29 e 30/11/2026) — serviços da promoção, conforme o post "BlackLS Stories".
-- Combo = 2 procedimentos por um único valor. Pode rodar de novo (não duplica; atualiza preço/duração).
-- Duração = soma das durações dos serviços que já existem no sistema (não é chute).
-- Categoria "Black LS": aparece agrupada na agenda. Depois do dia 30/11, desativar (fim do arquivo).
with dur as (
  select
    coalesce((select duracao_min from public.servicos where lower(nome) = 'nanofios' limit 1), 90)        as nanofios,
    coalesce((select max(duracao_min) from public.servicos
               where categoria = 'Micropigmentação · Lábios' and preco > 0), 90)                          as micro_labial,
    coalesce((select duracao_min from public.servicos where lower(nome) = 'dermaplaning' limit 1), 90)    as dermaplaning,
    coalesce((select duracao_min from public.servicos where lower(nome) = 'lash lifting' limit 1), 60)    as lash,
    coalesce((select duracao_min from public.servicos where lower(nome) = 'brow lamination' limit 1), 60) as brow,
    coalesce((select duracao_min from public.servicos where lower(nome) = 'shadow' limit 1), 90)          as shadow
),
novos (nome, minutos, preco, retorno) as (
  select 'Black LS · Combo 1: Nanofios + Micro labial (sem retoque)', nanofios + micro_labial, 689.90::numeric, null::int from dur
  union all select 'Black LS · Combo 2: Nanofios + Dermaplaning',     nanofios + dermaplaning, 599.90, 30 from dur
  union all select 'Black LS · Combo 2: Nanofios + Lash lifting',     nanofios + lash,         599.90, 30 from dur
  union all select 'Black LS · Combo 3: Brow lamination + Dermaplaning', brow + dermaplaning,  199.90, 45 from dur
  union all select 'Black LS · Combo 3: Brow lamination + Lash lifting', brow + lash,          199.90, 45 from dur
  union all select 'Black LS · Nanofios',                             nanofios,                489.90, 30 from dur
  union all select 'Black LS · Shadow',                               shadow,                  349.90, 30 from dur
),
atualizados as (
  update public.servicos s
     set preco = n.preco, duracao_min = least(n.minutos, 600), categoria = 'Black LS', retorno_dias = n.retorno, ativo = true
    from novos n
   where lower(s.nome) = lower(n.nome)
  returning s.nome
)
insert into public.servicos (nome, categoria, duracao_min, preco, retorno_dias, ativo)
select n.nome, 'Black LS', least(n.minutos, 600), n.preco, n.retorno, true
  from novos n
 where not exists (select 1 from public.servicos s where lower(s.nome) = lower(n.nome));

-- Conferência: devem aparecer 7 linhas
select nome, preco, duracao_min as minutos, retorno_dias, ativo
  from public.servicos where categoria = 'Black LS' order by preco desc, nome;

-- DEPOIS DA BLACK (a partir de 01/12/2026), rode só a linha abaixo para tirar os serviços da agenda
-- (o histórico dos atendimentos continua):
-- update public.servicos set ativo = false where categoria = 'Black LS';
