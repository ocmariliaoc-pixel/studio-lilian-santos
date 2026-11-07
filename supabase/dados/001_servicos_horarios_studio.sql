-- Dados iniciais do Studio Lilian Santos (rodar DEPOIS da migração 0002).
-- Pode ser rodado de novo: não duplica serviços (compara pelo nome).
-- Durações marcadas com "estimada" e retornos marcados com "sugerido" não vieram
-- da lista do studio: confira e ajuste em Configurações → Serviços.

insert into public.servicos (nome, categoria, duracao_min, preco, retorno_dias, ativo)
select v.nome, v.categoria, v.duracao_min, v.preco, v.retorno_dias, v.ativo
from (values
  -- Sobrancelha (volume)
  ('Design personalizado',                 'Sobrancelha',                   30,  55.00,  20, true),  -- duração estimada
  ('Design personalizado com henna',       'Sobrancelha',                   45,  65.00,  20, true),  -- duração estimada
  ('Design personalizado com coloração',   'Sobrancelha',                   45,  65.00,  20, true),  -- duração estimada
  ('Brow Lamination',                      'Sobrancelha',                   60, 110.00,  45, true),  -- 1ª→2ª: 60 dias; manutenção: 45
  -- Cílios
  ('Lash Lifting',                         'Cílios',                        60,  80.00,  45, true),  -- 1ª→2ª: 60 dias; manutenção: 45
  -- Depilação (volume)
  ('Epilação de buço',                     'Depilação',                     15,  15.00,  20, true),  -- duração estimada, retorno sugerido
  -- Micropigmentação de sobrancelhas
  ('Nanofios',                             'Micropigmentação · Sobrancelha', 120, 450.00, 30, true), -- duração estimada, retorno = retoque (sugerido)
  ('Shadow',                               'Micropigmentação · Sobrancelha', 120, 450.00, 30, true), -- idem
  ('Shadowline',                           'Micropigmentação · Sobrancelha', 120, 450.00, 30, true), -- idem
  -- Micropigmentação labial
  ('Revitalização labial',                 'Micropigmentação · Lábios',     120, 400.00, 30, true),  -- idem
  ('Efeito batom',                         'Micropigmentação · Lábios',     120, 400.00, 30, true),  -- idem
  ('Neutralização labial',                 'Micropigmentação · Lábios',     120, 400.00, 30, true),  -- idem
  -- Pele
  ('Limpeza de pele',                      'Pele',                          90, 120.00,  30, true),  -- duração estimada
  ('Dermaplaning',                         'Pele',                          60, 150.00,  30, true),  -- duração estimada, retorno sugerido
  -- Médio prazo: SEM PREÇO na lista → entram desativados até a Ana definir o valor
  ('Reconstrução — Protocolo LS (sessão)', 'Pele',                          60,   0.00,  15, false), -- pacote de 3 sessões (Fase 5)
  ('Microagulhamento',                     'Pele',                          90,   0.00,  30, false)
) as v(nome, categoria, duracao_min, preco, retorno_dias, ativo)
where not exists (
  select 1 from public.servicos s where lower(s.nome) = lower(v.nome)
);

-- Horário: segunda a sábado na divulgação, mas na prática NÃO abre terça e sexta.
-- A agenda interna segue a prática (seg, qua, qui, sáb). Horário estimado (8h/dia,
-- conforme a planilha de custos): 09:00–18:00 com almoço 12:00–13:00.
update public.horarios_funcionamento set
  aberto       = dia_semana in (1, 3, 4, 6),
  abre         = '09:00',
  fecha        = '18:00',
  pausa_inicio = case when dia_semana in (1, 3, 4, 6) then '12:00'::time end,
  pausa_fim    = case when dia_semana in (1, 3, 4, 6) then '13:00'::time end;

-- Conferência
select categoria, nome, duracao_min as minutos, preco, retorno_dias, ativo
from public.servicos order by categoria, nome;
