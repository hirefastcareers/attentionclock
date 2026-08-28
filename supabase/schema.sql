create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  banner_color text not null default '#111111',
  duration_seconds integer not null default 60,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('pending', 'active', 'expired')),
  payment_id text unique,
  created_at timestamptz not null default now()
);

create index if not exists ads_window_idx on public.ads (starts_at, ends_at);
create index if not exists ads_ends_at_idx on public.ads (ends_at desc);

alter table public.ads
  add column if not exists duration_seconds integer not null default 60;

alter table public.ads enable row level security;

drop policy if exists "Anyone can read ads" on public.ads;
create policy "Anyone can read ads"
  on public.ads
  for select
  to anon, authenticated
  using (true);

grant select on table public.ads to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.ads;
exception
  when duplicate_object then null;
end $$;
