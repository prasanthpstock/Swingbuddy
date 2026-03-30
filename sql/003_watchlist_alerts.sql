create table if not exists watchlist_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  symbol text not null,
  signal_id uuid,
  strategy text,
  signal_type text not null,
  signal_date timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, symbol, signal_id)
);

create index if not exists idx_watchlist_alerts_user_id
  on watchlist_alerts(user_id);

create index if not exists idx_watchlist_alerts_user_created_at
  on watchlist_alerts(user_id, created_at desc);
