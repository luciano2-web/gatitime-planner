create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  timezone text not null default 'UTC',
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

alter table public.push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger trg_push_subscriptions_updated
  before update on public.push_subscriptions
  for each row execute function public.update_updated_at_column();

create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

create table if not exists public.push_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null,
  kind text not null,
  day_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, class_id, kind, day_key)
);

grant select on public.push_log to authenticated;
grant all on public.push_log to service_role;

alter table public.push_log enable row level security;

create policy "Users can view their own push log"
  on public.push_log for select
  to authenticated
  using (auth.uid() = user_id);