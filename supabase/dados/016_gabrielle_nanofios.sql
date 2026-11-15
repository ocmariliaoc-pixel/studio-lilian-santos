-- O repasse de cartão "a identificar" de 09/11 (R$ 733,59 líquidos) é o nanofios da Gabrielle Schoene.
-- Vira a venda dela: descrição "Nanofios" (o valor bruto estimado continua, para bater com o banco).
-- Pode rodar de novo.
update public.lancamentos l
   set descricao = 'Nanofios',
       categoria = 'Serviço',
       cliente_id = c.id,
       cliente_nome = c.nome
  from public.clientes c
 where lower(c.nome) = 'gabrielle schoene'
   and l.descricao like 'Vendas no cartão — a identificar (repasse Ton de 09/11%';

-- A mensagem de 3 dias depois já passou: fica como enviada (as de feedback/retorno/6 meses seguem normais)
insert into public.acompanhamentos_feitos (cliente_id, regra, referencia)
select a.cliente_id, a.regra, a.atendido_em
  from public.acompanhamentos a
 where lower(a.cliente_nome) = 'gabrielle schoene' and a.regra = 'micro_3d'
on conflict do nothing;

-- Conferência
select l.data, l.descricao, l.cliente_nome, l.categoria, l.valor as bruto, l.valor_liquido as liquido,
       l.forma_pagamento
  from public.lancamentos l
 where lower(l.cliente_nome) = 'gabrielle schoene'
 order by l.data;
