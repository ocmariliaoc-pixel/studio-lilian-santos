-- Durações médias informadas pelo studio (definem o tamanho dos horários na agenda).
-- Rodar DEPOIS do 001. Pode ser rodado de novo.
update public.servicos s set duracao_min = v.minutos
from (values
  ('Design personalizado',            30),
  ('Design personalizado com henna',  45),
  ('Nanofios',                        90),
  ('Shadow',                          90),
  ('Shadowline',                      90),
  ('Revitalização labial',            90),  -- "micropigmentação 1,5 h": confirmar se vale para os lábios
  ('Efeito batom',                    90),  -- idem
  ('Neutralização labial',            90),  -- idem
  ('Limpeza de pele',                 90),
  ('Dermaplaning',                    90),
  ('Spa labial',                       5),
  ('Epilação de buço',                 5)
) as v(nome, minutos)
where lower(s.nome) = lower(v.nome);

-- Ainda estimados (não informados): coloração 45, brow lamination 60, lash lifting 60,
-- protocolo LS 60, microagulhamento 90.
select categoria, nome, duracao_min from public.servicos where ativo order by categoria, nome;
