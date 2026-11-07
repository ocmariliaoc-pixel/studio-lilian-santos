-- Cursos (preço à vista; no cartão a cliente paga a taxa da maquininha) e ajuste de estoque.
-- Cursos não têm estoque: dependem da disponibilidade da agenda (duração em dias).
-- Rodar DEPOIS da migração 0005. Pode ser rodado de novo.
insert into public.produtos (nome, categoria, preco, estoque, controla_estoque, duracao_dias)
select v.nome, 'Cursos', v.preco, 0, false, v.dias
from (values
  ('Curso de design de sobrancelha',                  850.00, 2.0),
  ('Curso de brow lamination',                        599.00, 0.5),
  ('Curso de dermaplaning',                           850.00, null),  -- duração não informada
  ('Curso de micropigmentação (3 técnicas)',         1999.00, 3.0),
  ('Curso de micropigmentação nanofios (1 técnica)', 1500.00, 3.0)   -- confirmar: mesma duração?
) as v(nome, preco, dias)
where not exists (select 1 from public.produtos p where lower(p.nome) = lower(v.nome));

-- Garante a duração mesmo se os cursos já tinham sido cadastrados antes
update public.produtos p set duracao_dias = v.dias
from (values
  ('Curso de design de sobrancelha', 2.0),
  ('Curso de brow lamination', 0.5),
  ('Curso de micropigmentação (3 técnicas)', 3.0),
  ('Curso de micropigmentação nanofios (1 técnica)', 3.0)
) as v(nome, dias)
where lower(p.nome) = lower(v.nome) and p.duracao_dias is null;

-- Fluido finalizador FPS 50: 2 unidades
update public.produtos set estoque = 2
 where nome = 'Fluido finalizador FPS 50 — Extratos da Terra' and estoque = 0;

select categoria, nome, preco, estoque, controla_estoque, duracao_dias from public.produtos order by categoria, preco;
