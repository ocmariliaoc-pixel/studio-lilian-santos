-- Regras de pós-atendimento definidas pelo studio (10/11/2026). Rodar DEPOIS da migração 0010.
-- Pode rodar de novo: atualiza os textos e prazos.
insert into public.regras_acompanhamento (id, nome, dias_mensagem, dias_retorno, termos, categoria, mensagem, ordem) values
  ('design', 'Design: marcar retorno', 15, 20,
     array['Design personalizado'], null,
     'Oi, {nome}! Tudo bem? Já faz 15 dias do seu design de sobrancelha 💛 O retorno ideal é no dia {retorno}. Quer que eu já reserve o seu horário?', 1),
  ('micro_feedback', 'Micro: feedback e retorno', 20, 40,
     array['Nanofios', 'Shadow', 'Revitalização labial', 'Efeito batom', 'Neutralização labial'], null,
     'Oi, {nome}! Passando para saber como está a sua micropigmentação 😊 Está gostando do resultado? Me conta! O seu retorno fica ideal a partir do dia {retorno}. Posso já deixar agendado?', 2),
  ('nanofios_6m', 'Nanofios: convite após 6 meses', 180, 180,
     array['Nanofios'], null,
     'Oi, {nome}! Já faz 6 meses dos seus nanofios ✨ Que tal renovar e manter as sobrancelhas sempre lindas? Tenho horários a partir do dia {retorno}. Vamos marcar?', 3),
  ('pele', 'Pele: manter 1 vez por mês', 25, 30,
     array['Limpeza de pele', 'Dermaplaning'], null,
     'Oi, {nome}! Já faz quase um mês da sua {servico} ✨ Para manter a pele bonita, o ideal é 1 vez por mês. Vamos marcar a próxima? Que tal a partir do dia {retorno}?', 4),
  ('curso', 'Curso: relacionamento', 30, null,
     '{}', 'Curso',
     'Oi, {nome}! Tudo bem? Já faz um mês do seu curso aqui no Studio Lilian Santos 💛 Como estão os seus atendimentos? Se precisar de qualquer ajuda, conte com a gente!', 5)
on conflict (id) do update set
  nome = excluded.nome, dias_mensagem = excluded.dias_mensagem, dias_retorno = excluded.dias_retorno,
  termos = excluded.termos, categoria = excluded.categoria, mensagem = excluded.mensagem, ordem = excluded.ordem;

select id, dias_mensagem as mensagem_apos, dias_retorno as retorno_apos from public.regras_acompanhamento order by ordem;
