create table if not exists watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  symbol text not null,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create index if not exists idx_watchlist_user_id on watchlist(user_id);
create index if not exists idx_watchlist_user_symbol on watchlist(user_id, symbol);
