-- Operações atômicas chamadas somente pelo backend, após validação de acesso.
alter table public.orders
  add column idempotency_key uuid unique,
  add column request_hash text,
  add column upload_token_hash text,
  add column receipt_expires_at timestamptz,
  add column delivery_notes text not null default '',
  add column pix_key text,
  add column pix_receiver text,
  add column bottle_ml integer,
  add column receipt_late boolean not null default false;
alter table public.payment_receipts add column content_sha256 text;
alter table public.cash_entries add column idempotency_key uuid unique;
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  event text not null,
  order_id uuid references public.orders(id),
  created_at timestamptz not null default now()
);
alter table public.audit_events enable row level security;
revoke all on public.audit_events from public, anon, authenticated;
grant select on public.audit_events to authenticated;
create policy family_audit on public.audit_events for select to authenticated
  using (exists (select 1 from public.family_members where user_id = (select auth.uid()) and active));
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.checkout_limits (
  key_hash text not null,
  window_start timestamptz not null,
  attempts integer not null,
  primary key(key_hash, window_start)
);
alter table private.checkout_limits enable row level security;
grant usage on schema public, private to service_role;
grant select, insert, update, delete on public.family_members, public.products, public.delivery_cycles,
  public.orders, public.order_items, public.cash_entries, public.payment_receipts, public.audit_events,
  private.checkout_limits to service_role;

create function public.checkout_limit(p_key text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare amount integer; bucket timestamptz := date_trunc('minute', clock_timestamp());
begin
  delete from private.checkout_limits where window_start < clock_timestamp() - interval '1 day';
  insert into private.checkout_limits values (p_key, bucket, 1)
  on conflict (key_hash, window_start) do update set attempts = private.checkout_limits.attempts + 1
  returning attempts into amount;
  return amount <= 15;
end $$;

create function public.create_checkout_order(
  p_key uuid, p_hash text, p_token_hash text, p_cycle uuid,
  p_name text, p_phone text, p_notes text, p_items jsonb, p_expected integer,
  p_pix_key text, p_pix_receiver text, p_bottle integer
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare o public.orders%rowtype; c public.delivery_cycles%rowtype;
  item jsonb; product public.products%rowtype; amount integer := 0; qty integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_key::text, 0));
  select * into o from public.orders where idempotency_key = p_key;
  if found then
    if o.request_hash <> p_hash then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  else
    select * into c from public.delivery_cycles where id = p_cycle for update;
    if not found or c.status <> 'open' or clock_timestamp() >= c.closes_at then raise exception 'CYCLE_CLOSED'; end if;
    if length(trim(p_name)) not between 2 and 100 or p_phone !~ '^\+55[0-9]{10,11}$'
      or length(p_notes) > 500 or p_bottle <> 500 or length(p_pix_key) < 3 or length(p_pix_receiver) < 3
      or length(p_hash) <> 64 or length(p_token_hash) <> 64 then raise exception 'VALIDATION_ERROR'; end if;
    if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 3 then raise exception 'VALIDATION_ERROR'; end if;
    if (select count(distinct v->>'product_id') from jsonb_array_elements(p_items) v) <> jsonb_array_length(p_items) then raise exception 'VALIDATION_ERROR'; end if;
    for item in select value from jsonb_array_elements(p_items) loop
      if jsonb_typeof(item->'quantity') <> 'number' or (item->>'quantity') !~ '^[0-9]{1,2}$' then raise exception 'VALIDATION_ERROR'; end if;
      qty := (item->>'quantity')::integer;
      if qty not between 1 and 99 then raise exception 'VALIDATION_ERROR'; end if;
      select * into product from public.products where id = item->>'product_id' and active for share;
      if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
      amount := amount + qty * product.price_cents;
    end loop;
    if amount <> p_expected then raise exception 'PRICE_CHANGED'; end if;
    insert into public.orders(reference,cycle_id,customer_name,customer_phone,total_cents,
      idempotency_key,request_hash,upload_token_hash,receipt_expires_at,delivery_notes,pix_key,pix_receiver,bottle_ml)
    values ('SQ-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)), p_cycle,trim(p_name),p_phone,amount,
      p_key,p_hash,p_token_hash,c.closes_at + interval '24 hours',p_notes,p_pix_key,p_pix_receiver,p_bottle)
    returning * into o;
    insert into public.order_items(order_id,product_id,product_name,quantity,unit_price_cents)
      select o.id,p.id,p.name,(v->>'quantity')::integer,p.price_cents
      from jsonb_array_elements(p_items) v join public.products p on p.id = v->>'product_id';
    insert into public.audit_events(event,order_id) values ('order_created',o.id);
  end if;
  select * into c from public.delivery_cycles where id = o.cycle_id;
  return jsonb_build_object('id',o.id,'reference',o.reference,'total_cents',o.total_cents,
    'status',o.status,'payment_status',o.payment_status,'delivery_date',c.delivery_date,
    'closes_at',c.closes_at,'receipt_expires_at',o.receipt_expires_at,
    'pix_key',o.pix_key,'pix_receiver',o.pix_receiver,'bottle_ml',o.bottle_ml);
end $$;

create function public.reserve_receipt(p_order uuid,p_path text,p_mime text,p_size integer) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare o public.orders%rowtype; result uuid;
begin
  select * into o from public.orders where id=p_order for update;
  if not found or o.status='cancelled' or o.payment_status in ('paid','refunded') then raise exception 'ORDER_LOCKED'; end if;
  if clock_timestamp() > o.receipt_expires_at then raise exception 'UPLOAD_EXPIRED'; end if;
  if p_size not between 1 and 5242880 or p_mime not in ('image/jpeg','image/png','application/pdf')
    or p_path not like p_order::text || '/%' or length(p_path)>150 then raise exception 'INVALID_FILE'; end if;
  if (select count(*) from public.payment_receipts where order_id=p_order) >= 5 then raise exception 'UPLOAD_LIMIT'; end if;
  insert into public.payment_receipts(order_id,storage_path,mime_type,size_bytes)
  values(p_order,p_path,p_mime,p_size) returning id into result;
  return result;
end $$;

create function public.complete_receipt(p_order uuid,p_receipt uuid,p_sha text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare o public.orders%rowtype; r public.payment_receipts%rowtype; deadline timestamptz;
begin
  select * into o from public.orders where id=p_order for update;
  select * into r from public.payment_receipts where id=p_receipt and order_id=p_order for update;
  if not found then raise exception 'INVALID_FILE'; end if;
  if r.validation_status='valid' then return jsonb_build_object('received',true,'reference',o.reference); end if;
  if o.status='cancelled' or o.payment_status in ('paid','refunded') then raise exception 'ORDER_LOCKED'; end if;
  if clock_timestamp()>o.receipt_expires_at then raise exception 'UPLOAD_EXPIRED'; end if;
  if r.validation_status<>'pending' or p_sha !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_FILE'; end if;
  select closes_at into deadline from public.delivery_cycles where id=o.cycle_id;
  update public.payment_receipts set validation_status='valid',content_sha256=p_sha where id=p_receipt;
  update public.orders set payment_status='review',receipt_late=(clock_timestamp()>deadline) where id=p_order;
  insert into public.audit_events(event,order_id) values ('receipt_received',p_order);
  return jsonb_build_object('received',true,'reference',o.reference,'late',clock_timestamp()>deadline);
end $$;

create function public.manage_cycle(p_actor uuid,p_id uuid,p_date date,p_status text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare c public.delivery_cycles%rowtype;
begin
  if not exists(select 1 from public.family_members where user_id=p_actor and active) then raise exception 'ACCESS_DENIED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('suquinhos-cycles',0));
  if p_status not in ('draft','open','closed') then raise exception 'VALIDATION_ERROR'; end if;
  if p_id is null then
    if extract(isodow from p_date)<>1 or p_date <= (clock_timestamp() at time zone 'America/Sao_Paulo')::date then raise exception 'INVALID_DELIVERY_DATE'; end if;
    select * into c from public.delivery_cycles where delivery_date=p_date;
    if found then return to_jsonb(c); end if;
    insert into public.delivery_cycles(delivery_date,closes_at,status)
    values(p_date,((p_date-3)::timestamp + interval '18 hours') at time zone 'America/Sao_Paulo','draft') returning * into c;
  else
    select * into c from public.delivery_cycles where id=p_id for update;
    if not found then raise exception 'CYCLE_CLOSED'; end if;
  end if;
  if p_status='open' then
    if clock_timestamp()>=c.closes_at then raise exception 'CYCLE_CLOSED'; end if;
    update public.delivery_cycles set status='closed' where status='open' and closes_at<=clock_timestamp();
    if exists(select 1 from public.delivery_cycles where status='open' and id<>c.id) then raise exception 'ANOTHER_CYCLE_OPEN'; end if;
  end if;
  update public.delivery_cycles set status=p_status where id=c.id returning * into c;
  insert into public.audit_events(actor_id,event) values(p_actor,'cycle_'||p_status);
  return to_jsonb(c);
end $$;

create function public.confirm_pix_payment(p_actor uuid,p_order uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare o public.orders%rowtype;
begin
  if not exists(select 1 from public.family_members where user_id=p_actor and active) then raise exception 'ACCESS_DENIED'; end if;
  select * into o from public.orders where id=p_order for update;
  if not found or o.status='cancelled' then raise exception 'ORDER_LOCKED'; end if;
  if o.payment_status='paid' then return jsonb_build_object('confirmed',true); end if;
  if o.payment_status<>'review' or not exists(select 1 from public.payment_receipts where order_id=p_order and validation_status='valid') then raise exception 'RECEIPT_REQUIRED'; end if;
  insert into public.cash_entries(cycle_id,order_id,kind,direction,amount_cents,description,created_by)
    values(o.cycle_id,o.id,'sale_receipt','in',o.total_cents,'Pix confirmado · '||o.reference,p_actor);
  update public.orders set payment_status='paid',status='confirmed' where id=o.id;
  update public.payment_receipts set reviewed_by=p_actor where order_id=o.id and validation_status='valid';
  insert into public.audit_events(actor_id,event,order_id) values(p_actor,'pix_confirmed',o.id);
  return jsonb_build_object('confirmed',true);
end $$;

create function public.set_order_status(p_actor uuid,p_order uuid,p_status text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare o public.orders%rowtype;
begin
  if not exists(select 1 from public.family_members where user_id=p_actor and active) then raise exception 'ACCESS_DENIED'; end if;
  select * into o from public.orders where id=p_order for update;
  if not found then raise exception 'ORDER_LOCKED'; end if;
  if o.status=p_status then return true; end if;
  if not (
    (p_status='cancelled' and o.status='received' and o.payment_status='pending') or
    (p_status='production' and o.status='confirmed' and o.payment_status='paid') or
    (p_status='delivered' and o.status in ('confirmed','production') and o.payment_status='paid') or
    (p_status='received' and o.status='received' and o.payment_status='review')
  ) then raise exception 'INVALID_TRANSITION'; end if;
  update public.orders set status=p_status where id=o.id;
  insert into public.audit_events(actor_id,event,order_id) values(p_actor,'order_'||p_status,o.id);
  return true;
end $$;

revoke execute on function public.checkout_limit(text),
 public.create_checkout_order(uuid,text,text,uuid,text,text,text,jsonb,integer,text,text,integer),
 public.reserve_receipt(uuid,text,text,integer), public.complete_receipt(uuid,uuid,text),
 public.manage_cycle(uuid,uuid,date,text), public.confirm_pix_payment(uuid,uuid),
 public.set_order_status(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.checkout_limit(text),
 public.create_checkout_order(uuid,text,text,uuid,text,text,text,jsonb,integer,text,text,integer),
 public.reserve_receipt(uuid,text,text,integer), public.complete_receipt(uuid,uuid,text),
 public.manage_cycle(uuid,uuid,date,text), public.confirm_pix_payment(uuid,uuid),
 public.set_order_status(uuid,uuid,text) to service_role;
