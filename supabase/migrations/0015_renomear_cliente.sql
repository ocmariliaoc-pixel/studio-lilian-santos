-- Corrigir o nome de uma cliente (qualquer usuária ativa). Rodar DEPOIS da 0014. Pode ser rodada de novo.
-- O nome também fica gravado em cada venda (lancamentos.cliente_nome); a função troca lá também,
-- inclusive nas vendas lançadas por outra pessoa (por isso security definer).
create or replace function public.renomear_cliente(p_id uuid, p_nome text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  novo text := regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g');
begin
  if not public.is_usuaria_ativa() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  if length(novo) < 2 then
    raise exception 'Escreva o nome da cliente.';
  end if;
  if exists (select 1 from public.clientes where lower(trim(nome)) = lower(novo) and id <> p_id) then
    raise exception 'Já existe uma cliente com o nome "%". Se for a mesma pessoa, use "Juntar" em Clientes.', novo;
  end if;

  update public.clientes set nome = novo where id = p_id;
  if not found then
    raise exception 'Cliente não encontrada.';
  end if;
  update public.lancamentos set cliente_nome = novo where cliente_id = p_id;
  return novo;
end $$;

revoke all on function public.renomear_cliente(uuid, text) from public, anon;
grant execute on function public.renomear_cliente(uuid, text) to authenticated;
