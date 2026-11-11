-- 1) A profissional (Lilian) também cadastra serviços novos (editar preço continua só com a admin).
-- 2) Juntar cadastros repetidos da mesma cliente (ex.: "Jade" e "Jade Lima").
-- Rodar DEPOIS da 0013. Pode ser rodada de novo.

drop policy if exists "servicos: admin cadastra" on public.servicos;
drop policy if exists "servicos: usuárias ativas cadastram" on public.servicos;
create policy "servicos: usuárias ativas cadastram"
  on public.servicos for insert to authenticated
  with check (public.is_usuaria_ativa());
grant insert on public.servicos to authenticated;

-- ---------------------------------------------------------------------------
-- juntar_clientes(fica, sai): passa tudo de "sai" para "fica" e apaga o cadastro repetido.
--   vendas, agendamentos, cupons, mensagens enviadas, tarefas e indicações vão para "fica";
--   dados vazios de "fica" (WhatsApp, Instagram, nascimento…) são completados com os de "sai".
-- ---------------------------------------------------------------------------
create or replace function public.juntar_clientes(p_fica uuid, p_sai uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.clientes;
begin
  if not public.is_usuaria_ativa() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  if p_fica = p_sai then
    raise exception 'Escolha dois cadastros diferentes.';
  end if;
  select * into s from public.clientes where id = p_sai;
  if not found or not exists (select 1 from public.clientes where id = p_fica) then
    raise exception 'Cliente não encontrada.';
  end if;

  update public.lancamentos set cliente_id = p_fica,
         cliente_nome = (select nome from public.clientes where id = p_fica)
   where cliente_id = p_sai;
  update public.agendamentos set cliente_id = p_fica where cliente_id = p_sai;
  update public.cupons set cliente_id = p_fica where cliente_id = p_sai;
  update public.clientes set indicada_por = p_fica where indicada_por = p_sai;
  if to_regclass('public.tarefas') is not null then
    execute 'update public.tarefas set cliente_id = $1 where cliente_id = $2' using p_fica, p_sai;
  end if;
  -- mensagens já enviadas: mantém as que não repetem
  insert into public.acompanhamentos_feitos (cliente_id, regra, referencia, feito_em, feito_por)
  select p_fica, regra, referencia, feito_em, feito_por from public.acompanhamentos_feitos where cliente_id = p_sai
  on conflict do nothing;
  delete from public.acompanhamentos_feitos where cliente_id = p_sai;

  update public.clientes f set
    whatsapp        = coalesce(f.whatsapp, s.whatsapp),
    instagram       = coalesce(f.instagram, s.instagram),
    email           = coalesce(f.email, s.email),
    data_nascimento = coalesce(f.data_nascimento, s.data_nascimento),
    origem          = coalesce(f.origem, s.origem),
    observacoes     = case when s.observacoes is null then f.observacoes
                           when f.observacoes is null then s.observacoes
                           else f.observacoes || E'\n' || s.observacoes end,
    -- ativa vence lead (já foi atendida em algum dos dois cadastros)
    status          = case when f.status = 'lead' and s.status <> 'lead' then s.status else f.status end,
    criado_em       = least(f.criado_em, s.criado_em)
  where f.id = p_fica;

  delete from public.clientes where id = p_sai;
end $$;

revoke all on function public.juntar_clientes(uuid, uuid) from public, anon;
grant execute on function public.juntar_clientes(uuid, uuid) to authenticated;
