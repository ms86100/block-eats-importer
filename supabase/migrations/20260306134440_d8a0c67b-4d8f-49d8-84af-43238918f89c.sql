-- Batch 1/?: Core schema (auth + societies + marketplace)

-- Extensions
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('buyer','seller','admin','security_officer');
  end if;
  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type public.verification_status as enum ('pending','approved','rejected','suspended');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'placed','accepted','preparing','ready','picked_up','delivered','completed','cancelled',
      'enquired','quoted','scheduled','in_progress','returned'
    );
  end if;
end $$;

-- Updated-at trigger helper
create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Societies (created before profiles; add admin_user_id FK after profiles exist)
create table if not exists public.societies (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  address text,
  city text,
  state text,
  pincode text,
  latitude numeric,
  longitude numeric,
  geofence_radius_meters integer default 500,
  is_verified boolean default false,
  is_active boolean default true,
  admin_user_id uuid,
  member_count integer default 0,
  logo_url text,
  rules_text text,
  invite_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.societies enable row level security;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null,
  name text not null,
  flat_number text not null,
  block text not null,
  phase text,
  email text,
  avatar_url text,
  society_id uuid references public.societies(id) on delete set null,
  verification_status public.verification_status default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Add FK from societies.admin_user_id -> profiles.id now that profiles exists
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'societies_admin_user_id_fkey'
      and table_name = 'societies'
  ) then
    alter table public.societies
      add constraint societies_admin_user_id_fkey
      foreign key (admin_user_id) references public.profiles(id) on delete set null;
  end if;
end $$;

-- User roles (separate table)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  role public.user_role not null default 'buyer',
  created_at timestamptz default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer role helpers
create or replace function public.has_role(_user_id uuid, _role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'admin')
$$;

create or replace function public.get_user_society_id(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select society_id from public.profiles where id = _user_id limit 1
$$;

-- RLS: societies
drop policy if exists "Anyone can view active societies" on public.societies;
create policy "Anyone can view active societies"
on public.societies
for select
using (is_active = true or public.is_admin(auth.uid()));

drop policy if exists "Admins can manage societies" on public.societies;
create policy "Admins can manage societies"
on public.societies
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Users can request societies" on public.societies;
create policy "Users can request societies"
on public.societies
for insert
with check (auth.uid() is not null);

-- RLS: profiles
drop policy if exists "Users can view all approved profiles" on public.profiles;
create policy "Users can view all approved profiles"
on public.profiles
for select
using (verification_status = 'approved' or id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
using (id = auth.uid() or public.is_admin(auth.uid()));

-- RLS: user_roles
drop policy if exists "Users can view their own roles" on public.user_roles;
create policy "Users can view their own roles"
on public.user_roles
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "Only admins can manage roles" on public.user_roles;
create policy "Only admins can manage roles"
on public.user_roles
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Users can insert default buyer role" on public.user_roles;
create policy "Users can insert default buyer role"
on public.user_roles
for insert
with check (user_id = auth.uid() and role = 'buyer');

-- Seller profiles
create table if not exists public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  society_id uuid references public.societies(id) on delete set null,
  business_name text not null,
  description text,
  categories text[] not null default '{}',
  primary_group text,
  cover_image_url text,
  profile_image_url text,
  is_available boolean default true,
  availability_start time,
  availability_end time,
  operating_days text[] default array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  accepts_cod boolean default true,
  accepts_upi boolean default false,
  upi_id text,
  fssai_number text,
  is_featured boolean default false,
  verification_status public.verification_status default 'pending',
  rating numeric(3,2) default 0,
  total_reviews integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint seller_profiles_user_group_key unique (user_id, primary_group)
);

alter table public.seller_profiles enable row level security;

drop policy if exists "Anyone can view approved sellers" on public.seller_profiles;
create policy "Anyone can view approved sellers"
on public.seller_profiles
for select
using (
  verification_status = 'approved'
  and (society_id is null or society_id = public.get_user_society_id(auth.uid()))
  or user_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "Authenticated users can apply to be sellers" on public.seller_profiles;
create policy "Authenticated users can apply to be sellers"
on public.seller_profiles
for insert
with check (user_id = auth.uid());

drop policy if exists "Sellers can update their own profile" on public.seller_profiles;
create policy "Sellers can update their own profile"
on public.seller_profiles
for update
using (user_id = auth.uid() or public.is_admin(auth.uid()));

create trigger update_seller_profiles_updated_at
before update on public.seller_profiles
for each row execute function public.update_updated_at();

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.seller_profiles(id) on delete cascade not null,
  society_id uuid references public.societies(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  category text not null,
  is_veg boolean default true,
  is_available boolean default true,
  is_bestseller boolean default false,
  is_recommended boolean default false,
  is_urgent boolean default false,
  approval_status text not null default 'pending',
  stock_quantity integer,
  specifications jsonb,
  listing_type text default 'product',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.products enable row level security;

drop policy if exists "Anyone can view available products from approved sellers" on public.products;
create policy "Anyone can view available products from approved sellers"
on public.products
for select
using (
  (
    exists (
      select 1 from public.seller_profiles sp
      where sp.id = products.seller_id
        and sp.verification_status = 'approved'
        and (sp.society_id is null or sp.society_id = public.get_user_society_id(auth.uid()))
    )
    and products.approval_status = 'approved'
  )
  or exists (
    select 1 from public.seller_profiles sp
    where sp.id = products.seller_id and sp.user_id = auth.uid()
  )
  or public.is_admin(auth.uid())
);

drop policy if exists "Sellers can manage their own products" on public.products;
create policy "Sellers can manage their own products"
on public.products
for insert
with check (
  exists (
    select 1 from public.seller_profiles sp
    where sp.id = products.seller_id and sp.user_id = auth.uid()
  )
);

drop policy if exists "Sellers can update their own products" on public.products;
create policy "Sellers can update their own products"
on public.products
for update
using (
  exists (
    select 1 from public.seller_profiles sp
    where sp.id = products.seller_id and sp.user_id = auth.uid()
  )
  or public.is_admin(auth.uid())
);

drop policy if exists "Sellers can delete their own products" on public.products;
create policy "Sellers can delete their own products"
on public.products
for delete
using (
  exists (
    select 1 from public.seller_profiles sp
    where sp.id = products.seller_id and sp.user_id = auth.uid()
  )
  or public.is_admin(auth.uid())
);

create trigger update_products_updated_at
before update on public.products
for each row execute function public.update_updated_at();

-- Orders + order items
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.profiles(id) on delete set null,
  seller_id uuid references public.seller_profiles(id) on delete set null,
  society_id uuid references public.societies(id) on delete set null,
  status public.order_status default 'placed',
  total_amount numeric(10,2) not null,
  payment_type text default 'cod',
  payment_status text default 'pending',
  delivery_address text,
  notes text,
  rejection_reason text,
  auto_cancel_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.order_items enable row level security;

-- Orders policies
drop policy if exists "Users can view their own orders" on public.orders;
create policy "Users can view their own orders"
on public.orders
for select
using (
  buyer_id = auth.uid()
  or exists (
    select 1 from public.seller_profiles sp
    where sp.id = orders.seller_id and sp.user_id = auth.uid()
  )
  or public.is_admin(auth.uid())
);

drop policy if exists "Authenticated users can create orders" on public.orders;
create policy "Authenticated users can create orders"
on public.orders
for insert
with check (buyer_id = auth.uid());

drop policy if exists "Buyers and sellers can update orders" on public.orders;
create policy "Buyers and sellers can update orders"
on public.orders
for update
using (
  buyer_id = auth.uid()
  or exists (
    select 1 from public.seller_profiles sp
    where sp.id = orders.seller_id and sp.user_id = auth.uid()
  )
  or public.is_admin(auth.uid())
);

create trigger update_orders_updated_at
before update on public.orders
for each row execute function public.update_updated_at();

-- Order items policies
drop policy if exists "Users can view order items for their orders" on public.order_items;
create policy "Users can view order items for their orders"
on public.order_items
for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (
        o.buyer_id = auth.uid()
        or exists (
          select 1 from public.seller_profiles sp
          where sp.id = o.seller_id and sp.user_id = auth.uid()
        )
      )
  )
  or public.is_admin(auth.uid())
);

drop policy if exists "Users can insert order items for their orders" on public.order_items;
create policy "Users can insert order items for their orders"
on public.order_items
for insert
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.buyer_id = auth.uid()
  )
);

create trigger update_order_items_updated_at
before update on public.order_items
for each row execute function public.update_updated_at();

-- Reviews (minimal)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null unique,
  buyer_id uuid references public.profiles(id) on delete set null,
  seller_id uuid references public.seller_profiles(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  is_hidden boolean default false,
  hidden_reason text,
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Users can view reviews in their society" on public.reviews;
create policy "Users can view reviews in their society"
on public.reviews
for select
using (
  buyer_id = auth.uid()
  or public.is_admin(auth.uid())
  or (
    is_hidden = false and exists (
      select 1 from public.seller_profiles sp
      where sp.id = reviews.seller_id and (sp.society_id is null or sp.society_id = public.get_user_society_id(auth.uid()))
    )
  )
);

drop policy if exists "Buyers can create reviews for completed orders" on public.reviews;
create policy "Buyers can create reviews for completed orders"
on public.reviews
for insert
with check (
  buyer_id = auth.uid()
  and exists (
    select 1 from public.orders o
    where o.id = reviews.order_id and o.buyer_id = auth.uid() and o.status = 'completed'
  )
);

-- Seller rating trigger
create or replace function public.update_seller_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.seller_profiles
  set
    rating = (select coalesce(avg(rating), 0) from public.reviews where seller_id = new.seller_id and is_hidden = false),
    total_reviews = (select count(*) from public.reviews where seller_id = new.seller_id and is_hidden = false)
  where id = new.seller_id;
  return new;
end;
$$;

drop trigger if exists update_rating_on_review on public.reviews;
create trigger update_rating_on_review
after insert or update on public.reviews
for each row execute function public.update_seller_rating();

-- Cart
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity integer not null default 1,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

alter table public.cart_items enable row level security;

drop policy if exists "Users can view their own cart" on public.cart_items;
create policy "Users can view their own cart"
on public.cart_items for select
using (user_id = auth.uid());

drop policy if exists "Users can manage their own cart" on public.cart_items;
create policy "Users can manage their own cart"
on public.cart_items for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update their own cart" on public.cart_items;
create policy "Users can update their own cart"
on public.cart_items for update
using (user_id = auth.uid());

drop policy if exists "Users can delete from their own cart" on public.cart_items;
create policy "Users can delete from their own cart"
on public.cart_items for delete
using (user_id = auth.uid());

-- Featured items + favorites (homepage)
create table if not exists public.featured_items (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('seller','category','banner')),
  reference_id text not null,
  title text,
  image_url text,
  link_url text,
  display_order integer default 0,
  is_active boolean default true,
  society_id uuid references public.societies(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.featured_items enable row level security;

drop policy if exists "Anyone can view active featured items in their society" on public.featured_items;
create policy "Anyone can view active featured items in their society"
on public.featured_items for select to authenticated
using (
  (is_active = true and (society_id is null or society_id = public.get_user_society_id(auth.uid())))
  or public.is_admin(auth.uid())
);

drop policy if exists "Only admins can manage featured items" on public.featured_items;
create policy "Only admins can manage featured items"
on public.featured_items for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create trigger update_featured_items_updated_at
before update on public.featured_items
for each row execute function public.update_updated_at();

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  seller_id uuid references public.seller_profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, seller_id)
);

alter table public.favorites enable row level security;

drop policy if exists "Users can view their own favorites" on public.favorites;
create policy "Users can view their own favorites"
on public.favorites for select
using (user_id = auth.uid());

drop policy if exists "Users can add favorites" on public.favorites;
create policy "Users can add favorites"
on public.favorites for insert
with check (user_id = auth.uid());

drop policy if exists "Users can remove favorites" on public.favorites;
create policy "Users can remove favorites"
on public.favorites for delete
using (user_id = auth.uid());

-- Chat + payments (minimal)
create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  buyer_id uuid not null,
  seller_id uuid references public.seller_profiles(id) on delete set null,
  amount numeric(10,2) not null,
  payment_method text not null default 'cod',
  payment_status text not null default 'pending',
  transaction_reference text,
  platform_fee numeric(10,2) default 0,
  net_amount numeric(10,2),
  idempotency_key text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.payment_records enable row level security;

drop policy if exists "Users can view their own payment records" on public.payment_records;
create policy "Users can view their own payment records"
on public.payment_records for select
using (
  buyer_id = auth.uid()
  or exists (select 1 from public.seller_profiles sp where sp.id = payment_records.seller_id and sp.user_id = auth.uid())
  or public.is_admin(auth.uid())
);

drop policy if exists "System can create payment records" on public.payment_records;
create policy "System can create payment records"
on public.payment_records for insert
with check (buyer_id = auth.uid());

drop policy if exists "System can update payment records" on public.payment_records;
create policy "System can update payment records"
on public.payment_records for update
using (buyer_id = auth.uid() or public.is_admin(auth.uid()));

create trigger update_payment_records_updated_at
before update on public.payment_records
for each row execute function public.update_updated_at();

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  sender_id uuid not null,
  receiver_id uuid not null,
  message_text text not null,
  read_status boolean default false,
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;

drop policy if exists "Users can view their own chat messages" on public.chat_messages;
create policy "Users can view their own chat messages"
on public.chat_messages for select
using (sender_id = auth.uid() or receiver_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "Users can send chat messages" on public.chat_messages;
create policy "Users can send chat messages"
on public.chat_messages for insert
with check (sender_id = auth.uid());

drop policy if exists "Users can mark messages as read" on public.chat_messages;
create policy "Users can mark messages as read"
on public.chat_messages for update
using (receiver_id = auth.uid());

-- Seeds (minimal: one default society to prevent empty UI)
insert into public.societies (id, name, slug, address, city, state, pincode, is_verified, is_active)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Shriram Greenfield',
  'shriram-greenfield',
  'Shriram Greenfield, Budigere Cross',
  'Bangalore',
  'Karnataka',
  '560049',
  true,
  true
)
on conflict (id) do nothing;

create index if not exists idx_profiles_society_id on public.profiles(society_id);
create index if not exists idx_seller_profiles_society_id on public.seller_profiles(society_id);
create index if not exists idx_orders_buyer_id on public.orders(buyer_id);
create index if not exists idx_orders_seller_id on public.orders(seller_id);
create index if not exists idx_orders_status on public.orders(status);

create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at();

create trigger update_societies_updated_at
before update on public.societies
for each row execute function public.update_updated_at();
