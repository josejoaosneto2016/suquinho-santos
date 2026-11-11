-- Primeira etapa: catálogo, pedidos/caixa privados e leitura pelo painel.
-- Aplicar somente no projeto separado Suquinhos Santos após conferir o destino.
begin;

create table public.family_members (
  user_id uuid primary key references auth.users(id),
  display_name text not null check (char_length(display_name) between 1 and 100),
  role text not null check (role in ('owner', 'operator')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.products (
  id text primary key,
  name text not null,
  price_cents integer not null check (price_cents between 1 and 1000000),
  active boolean not null default true
);
create table public.delivery_cycles (
  id uuid primary key default gen_random_uuid(),
  delivery_date date not null unique,
  closes_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'completed')),
  check ((closes_at at time zone 'America/Sao_Paulo')::date < delivery_date)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  cycle_id uuid not null references public.delivery_cycles(id),
  customer_name text not null check (char_length(customer_name) between 1 and 100),
  customer_phone text not null check (char_length(customer_phone) between 10 and 20),
  status text not null default 'received' check (status in ('received', 'confirmed', 'production', 'delivered', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'review', 'paid', 'divergent', 'refunded')),
  total_cents integer not null check (total_cents between 1 and 100000000),
  created_at timestamptz not null default now()
);
create index orders_cycle_status_idx on public.orders(cycle_id, status);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  product_id text not null references public.products(id),
  product_name text not null,
  quantity integer not null check (quantity between 1 and 99),
  unit_price_cents integer not null check (unit_price_cents between 1 and 1000000),
  unique(order_id, product_id)
);
create index order_items_order_idx on public.order_items(order_id);
create table public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references public.delivery_cycles(id),
  order_id uuid references public.orders(id),
  kind text not null check (kind in ('sale_receipt', 'expense', 'refund', 'contribution', 'withdrawal', 'reversal')),
  direction text not null check (direction in ('in', 'out')),
  amount_cents integer not null check (amount_cents between 1 and 100000000),
  description text not null check (char_length(description) between 1 and 300),
  occurred_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  reversal_of uuid unique references public.cash_entries(id),
  check ((kind in ('sale_receipt', 'contribution') and direction = 'in') or
         (kind in ('expense', 'refund', 'withdrawal') and direction = 'out') or kind = 'reversal'),
  check ((kind = 'reversal') = (reversal_of is not null)),
  check (kind not in ('sale_receipt', 'refund') or order_id is not null)
);
create unique index cash_one_receipt_per_order_idx on public.cash_entries(order_id) where kind = 'sale_receipt';
create index cash_cycle_date_idx on public.cash_entries(cycle_id, occurred_at);
create table public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'application/pdf')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  validation_status text not null default 'pending' check (validation_status in ('pending', 'valid', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id)
);
create index receipts_order_idx on public.payment_receipts(order_id);

alter table public.family_members enable row level security;
alter table public.products enable row level security;
alter table public.delivery_cycles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.cash_entries enable row level security;
alter table public.payment_receipts enable row level security;

-- Remover privilégios automáticos, inclusive se o projeto foi criado com exposição automática.
revoke all on public.family_members, public.products, public.delivery_cycles,
  public.orders, public.order_items, public.cash_entries, public.payment_receipts
  from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.products to anon;
grant select on public.family_members, public.products, public.delivery_cycles,
  public.orders, public.order_items, public.cash_entries, public.payment_receipts to authenticated;

create policy own_active_membership on public.family_members for select to authenticated
  using (user_id = (select auth.uid()) and active);
create policy public_active_products on public.products for select to anon using (active);
create policy family_products on public.products for select to authenticated
  using (active or exists (select 1 from public.family_members where user_id = (select auth.uid()) and active));
create policy family_cycles on public.delivery_cycles for select to authenticated
  using (exists (select 1 from public.family_members where user_id = (select auth.uid()) and active));
create policy family_orders on public.orders for select to authenticated
  using (exists (select 1 from public.family_members where user_id = (select auth.uid()) and active));
create policy family_items on public.order_items for select to authenticated
  using (exists (select 1 from public.family_members where user_id = (select auth.uid()) and active));
create policy family_cash on public.cash_entries for select to authenticated
  using (exists (select 1 from public.family_members where user_id = (select auth.uid()) and active));
create policy family_receipts on public.payment_receipts for select to authenticated
  using (exists (select 1 from public.family_members where user_id = (select auth.uid()) and active));

insert into public.products(id, name, price_cents) values
  ('laranja', 'Laranja', 1200),
  ('laranja-acerola', 'Laranja com acerola', 1200),
  ('acerola', 'Acerola', 1200);

-- Sem políticas de leitura/upload: o bucket permanece inacessível ao público.
-- Os endpoints de comprovante serão implementados em uma próxima migração.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('pix-receipts', 'pix-receipts', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf']);
commit;
