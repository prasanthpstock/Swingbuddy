create extension if not exists "pgcrypto";

create table if not exists broker_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  broker_name text not null,
  account_label text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  status text not null default 'active',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, broker_name)
);

create table if not exists holdings_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  broker_connection_id uuid references broker_connections(id),
  symbol text not null,
  exchange text,
  quantity numeric(18,4),
  avg_price numeric(18,4),
  ltp numeric(18,4),
  market_value numeric(18,4),
  pnl numeric(18,4),
  snapshot_at timestamptz not null default now()
);

create table if not exists signals (
  id uuid primary key,
  user_id uuid not null,
  symbol text not null,
  strategy_name text not null,
  timeframe text not null default '1d',
  signal_date date not null,
  entry_price numeric(18,4),
  stop_loss numeric(18,4),
  target_price numeric(18,4),
  risk_reward numeric(10,2),
  score numeric(10,2),
  status text not null default 'new',
  reason_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  alert_type text not null,
  symbol text,
  message text not null,
  channel text not null default 'telegram',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists job_runs (
  id uuid primary key,
  job_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  summary text,
  error_text text
);
