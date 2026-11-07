-- Ajustes de preço, spa labial e produtos com estoque de hoje.
-- Rodar DEPOIS da migração 0004. Pode ser rodado de novo (não duplica).

-- Preços atualizados
update public.servicos set preco = 599.00 where lower(nome) in ('nanofios', 'efeito batom');
update public.servicos set preco = 499.00 where lower(nome) in ('revitalização labial', 'neutralização labial');

-- Spa labial (duração estimada: 15 min; sem retorno definido)
insert into public.servicos (nome, categoria, duracao_min, preco, retorno_dias, ativo)
select 'Spa labial', 'Lábios', 15, 15.00, null, true
where not exists (select 1 from public.servicos where lower(nome) = 'spa labial');

-- Produtos (estoque de hoje)
insert into public.produtos (nome, categoria, preco, estoque)
select v.nome, v.categoria, v.preco, v.estoque
from (values
  ('Espelhinho',                                        'Acessórios',          10.00, 4),
  ('Cabo carregador de celular',                        'Acessórios',          15.00, 2),
  ('Brinco 29,90',                                      'Brincos',             29.90, 4),
  ('Brinco 39,90',                                      'Brincos',             39.90, 4),
  ('Brinco 44,90',                                      'Brincos',             44.90, 4),
  ('Brinco 49,90',                                      'Brincos',             49.90, 1),
  ('Brinco 59,90',                                      'Brincos',             59.90, 4),
  ('Gel creme antioleosidade — Extratos da Terra',      'Cuidados com a pele', 149.90, 2),
  ('Fluido finalizador FPS 50 — Extratos da Terra',     'Cuidados com a pele',  99.90, 0), -- quantidade não informada: ajustar no inventário
  ('Base stick — Extratos da Terra',                    'Cuidados com a pele', 129.90, 3)
) as v(nome, categoria, preco, estoque)
where not exists (select 1 from public.produtos p where lower(p.nome) = lower(v.nome));

-- A contagem de hoje vale como primeiro inventário (o alerta quinzenal conta a partir daqui)
insert into public.inventarios (feito_em, itens)
select now(), (
  select coalesce(jsonb_agg(jsonb_build_object(
           'produto_id', id, 'nome', nome, 'sistema', estoque, 'contado', estoque)), '[]')
  from public.produtos
)
where not exists (select 1 from public.inventarios);

select categoria, nome, preco, estoque from public.produtos order by categoria, preco;
