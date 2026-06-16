-- Projet Supabase : portail-recrutestagiaire (jdzjquxslokedstzigwn)
-- Même auth Google que https://portail.recrutestagiaire.eu

create table if not exists public.user_miis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pitch double precision not null default -10,
  yaw double precision not null default 0,
  config jsonb not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_miis_one_per_user unique (user_id)
);

create index if not exists user_miis_user_id_idx on public.user_miis (user_id);
create index if not exists user_miis_created_at_idx on public.user_miis (created_at);

create or replace function public.set_user_miis_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_miis_updated_at on public.user_miis;
create trigger user_miis_updated_at
  before update on public.user_miis
  for each row execute function public.set_user_miis_updated_at();

alter table public.user_miis enable row level security;

drop policy if exists "Salon public read miis" on public.user_miis;
create policy "Salon public read miis"
  on public.user_miis for select
  using (true);

drop policy if exists "Users insert own miis" on public.user_miis;
create policy "Users insert own miis"
  on public.user_miis for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own miis" on public.user_miis;
create policy "Users update own miis"
  on public.user_miis for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own miis" on public.user_miis;
create policy "Users delete own miis"
  on public.user_miis for delete
  using (auth.uid() = user_id);

comment on table public.user_miis is
  'Avatar Corporate Mii (landing 360°). Un seul par compte auth (portail + landing).';
