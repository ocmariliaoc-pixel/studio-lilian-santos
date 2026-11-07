-- Taxas da maquininha Ton — plano "Black -20k" (quem vende abaixo de R$ 20 mil/mês).
-- Rodar DEPOIS da migração 0002. Pode ser rodado de novo.
-- O sistema guarda até 12x; a Ton vai até 18x (13x a 18x ficam de fora).
-- Pix e dinheiro: 0% (a tabela da Ton não mostra Pix; ajuste se houver taxa).

update public.taxas_pagamento t set taxa_percentual = v.taxa, ativo = true
from (values
  ('pix',               1,  0.00),
  ('dinheiro',          1,  0.00),
  ('debito',            1,  1.36),
  ('credito_vista',     1,  3.14),
  ('credito_parcelado', 2,  5.38),
  ('credito_parcelado', 3,  6.11),
  ('credito_parcelado', 4,  6.84),
  ('credito_parcelado', 5,  7.56),
  ('credito_parcelado', 6,  8.27),
  ('credito_parcelado', 7,  8.98),
  ('credito_parcelado', 8,  9.68),
  ('credito_parcelado', 9, 10.37),
  ('credito_parcelado', 10, 11.05),
  ('credito_parcelado', 11, 11.73),
  ('credito_parcelado', 12, 12.39)
) as v(forma, parcelas, taxa)
where t.forma = v.forma::public.forma_pagamento and t.parcelas = v.parcelas;

select forma, parcelas, taxa_percentual, ativo from public.taxas_pagamento order by forma, parcelas;
