-- ============================================================
-- 0001_init.sql  –  play-money prediction market bootstrap
-- ============================================================

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------

create table public.users (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text,
  crowns      numeric     not null default 1000,
  consented   boolean     not null default false,
  created_at  timestamptz not null default now()
);

create table public.markets (
  id               uuid        primary key default gen_random_uuid(),
  question         text        not null,
  description      text,
  closes_at        timestamptz,
  b                numeric     not null default 50,
  q_yes            numeric     not null default 0,
  q_no             numeric     not null default 0,
  status           text        not null default 'open'
                               check (status in ('open', 'closed', 'resolved')),
  resolution       text        check (resolution in ('yes', 'no')),
  resolved_by      uuid        references public.users(id),
  resolved_at      timestamptz,
  resolution_basis text,
  created_by       uuid        references public.users(id),
  created_at       timestamptz not null default now()
);

create table public.trades (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users(id),
  market_id    uuid        not null references public.markets(id),
  side         text        not null check (side in ('yes', 'no')),
  shares       numeric     not null,
  cost         numeric     not null,
  price_before numeric     not null,
  price_after  numeric     not null,
  created_at   timestamptz not null default now()
);

create table public.positions (
  id         uuid    primary key default gen_random_uuid(),
  user_id    uuid    not null references public.users(id),
  market_id  uuid    not null references public.markets(id),
  yes_shares numeric not null default 0,
  no_shares  numeric not null default 0,
  unique (user_id, market_id)
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

create index on public.trades (market_id);
create index on public.trades (user_id);
create index on public.positions (user_id);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.users     enable row level security;
alter table public.markets   enable row level security;
alter table public.trades    enable row level security;
alter table public.positions enable row level security;

-- ------------------------------------------------------------
-- POLICIES  –  SELECT (authenticated users can read everything)
-- ------------------------------------------------------------

create policy "authenticated users can read users"
  on public.users for select
  to authenticated
  using (true);

create policy "authenticated users can read markets"
  on public.markets for select
  to authenticated
  using (true);

create policy "authenticated users can read trades"
  on public.trades for select
  to authenticated
  using (true);

create policy "authenticated users can read positions"
  on public.positions for select
  to authenticated
  using (true);

-- ------------------------------------------------------------
-- POLICIES  –  INSERT
-- users: each user may only insert their own row
-- markets: any authenticated user may create a market
-- trades / positions / crowns: locked down – written by SECURITY DEFINER function only
-- ------------------------------------------------------------

create policy "users can insert own row"
  on public.users for insert
  to authenticated
  with check (id = auth.uid());

create policy "authenticated users can create markets"
  on public.markets for insert
  to authenticated
  with check (true);
