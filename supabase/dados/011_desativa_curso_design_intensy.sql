-- Os cursos agora aparecem direto no agendamento (seção Cursos): o serviço provisório
-- "Curso Design Intensy" (R$ 0,01) não é mais necessário. Desativa (não apaga o histórico). Pode rodar de novo.
update public.servicos set ativo = false where nome ilike 'curso design intens%' and ativo;

select nome, preco, ativo from public.servicos where nome ilike '%curso%';
