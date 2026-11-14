-- A Lilian decide quando aceitar duas clientes no mesmo horário: o sistema só avisa (em vermelho)
-- e não trava mais. Rodar DEPOIS da 0015. Pode ser rodada de novo.
alter table public.agendamentos drop constraint if exists agendamentos_sem_conflito;
