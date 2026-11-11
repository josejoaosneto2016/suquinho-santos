-- Todos os dados e movimentos fictícios deste teste são revertidos.
begin;
do $$
declare actor uuid; cycle jsonb; result jsonb; repeated jsonb; created_id uuid;
  receipt uuid; key uuid:=gen_random_uuid(); day date:=date '2099-01-01'; i integer;
  items jsonb:='[{"product_id":"laranja","quantity":2}]'; limiter text:='test-'||gen_random_uuid()::text;
begin
  select user_id into actor from public.family_members where active limit 1;
  if actor is null then raise exception 'É preciso um familiar ativo para o teste.'; end if;
  day:=day+((8-extract(isodow from day)::integer)%7);
  update public.delivery_cycles set status='closed' where status='open';
  cycle:=public.manage_cycle(actor,null,day,'open');
  result:=public.create_checkout_order(key,repeat('a',64),repeat('b',64),(cycle->>'id')::uuid,
    'Teste temporário','+5511999999999','Teste sem pagamento real',items,2400,'teste@example.invalid','Recebedor fictício',500);
  created_id:=(result->>'id')::uuid;
  repeated:=public.create_checkout_order(key,repeat('a',64),repeat('b',64),(cycle->>'id')::uuid,
    'Teste temporário','+5511999999999','Teste sem pagamento real',items,2400,'teste@example.invalid','Recebedor fictício',500);
  if repeated->>'id'<>result->>'id' then raise exception 'Reenvio duplicou pedido'; end if;
  if (select count(*) from public.orders where id=created_id)<>1 or
     (select quantity from public.order_items where order_id=created_id)<>2 then raise exception 'Itens ou pedido incorretos'; end if;
  begin
    perform public.create_checkout_order(key,repeat('c',64),repeat('b',64),(cycle->>'id')::uuid,
      'Teste temporário','+5511999999999','',items,2400,'teste@example.invalid','Recebedor fictício',500);
    raise exception 'Hash diferente foi aceito';
  exception when others then if sqlerrm<>'IDEMPOTENCY_CONFLICT' then raise; end if; end;
  begin
    perform public.create_checkout_order(gen_random_uuid(),repeat('a',64),repeat('b',64),(cycle->>'id')::uuid,
      'Teste temporário','+5511999999999','',items,1,'teste@example.invalid','Recebedor fictício',500);
    raise exception 'Preço adulterado foi aceito';
  exception when others then if sqlerrm<>'PRICE_CHANGED' then raise; end if; end;
  begin
    perform public.confirm_pix_payment(actor,created_id);
    raise exception 'Pagamento foi confirmado sem comprovante';
  exception when others then if sqlerrm<>'RECEIPT_REQUIRED' then raise; end if; end;
  if exists(select 1 from public.cash_entries where order_id=created_id) then raise exception 'Pedido pendente gerou entrada'; end if;
  receipt:=public.reserve_receipt(created_id,created_id::text||'/fixture.png','image/png',100);
  perform public.complete_receipt(created_id,receipt,repeat('d',64));
  perform public.complete_receipt(created_id,receipt,repeat('d',64));
  if (select payment_status from public.orders where id=created_id)<>'review' then raise exception 'Comprovante não entrou em conferência'; end if;
  if exists(select 1 from public.cash_entries where order_id=created_id) then raise exception 'Comprovante foi contado como dinheiro'; end if;
  begin
    perform public.confirm_pix_payment(gen_random_uuid(),created_id);
    raise exception 'Não membro confirmou pagamento';
  exception when others then if sqlerrm<>'ACCESS_DENIED' then raise; end if; end;
  perform public.confirm_pix_payment(actor,created_id);
  perform public.confirm_pix_payment(actor,created_id);
  if (select count(*) from public.cash_entries where order_id=created_id)<>1 or
    (select amount_cents from public.cash_entries where order_id=created_id)<>2400 then raise exception 'Confirmação duplicou ou alterou o caixa'; end if;
  if (select status from public.orders where id=created_id)<>'confirmed' then raise exception 'Pedido não confirmado'; end if;
  begin
    perform public.set_order_status(actor,created_id,'cancelled');
    raise exception 'Pedido pago foi cancelado sem reembolso';
  exception when others then if sqlerrm<>'INVALID_TRANSITION' then raise; end if; end;
  perform public.set_order_status(actor,created_id,'production');
  perform public.set_order_status(actor,created_id,'delivered');
  update public.delivery_cycles set closes_at=clock_timestamp()-interval '1 second' where id=(cycle->>'id')::uuid;
  begin
    perform public.create_checkout_order(gen_random_uuid(),repeat('a',64),repeat('b',64),(cycle->>'id')::uuid,
      'Teste temporário','+5511999999999','',items,2400,'teste@example.invalid','Recebedor fictício',500);
    raise exception 'Rodada encerrada aceitou pedido';
  exception when others then if sqlerrm<>'CYCLE_CLOSED' then raise; end if; end;
  for i in 1..15 loop
    if not public.checkout_limit(limiter) then raise exception 'Limite prematuro'; end if;
  end loop;
  if public.checkout_limit(limiter) then raise exception 'Limite de tentativas falhou'; end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('checkout_limit','create_checkout_order','reserve_receipt','complete_receipt','manage_cycle','confirm_pix_payment','set_order_status')
    and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE')))
    then raise exception 'Função do backend exposta ao cliente'; end if;
end $$;
rollback;
select 'Checkout, comprovante, fechamento, autorização e Pix idempotente passaram. Dados de teste revertidos.' as result;
