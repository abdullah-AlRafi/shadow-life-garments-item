-- Shadow Life Garments Item
-- Database Schema

-- =========================
-- 1. Categories
-- =========================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  created_at timestamptz not null default now()
);

-- =========================
-- 2. Products
-- =========================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  category_id uuid references public.categories(id) on delete set null,
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- 3. Orders
-- =========================

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  address text not null,
  total_amount numeric(10,2) not null check (total_amount >= 0),
  status text not null default 'pending'
    check (status in (
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled'
    )),
  created_at timestamptz not null default now()
);

-- =========================
-- 4. Order Items
-- =========================

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null
    references public.orders(id) on delete cascade,
  product_id uuid
    references public.products(id) on delete set null,
  quantity integer not null check (quantity > 0),
  price numeric(10,2) not null check (price >= 0),
  created_at timestamptz not null default now()
);

-- =========================
-- 5. Enable Row Level Security
-- =========================

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- =========================
-- 6. Public Read Policies
-- =========================

create policy "Anyone can view categories"
on public.categories
for select
to anon, authenticated
using (true);

create policy "Anyone can view products"
on public.products
for select
to anon, authenticated
using (true);

-- =========================
-- 7. Initial Categories
-- =========================

insert into public.categories (name)
values
  ('T-Shirts'),
  ('Shirts'),
  ('Pants');

-- =========================
-- 8. Initial Product
-- =========================

insert into public.products
(name, description, price, category_id, stock)
values (
  'Classic Black T-Shirt',
  'Comfortable black cotton T-shirt.',
  650,
  (
    select id
    from public.categories
    where name = 'T-Shirts'
  ),
  20
);