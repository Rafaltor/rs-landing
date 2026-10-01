-- Aura Dance lobby — appliqué sur le projet Supabase de lowtaper67.fr
-- Tables isolées aura_* (ne touche pas user_miis / votes / profiles)

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.aura_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'lobby' check (status in ('lobby', 'preview', 'playing', 'reveal', 'finished')),
  round int not null default 0 check (round >= 0),
  round_started_at timestamptz,
  host_token_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.aura_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.aura_rooms(id) on delete cascade,
  name text not null,
  secret_hash text not null,
  joined_at timestamptz not null default now()
);

create table if not exists public.aura_scores (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.aura_rooms(id) on delete cascade,
  player_id uuid not null references public.aura_players(id) on delete cascade,
  round int not null,
  aura int not null,
  prec int not null,
  created_at timestamptz not null default now(),
  unique (room_id, player_id, round)
);

create table if not exists public.aura_move_samples (
  slug text primary key,
  samples jsonb not null,
  updated_at timestamptz not null default now()
);
