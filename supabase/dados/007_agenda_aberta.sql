-- Agenda aberta todos os dias (pedido em 10/11/2026): sem dia fechado e sem pausa fixa.
-- Para fechar um dia ou turno, use o botão "Fechar horário" na Agenda.
-- Horário amplo (08:00 às 20:00) para caber os atendimentos já marcados (ex.: 08:00 e 18:00).
update public.horarios_funcionamento
   set aberto = true, abre = '08:00', fecha = '20:00', pausa_inicio = null, pausa_fim = null;

select dia_semana, aberto, abre, fecha from public.horarios_funcionamento order by dia_semana;
