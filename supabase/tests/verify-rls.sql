-- Teste de integração: dados fictícios existem só nesta transação e são revertidos.
begin;
select set_config('suquinhos.test_user', gen_random_uuid()::text, true);
select set_config('suquinhos.test_cycle', gen_random_uuid()::text, true);
select set_config('suquinhos.test_order', gen_random_uuid()::text, true);
insert into auth.users(id, aud, role, email, created_at, updated_at)
values (current_setting('suquinhos.test_user')::uuid, 'authenticated', 'authenticated', 'rls-' || current_setting('suquinhos.test_user') || '@example.invalid', now(), now());
insert into public.family_members(user_id, display_name, role)
values (current_setting('suquinhos.test_user')::uuid, 'Teste temporário RLS', 'operator');
insert into public.delivery_cycles(id, delivery_date, closes_at)
values (current_setting('suquinhos.test_cycle')::uuid, current_date + 123456, ((current_date + 123453)::timestamp + interval '18 hours') at time zone 'America/Sao_Paulo');
insert into public.orders(id, reference, cycle_id, customer_name, customer_phone, payment_status, total_cents)
values (current_setting('suquinhos.test_order')::uuid, 'TEST-' || current_setting('suquinhos.test_order'), current_setting('suquinhos.test_cycle')::uuid, 'Cliente fictício', '11999999999', 'review', 3600);
insert into public.order_items(order_id, product_id, product_name, quantity, unit_price_cents)
values (current_setting('suquinhos.test_order')::uuid, 'laranja', 'Laranja', 3, 1200);
insert into public.cash_entries(cycle_id, kind, direction, amount_cents, description, created_by)
values (current_setting('suquinhos.test_cycle')::uuid, 'expense', 'out', 100, 'Teste temporário', current_setting('suquinhos.test_user')::uuid);
insert into public.payment_receipts(order_id, storage_path, mime_type, size_bytes)
values (current_setting('suquinhos.test_order')::uuid, 'test/' || current_setting('suquinhos.test_order') || '.png', 'image/png', 100);

do $$ begin
  if not exists (select 1 from storage.buckets where id = 'pix-receipts' and public = false and file_size_limit = 5242880) then raise exception 'Bucket privado inválido'; end if;
end $$;
set local role anon;
do $$ begin
  if (select count(*) from public.products) <> 3 then raise exception 'Catálogo público inválido'; end if;
  if has_table_privilege(current_user, 'public.orders', 'SELECT') then raise exception 'Visitante tem privilégio de leitura de pedidos'; end if;
  if has_table_privilege(current_user, 'public.cash_entries', 'SELECT') then raise exception 'Visitante tem privilégio de leitura de caixa'; end if;
  if has_table_privilege(current_user, 'public.payment_receipts', 'SELECT') then raise exception 'Visitante tem acesso a comprovantes'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.orders) <> 0 then raise exception 'Usuário sem associação leu pedidos'; end if;
  if (select count(*) from public.cash_entries) <> 0 then raise exception 'Usuário sem associação leu caixa'; end if;
  if (select count(*) from public.payment_receipts) <> 0 then raise exception 'Usuário sem associação leu comprovantes'; end if;
  if has_table_privilege(current_user, 'public.family_members', 'INSERT') then raise exception 'Usuário pode se promover'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', current_setting('suquinhos.test_user'), true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.orders where id = current_setting('suquinhos.test_order')::uuid) <> 1 then raise exception 'Familiar não vê pedido'; end if;
  if (select count(*) from public.order_items where order_id = current_setting('suquinhos.test_order')::uuid) <> 1 then raise exception 'Familiar não vê itens'; end if;
  if (select count(*) from public.cash_entries where cycle_id = current_setting('suquinhos.test_cycle')::uuid) <> 1 then raise exception 'Familiar não vê caixa'; end if;
  if (select count(*) from public.payment_receipts where order_id = current_setting('suquinhos.test_order')::uuid) <> 1 then raise exception 'Familiar não vê comprovante'; end if;
  if has_table_privilege(current_user, 'public.cash_entries', 'INSERT') or has_table_privilege(current_user, 'public.orders', 'UPDATE') then raise exception 'Etapa de consulta permite mutações'; end if;
end $$;
reset role;
update public.family_members set active = false where user_id = current_setting('suquinhos.test_user')::uuid;
set local role authenticated;
do $$ begin
  if (select count(*) from public.orders) <> 0 then raise exception 'Familiar revogado ainda vê pedidos'; end if;
  if (select count(*) from public.cash_entries) <> 0 then raise exception 'Familiar revogado ainda vê caixa'; end if;
end $$;
reset role;
rollback;
select 'Testes RLS passaram; todos os dados fictícios foram revertidos.' as result;
