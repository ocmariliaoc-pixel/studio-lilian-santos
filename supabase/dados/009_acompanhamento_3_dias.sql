-- Mensagem de cuidado 3 dias depois da limpeza de pele e da micropigmentação (sobrancelha e boca).
-- Rodar DEPOIS da migração 0010 (e do 006). Pode rodar de novo: atualiza os textos.
insert into public.regras_acompanhamento (id, nome, dias_mensagem, dias_retorno, termos, categoria, mensagem, ordem) values
  ('pele_3d', 'Pele: como está (3 dias)', 3, null,
     array['Limpeza de pele'], null,
     'Oi, {nome}! Tudo bem? Passando para saber como está a sua pele depois da limpeza ✨ Ficou alguma dúvida sobre os cuidados em casa? É só me chamar 💛', 0),
  ('micro_3d', 'Micro: como está (3 dias)', 3, null,
     array['Nanofios', 'Shadow', 'Revitalização labial', 'Efeito batom', 'Neutralização labial'], null,
     'Oi, {nome}! Tudo bem? Como está a sua micropigmentação nesses primeiros dias? 😊 É normal casquinha e um pouco de descamação. Ficou alguma dúvida sobre os cuidados? É só me chamar 💛', 0)
on conflict (id) do update set
  nome = excluded.nome, dias_mensagem = excluded.dias_mensagem, dias_retorno = excluded.dias_retorno,
  termos = excluded.termos, categoria = excluded.categoria, mensagem = excluded.mensagem, ordem = excluded.ordem;

-- Atendimentos antigos (mais de 7 dias): não faz sentido perguntar agora; ficam como já enviados,
-- para não encher o Início de mensagens atrasadas.
insert into public.acompanhamentos_feitos (cliente_id, regra, referencia)
select cliente_id, regra, atendido_em
  from public.acompanhamentos
 where regra in ('pele_3d', 'micro_3d') and atendido_em < current_date - 7
on conflict do nothing;

select regra, cliente_nome, atendido_em, mensagem_em, mensagem_enviada
  from public.acompanhamentos where regra in ('pele_3d', 'micro_3d') order by mensagem_em desc;
