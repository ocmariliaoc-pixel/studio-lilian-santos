-- Contas fixas do studio (informadas em 09/11/2026). Rodar DEPOIS da migração 0012. Pode rodar de novo.
insert into public.contas_fixas (nome, categoria, valor, dias) values
  ('Aluguel',          'Aluguel',       1750.00, '{5}'),
  ('Luz',              'Energia/Água',   400.00, '{10}'),
  ('Lilian (quinzena)', 'Pessoas',      1000.00, '{15,30}'),
  ('Jocélia',          'Pessoas',        650.00, '{30}'),
  ('Internet',         'Outros',          79.90, '{5}'),
  ('IPTU',             'Impostos',        23.36, '{5}'),
  ('DAS (MEI)',        'Impostos',        87.05, '{20}')
on conflict (nome) do update set
  categoria = excluded.categoria, valor = excluded.valor, dias = excluded.dias, ativo = true;

select nome, valor, dias from public.contas_fixas order by nome;
